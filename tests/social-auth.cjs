// Sign in with Apple / Google through the real routes and storage on PGlite.
// Provider keys are replaced by a local key pair; everything else is production code.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { generateKeyPair, exportJWK, SignJWT } = require('jose');

const root = path.resolve(__dirname, '..');
const out = path.join(root, '.social-auth-test.cjs');
const GOOGLE_CLIENT = 'test-web-client.apps.googleusercontent.com';
const APPLE_CLIENT = 'app.replit.forsa';

(async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };

  await require('esbuild').build({
    stdin: {
      contents: `export {storage} from './server/storage'; export {registerRoutes} from './server/routes'; export {engine} from 'test-db';`,
      resolveDir: root,
    },
    bundle: true, platform: 'node', format: 'cjs', packages: 'external', outfile: out,
    plugins: [{ name: 'isolate-services', setup(b) {
      b.onResolve({ filter: /^(test-db|\.\/db|connect-pg-simple|\.\/firebase|\.\/apns|\.\/social-jwks)$/ }, (a) => ({ path: ['test-db', './db'].includes(a.path) ? 'test-db' : a.path, namespace: 'test' }));
      b.onLoad({ filter: /.*/, namespace: 'test' }, (a) => {
        let contents;
        if (a.path === 'connect-pg-simple') contents = `import session from 'express-session'; export default () => session.MemoryStore;`;
        else if (a.path === './firebase') contents = `export const sendFcmNotification=async()=>{};export const sendFcmToUser=async()=>{};`;
        else if (a.path === './apns') contents = `export const isApnsConfigured=()=>false;export const sendApnsNotifications=async()=>({});`;
        else if (a.path === './social-jwks') contents = `import {createLocalJWKSet} from 'jose'; const set=createLocalJWKSet({keys:[${JSON.stringify(jwk)}]}); export const socialKeySets={apple:set,google:set};`;
        else contents = `import {PGlite} from '@electric-sql/pglite'; import {drizzle} from 'drizzle-orm/pglite';export const engine=new PGlite();export const db=drizzle(engine);export const pool={};`;
        return { contents, loader: 'js', resolveDir: root };
      });
    } }],
  });

  process.env.NODE_ENV = 'test';
  process.env.GOOGLE_CLIENT_IDS = `${GOOGLE_CLIENT}, other-client.apps.googleusercontent.com`;
  delete process.env.APPLE_SIGNIN_KEY;
  delete process.env.RESEND_API_KEY;
  const { storage: s, engine, registerRoutes } = require(out);

  const sign = (claims, { iss, aud, exp = '10m', key = privateKey } = {}) =>
    new SignJWT(claims).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setIssuedAt()
      .setIssuer(iss).setAudience(aud).setExpirationTime(exp).sign(key);
  const googleToken = (sub, claims = {}, opts = {}) =>
    sign({ sub, email_verified: true, ...claims }, { iss: 'https://accounts.google.com', aud: GOOGLE_CLIENT, ...opts });
  const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
  const appleToken = (sub, rawNonce, claims = {}, opts = {}) =>
    sign({ sub, nonce: sha(rawNonce), ...claims }, { iss: 'https://appleid.apple.com', aud: APPLE_CLIENT, ...opts });

  try {
    await engine.exec(fs.readFileSync(path.join(root, 'scripts/sql/nayvo-schema.sql'), 'utf8'));
    await engine.exec(fs.readFileSync(path.join(root, 'scripts/sql/launch-hardening.sql'), 'utf8'));
    await engine.exec(fs.readFileSync(path.join(root, 'scripts/sql/launch-hardening.sql'), 'utf8'));
    const bcrypt = require('bcryptjs');
    const password = await bcrypt.hash('test-password', 4);
    await engine.query(`INSERT INTO users(id,username,email,password,role,email_verified) VALUES
      ('admin','boss','Boss@Example.com',$1,'admin',true),
      ('buyer','buyer','Buyer@Example.com',$1,'user',false)`, [password]);

    const express = require('express');
    const app = express(); app.use(express.json());
    const server = await registerRoutes(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const social = (body) => fetch(base + '/api/auth/social', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

    let passed = 0;
    const test = async (name, fn) => { await fn(); console.log('PASS', name); passed++; };

    try {
      let googleUserId;
      await test('first Google sign-in creates a verified account and a session', async () => {
        const res = await social({ provider: 'google', idToken: await googleToken('g-1', { email: 'New.Person@gmail.com', name: 'سامر أحمد' }) });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.isNewUser, true); assert.equal(body.email, 'new.person@gmail.com');
        assert.equal(body.emailVerified, true); assert.equal(body.fullName, 'سامر أحمد');
        assert.match(body.username, /^newperson/);
        googleUserId = body.id;
        const cookie = res.headers.get('set-cookie').split(';')[0];
        const me = await fetch(base + '/api/auth/me', { headers: { cookie } });
        assert.equal(me.status, 200); assert.equal((await me.json()).id, googleUserId);
      });

      await test('the same Google account signs into the same user', async () => {
        const res = await social({ provider: 'google', idToken: await googleToken('g-1', { email: 'new.person@gmail.com' }) });
        const body = await res.json();
        assert.equal(res.status, 200); assert.equal(body.id, googleUserId); assert.equal(body.isNewUser, false);
      });

      await test('Apple sign-in with a verified email links the existing account', async () => {
        const res = await social({ provider: 'apple', nonce: 'raw-nonce-1', authorizationCode: 'code', fullName: 'Buyer Name',
          idToken: await appleToken('a-1', 'raw-nonce-1', { email: 'BUYER@example.com', email_verified: 'true' }) });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.id, 'buyer'); assert.equal(body.isNewUser, false); assert.equal(body.emailVerified, true);
        assert.equal((await s.getIdentity('apple', 'a-1')).userId, 'buyer');
      });

      await test('Apple rejects a missing or mismatched nonce', async () => {
        const token = await appleToken('a-2', 'right-nonce', { email: 'x@privaterelay.appleid.com', email_verified: true });
        assert.equal((await social({ provider: 'apple', idToken: token })).status, 401);
        assert.equal((await social({ provider: 'apple', idToken: token, nonce: 'wrong-nonce' })).status, 401);
        assert.equal(await s.getIdentity('apple', 'a-2'), undefined);
      });

      await test('tokens with the wrong audience, issuer, expiry or key are refused', async () => {
        const { privateKey: stranger } = await generateKeyPair('RS256');
        const bad = [
          await googleToken('g-9', { email: 'a@gmail.com' }, { aud: 'someone-else.apps.googleusercontent.com' }),
          await googleToken('g-9', { email: 'a@gmail.com' }, { iss: 'https://evil.example' }),
          await googleToken('g-9', { email: 'a@gmail.com' }, { exp: Math.floor(Date.now() / 1000) - 3600 }),
          await googleToken('g-9', { email: 'a@gmail.com' }, { key: stranger }),
          await appleToken('g-9', 'n', {}, { aud: GOOGLE_CLIENT }),
        ];
        for (const idToken of bad) {
          const provider = idToken === bad[4] ? 'apple' : 'google';
          const res = await social({ provider, idToken, nonce: 'n' });
          assert.equal(res.status, 401);
        }
        assert.equal(await s.getIdentity('google', 'g-9'), undefined);
        assert.equal((await social({ provider: 'google', idToken: 'x'.repeat(10) })).status, 400);
      });

      await test('an admin email is never linked through social sign-in', async () => {
        const res = await social({ provider: 'google', idToken: await googleToken('g-admin', { email: 'boss@example.com' }) });
        assert.equal(res.status, 403);
        assert.equal(await s.getIdentity('google', 'g-admin'), undefined);
      });

      await test('an unverified email gets its own account instead of taking over one', async () => {
        const res = await social({ provider: 'google', idToken: await googleToken('g-2', { email: 'buyer@example.com', email_verified: false }) });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.notEqual(body.id, 'buyer'); assert.equal(body.isNewUser, true);
        assert.match(body.email, /@signin\.nayvo\.invalid$/);
      });

      await test('Apple with a hidden email and no name still gets a usable account', async () => {
        const res = await social({ provider: 'apple', nonce: 'n3', idToken: await appleToken('a-3', 'n3') });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.isNewUser, true); assert.match(body.username, /^user\d+$/);
      });

      await test('suspended accounts cannot sign in socially', async () => {
        await engine.query(`UPDATE users SET is_suspended=true WHERE id=$1`, [googleUserId]);
        const res = await social({ provider: 'google', idToken: await googleToken('g-1', { email: 'new.person@gmail.com' }) });
        assert.equal(res.status, 403);
        await engine.query(`UPDATE users SET is_suspended=false WHERE id=$1`, [googleUserId]);
      });

      await test('deleting the account removes its linked identities', async () => {
        const res = await social({ provider: 'google', idToken: await googleToken('g-1', { email: 'new.person@gmail.com' }) });
        const cookie = res.headers.get('set-cookie').split(';')[0];
        const del = await fetch(base + '/api/auth/delete-account', { method: 'DELETE', headers: { cookie } });
        assert.equal(del.status, 200);
        assert.equal(await s.getIdentity('google', 'g-1'), undefined);
        assert.equal(await s.getUser(googleUserId), undefined);
      });

      await test('password login still works for linked accounts', async () => {
        const res = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'buyer', password: 'test-password' }) });
        assert.equal(res.status, 200);
      });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
    console.log(`${passed} social sign-in checks passed`);
  } finally {
    await engine.close();
  }
})().finally(() => { if (fs.existsSync(out)) fs.unlinkSync(out); }).catch((e) => { console.error(e); process.exitCode = 1; });
