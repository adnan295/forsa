// Tracking links (/r/:slug): visits are counted, accounts opened from a link are
// attributed to it, and their confirmed orders count as its sales.
// Real storage + routes on PGlite; push services and provider keys are stubbed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { generateKeyPair, exportJWK, SignJWT } = require('jose');

const root = path.resolve(__dirname, '..');
const out = path.join(root, '.influencers-test.cjs');
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Instagram 350.0';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36';
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36';
const GOOGLE_CLIENT = 'test-web-client.apps.googleusercontent.com';

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
  process.env.GOOGLE_CLIENT_IDS = GOOGLE_CLIENT;
  delete process.env.RESEND_API_KEY;
  const { storage: s, engine, registerRoutes } = require(out);

  try {
    await engine.exec(fs.readFileSync(path.join(root, 'scripts/sql/nayvo-schema.sql'), 'utf8'));
    await engine.exec(fs.readFileSync(path.join(root, 'scripts/sql/launch-hardening.sql'), 'utf8'));
    await engine.exec(fs.readFileSync(path.join(root, 'scripts/sql/launch-hardening.sql'), 'utf8'));
    const bcrypt = require('bcryptjs');
    const password = await bcrypt.hash('test-password', 4);
    await engine.query(`INSERT INTO users(id,username,email,password,role,email_verified) VALUES
      ('admin','boss','boss@example.com',$1,'admin',true),
      ('organic','organic','organic@example.com',$1,'user',true)`, [password]);
    await engine.exec(`INSERT INTO products(id,name,price,stock) VALUES ('p','Test product',100,50);
      INSERT INTO payment_methods(id,name,name_ar,bank_name,account_name,iban) VALUES ('bank','Bank Transfer','تحويل بنكي','Test Bank','Owner','TEST-IBAN');
      INSERT INTO draws(id,title,prize_name,ticket_price,target_tickets,status) VALUES ('d','Round','Prize',10,1000,'active');`);

    const express = require('express');
    const app = express(); app.use(express.json());
    const server = await registerRoutes(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const json = (method, url, body, headers = {}) => fetch(base + url, { method, headers: { 'content-type': 'application/json', ...headers }, body: body && JSON.stringify(body) });
    const login = await json('POST', '/api/auth/login', { username: 'boss', password: 'test-password' });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const admin = (method, url, body) => json(method, url, body, { cookie });
    const visit = (slug, ua, method = 'GET') => fetch(`${base}/r/${slug}`, { method, redirect: 'manual', headers: { 'user-agent': ua } });
    const stats = async (query = '') => (await (await admin('GET', '/api/admin/influencers' + query)).json());
    const row = async (slug, query) => (await stats(query)).find((i) => i.slug === slug);
    const register = (name, extra = {}, headers = {}) =>
      json('POST', '/api/auth/register', { username: name, email: `${name}@example.com`, password: 'Password123!', ...extra }, headers);
    const userOf = async (res) => (await engine.query(`SELECT influencer_id, influencer_source FROM users WHERE id=$1`, [(await res.json()).id])).rows[0];
    const order = { items: [{ productId: 'p', quantity: 1 }], paymentMethod: 'bank', shippingFullName: 'Test', shippingPhone: '0933123456', shippingCity: 'دمشق', shippingAddress: 'Test', shippingCountry: 'سوريا' };

    let passed = 0;
    const test = async (name, fn) => { await fn(); console.log('PASS', name); passed++; };

    try {
      let reel;
      await test('admin creates a tracking link without any discount code', async () => {
        const res = await admin('POST', '/api/admin/influencers', { name: 'ريل الساعات', slug: 'Reel-Watch' });
        assert.equal(res.status, 200);
        reel = await res.json();
        assert.equal(reel.slug, 'reel-watch');
        assert.equal((await (await admin('GET', '/api/admin/coupons')).json()).length, 0);
        assert.equal((await admin('POST', '/api/admin/influencers', { name: 'سامر', slug: 'samer' })).status, 200);
      });

      await test('duplicate or non-Latin links are refused with a message; admins only', async () => {
        const dup = await admin('POST', '/api/admin/influencers', { name: 'x', slug: 'reel-watch' });
        assert.equal(dup.status, 409); assert.match((await dup.json()).message, /مستخدم/);
        const bad = await admin('POST', '/api/admin/influencers', { name: 'x', slug: 'ريل' });
        assert.equal(bad.status, 400); assert.match((await bad.json()).message, /الإنجليزية/);
        assert.equal((await fetch(base + '/api/admin/influencers')).status, 401);
      });

      await test('the link sends each device to its store and counts the visit', async () => {
        const ios = await visit('reel-watch', IPHONE);
        assert.equal(ios.status, 302);
        assert.equal(ios.headers.get('location'), 'https://apps.apple.com/app/id6759828874');
        assert.equal(ios.headers.get('cache-control'), 'no-store');
        const playUrl = new URL((await visit('REEL-WATCH', ANDROID)).headers.get('location'));
        assert.equal(playUrl.host, 'play.google.com');
        assert.equal(playUrl.searchParams.get('id'), 'today.forsa');
        const referrer = new URLSearchParams(playUrl.searchParams.get('referrer'));
        assert.equal(referrer.get('utm_source'), 'nayvo'); assert.equal(referrer.get('utm_campaign'), 'reel-watch');
        const web = await visit('reel-watch', DESKTOP);
        assert.equal(web.headers.get('location'), '/');
        assert.match(web.headers.get('set-cookie'), /^nayvo_ref=reel-watch;.*HttpOnly/);
      });

      await test('repeat visits count once per visitor; link previews and HEAD are ignored', async () => {
        await visit('reel-watch', IPHONE);
        await visit('reel-watch', 'WhatsApp/2.23.20.0 A');
        await visit('reel-watch', 'TelegramBot (like TwitterBot)');
        await visit('reel-watch', 'facebookexternalhit/1.1');
        await visit('reel-watch', IPHONE, 'HEAD');
        await visit('reel-watch', '');
        const r = await row('reel-watch');
        assert.equal(r.visits, 4); assert.equal(r.visitors, 3);
        assert.deepEqual(r.visitorsByPlatform, { ios: 1, android: 1, web: 1 });
        const { rows } = await engine.query(`SELECT visitor_hash, ip_hash, os_version, platform FROM influencer_visits`);
        assert.ok(rows.every((v) => /^[0-9a-f]{32}$/.test(v.visitor_hash) && /^[0-9a-f]{32}$/.test(v.ip_hash)));
        assert.equal(rows.find((v) => v.platform === 'ios').os_version, '18.0');
        assert.ok(!JSON.stringify(rows).includes('127.0.0.1'));
      });

      await test('unknown or paused links go to the store home without counting', async () => {
        assert.equal((await visit('nobody', IPHONE)).headers.get('location'), '/');
        const samer = (await stats()).find((i) => i.slug === 'samer');
        await admin('PATCH', `/api/admin/influencers/${samer.id}`, { enabled: false });
        const paused = await visit('samer', DESKTOP);
        assert.equal(paused.headers.get('location'), '/'); assert.equal(paused.headers.get('set-cookie'), null);
        assert.equal((await row('samer')).visits, 0);
      });

      const accounts = {};
      await test('a browser signup after opening the link is attributed to it', async () => {
        const res = await register('webbuyer', {}, { cookie: 'theme=dark; nayvo_ref=reel-watch' });
        assert.equal(res.status, 200);
        const u = await userOf(res.clone());
        assert.equal(u.influencer_id, reel.id); assert.equal(u.influencer_source, 'web');
        accounts.web = (await res.json()).id;
        const plain = await register('plainbuyer');
        assert.equal((await userOf(plain)).influencer_id, null);
      });

      await test('the app sends what Google Play or the iPhone match told it', async () => {
        const android = await register('androidbuyer', { ref: { slug: 'reel-watch', source: 'play' } });
        assert.deepEqual(await userOf(android.clone()), { influencer_id: reel.id, influencer_source: 'play' });
        accounts.android = (await android.json()).id;
        const ios = await register('iosbuyer', { ref: { slug: 'REEL-WATCH', source: 'ios_match' } });
        assert.equal((await userOf(ios.clone())).influencer_source, 'ios_match');
        accounts.ios = (await ios.json()).id;
        // Unknown sources and paused links are ignored
        assert.equal((await userOf(await register('forged', { ref: { slug: 'reel-watch', source: 'admin' } }))).influencer_id, null);
        assert.equal((await userOf(await register('late', { ref: { slug: 'samer', source: 'play' } }))).influencer_id, null);
      });

      await test('Google/Apple sign-up is attributed; signing in again changes nothing', async () => {
        const token = await new SignJWT({ sub: 'g-1', email: 'social@gmail.com', email_verified: true })
          .setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setIssuedAt()
          .setIssuer('https://accounts.google.com').setAudience(GOOGLE_CLIENT).setExpirationTime('10m').sign(privateKey);
        const first = await json('POST', '/api/auth/social', { provider: 'google', idToken: token, ref: { slug: 'reel-watch', source: 'play' } });
        assert.equal(first.status, 200);
        const id = (await first.json()).id;
        assert.equal((await engine.query(`SELECT influencer_id FROM users WHERE id=$1`, [id])).rows[0].influencer_id, reel.id);
        await engine.query(`UPDATE users SET influencer_id=NULL WHERE id=$1`, [id]);
        await json('POST', '/api/auth/social', { provider: 'google', idToken: token, ref: { slug: 'reel-watch', source: 'play' } });
        assert.equal((await engine.query(`SELECT influencer_id FROM users WHERE id=$1`, [id])).rows[0].influencer_id, null);
      });

      await test('an iPhone that opened the link on this network matches it within 24 hours', async () => {
        const match = async (os) => (await (await fetch(`${base}/api/attribution/ios?os=${os}`)).json()).slug;
        assert.equal(await match('18.0'), 'reel-watch');
        assert.equal(await match('26.0.1'), 'reel-watch');
        assert.equal(await match(''), null);
        await engine.query(`UPDATE influencer_visits SET created_at = now() - interval '25 hours'`);
        assert.equal(await match('18.0'), null);
        await engine.query(`UPDATE influencer_visits SET created_at = now()`);
      });

      await test('confirmed orders of attributed accounts count as sales', async () => {
        const confirmed1 = await s.checkout(accounts.web, order);
        const confirmed2 = await s.checkout(accounts.android, { ...order, items: [{ productId: 'p', quantity: 2 }] });
        const pending = await s.checkout(accounts.ios, order);
        const rejected = await s.checkout(accounts.ios, order);
        await s.checkout('organic', order); // not from any link
        for (const o of [confirmed1, confirmed2, rejected]) await s.submitReceipt(o.id, o.userId, 'data:image/png;base64,dGVzdA==');
        await s.decidePayment(confirmed1.id, 'confirmed');
        await s.decidePayment(confirmed2.id, 'confirmed');
        await s.decidePayment(rejected.id, 'rejected', 'wrong amount');
        assert.ok(pending);

        const r = await row('reel-watch');
        assert.equal(r.signups, 3); assert.equal(r.estimatedSignups, 1);
        assert.equal(r.orders, 2); assert.equal(r.customers, 2); assert.equal(r.pendingOrders, 1);
        assert.equal(r.sales, 300, 'products only, delivery excluded');
        const samer = await row('samer');
        assert.equal(samer.signups, 0); assert.equal(samer.sales, 0);
      });

      await test('the period filter excludes older visits, signups and orders', async () => {
        await engine.query(`UPDATE influencer_visits SET created_at = now() - interval '40 days'`);
        await engine.query(`UPDATE orders SET created_at = now() - interval '40 days'`);
        await engine.query(`UPDATE users SET created_at = now() - interval '40 days'`);
        const recent = await row('reel-watch', '?days=30');
        assert.equal(recent.visits, 0); assert.equal(recent.signups, 0); assert.equal(recent.sales, 0);
        const all = await row('reel-watch', '?days=all');
        assert.equal(all.visits, 4); assert.equal(all.signups, 3); assert.equal(all.sales, 300);
      });

      await test('deleting a link keeps the accounts and orders, unlinked', async () => {
        assert.equal((await admin('DELETE', `/api/admin/influencers/${reel.id}`)).status, 200);
        assert.equal((await stats()).some((i) => i.slug === 'reel-watch'), false);
        assert.equal((await engine.query(`SELECT 1 FROM influencer_visits`)).rows.length, 0);
        assert.equal((await engine.query(`SELECT 1 FROM users WHERE influencer_id IS NOT NULL`)).rows.length, 0);
        assert.equal((await engine.query(`SELECT 1 FROM users WHERE id=$1`, [accounts.web])).rows.length, 1);
      });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
    console.log(`${passed} tracking link checks passed`);
  } finally {
    await engine.close();
  }
})().finally(() => { if (fs.existsSync(out)) fs.unlinkSync(out); }).catch((e) => { console.error(e); process.exitCode = 1; });
