// Influencer links count visits and their coupon codes attribute sales.
// Real storage + routes on PGlite; push services are stubbed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, '.influencers-test.cjs');
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Instagram 350.0';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36';
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36';

(async () => {
  await require('esbuild').build({
    stdin: {
      contents: `export {storage} from './server/storage'; export {registerRoutes} from './server/routes'; export {engine} from 'test-db';`,
      resolveDir: root,
    },
    bundle: true, platform: 'node', format: 'cjs', packages: 'external', outfile: out,
    plugins: [{ name: 'isolate-services', setup(b) {
      b.onResolve({ filter: /^(test-db|\.\/db|connect-pg-simple|\.\/firebase|\.\/apns)$/ }, (a) => ({ path: ['test-db', './db'].includes(a.path) ? 'test-db' : a.path, namespace: 'test' }));
      b.onLoad({ filter: /.*/, namespace: 'test' }, (a) => {
        let contents;
        if (a.path === 'connect-pg-simple') contents = `import session from 'express-session'; export default () => session.MemoryStore;`;
        else if (a.path === './firebase') contents = `export const sendFcmNotification=async()=>{};export const sendFcmToUser=async()=>{};`;
        else if (a.path === './apns') contents = `export const isApnsConfigured=()=>false;export const sendApnsNotifications=async()=>({});`;
        else contents = `import {PGlite} from '@electric-sql/pglite'; import {drizzle} from 'drizzle-orm/pglite';export const engine=new PGlite();export const db=drizzle(engine);export const pool={};`;
        return { contents, loader: 'js', resolveDir: root };
      });
    } }],
  });

  process.env.NODE_ENV = 'test';
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
      ('b1','buyer1','b1@example.com',$1,'user',true),
      ('b2','buyer2','b2@example.com',$1,'user',true)`, [password]);
    await engine.exec(`INSERT INTO products(id,name,price,stock) VALUES ('p','Test product',100,50);
      INSERT INTO payment_methods(id,name,name_ar,bank_name,account_name,iban) VALUES ('bank','Bank Transfer','تحويل بنكي','Test Bank','Owner','TEST-IBAN');
      INSERT INTO draws(id,title,prize_name,ticket_price,target_tickets,status) VALUES ('d','Round','Prize',10,1000,'active');`);

    const express = require('express');
    const app = express(); app.use(express.json());
    const server = await registerRoutes(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'boss', password: 'test-password' }) });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const admin = (method, url, body) => fetch(base + url, { method, headers: { cookie, 'content-type': 'application/json' }, body: body && JSON.stringify(body) });
    const visit = (slug, ua, method = 'GET') => fetch(`${base}/r/${slug}`, { method, redirect: 'manual', headers: { 'user-agent': ua } });
    const stats = async (query = '') => (await (await admin('GET', '/api/admin/influencers' + query)).json());
    const order = { items: [{ productId: 'p', quantity: 1 }], paymentMethod: 'bank', shippingFullName: 'Test', shippingPhone: '0933123456', shippingCity: 'دمشق', shippingAddress: 'Test', shippingCountry: 'سوريا' };

    let passed = 0;
    const test = async (name, fn) => { await fn(); console.log('PASS', name); passed++; };

    try {
      let samer;
      await test('admin creates an influencer with a link and a discount code', async () => {
        const res = await admin('POST', '/api/admin/influencers', { name: 'سامر', slug: 'Samer', couponCode: 'samer10', discountPercent: 10 });
        assert.equal(res.status, 200);
        samer = await res.json();
        assert.equal(samer.slug, 'samer'); assert.equal(samer.couponCode, 'SAMER10');
        const coupons = await (await admin('GET', '/api/admin/coupons')).json();
        const coupon = coupons.find((c) => c.code === 'SAMER10');
        assert.equal(coupon.discountPercent, 10); assert.ok(coupon.maxUses >= 100000);
        assert.equal((await admin('POST', '/api/admin/influencers', { name: 'Other', slug: 'lina' })).status, 200);
      });

      await test('duplicate links or codes and bad input are refused with a message', async () => {
        const dupSlug = await admin('POST', '/api/admin/influencers', { name: 'x', slug: 'samer' });
        assert.equal(dupSlug.status, 409); assert.match((await dupSlug.json()).message, /الرابط/);
        const dupCode = await admin('POST', '/api/admin/influencers', { name: 'x', slug: 'x2', couponCode: 'SAMER10' });
        assert.equal(dupCode.status, 409);
        const bad = await admin('POST', '/api/admin/influencers', { name: 'x', slug: 'سامر' });
        assert.equal(bad.status, 400); assert.match((await bad.json()).message, /الإنجليزية/);
        assert.equal((await fetch(base + '/api/admin/influencers')).status, 401);
      });

      await test('the link sends each phone to its store and counts the visit', async () => {
        const ios = await visit('samer', IPHONE);
        assert.equal(ios.status, 302);
        assert.equal(ios.headers.get('location'), 'https://apps.apple.com/app/id6759828874');
        assert.equal(ios.headers.get('cache-control'), 'no-store');
        const android = await visit('SAMER', ANDROID);
        const playUrl = new URL(android.headers.get('location'));
        assert.equal(playUrl.host, 'play.google.com');
        assert.equal(playUrl.searchParams.get('id'), 'today.forsa');
        assert.equal(new URLSearchParams(playUrl.searchParams.get('referrer')).get('utm_campaign'), 'samer');
        assert.equal((await visit('samer', DESKTOP)).headers.get('location'), '/');
      });

      await test('repeat visits count once per visitor; link previews and HEAD are ignored', async () => {
        await visit('samer', IPHONE);
        await visit('samer', 'WhatsApp/2.23.20.0 A');
        await visit('samer', 'TelegramBot (like TwitterBot)');
        await visit('samer', 'facebookexternalhit/1.1');
        await visit('samer', IPHONE, 'HEAD');
        await visit('samer', '');
        const row = (await stats()).find((i) => i.slug === 'samer');
        assert.equal(row.visits, 4);
        assert.equal(row.visitors, 3);
        assert.deepEqual(row.visitorsByPlatform, { ios: 1, android: 1, web: 1 });
        const { rows } = await engine.query(`SELECT visitor_hash FROM influencer_visits`);
        assert.ok(rows.every((r) => /^[0-9a-f]{32}$/.test(r.visitor_hash) && !r.visitor_hash.includes('127.0.0.1')));
      });

      await test('unknown or paused links go to the store home without counting', async () => {
        assert.equal((await visit('nobody', IPHONE)).headers.get('location'), '/');
        assert.equal((await admin('PATCH', `/api/admin/influencers/${samer.id}`, { enabled: false })).status, 200);
        assert.equal((await visit('samer', IPHONE)).headers.get('location'), '/');
        assert.equal((await stats()).find((i) => i.slug === 'samer').visits, 4);
        await admin('PATCH', `/api/admin/influencers/${samer.id}`, { enabled: true });
      });

      await test('only confirmed orders with the code count as sales', async () => {
        const confirmed1 = await s.checkout('b1', { ...order, couponCode: 'samer10' });
        const confirmed2 = await s.checkout('b1', { ...order, couponCode: 'SAMER10', items: [{ productId: 'p', quantity: 2 }] });
        const pending = await s.checkout('b2', { ...order, couponCode: 'SAMER10' });
        const rejected = await s.checkout('b2', { ...order, couponCode: 'SAMER10' });
        await s.checkout('b2', order); // no code: not attributed
        for (const o of [confirmed1, confirmed2, rejected]) await s.submitReceipt(o.id, o.userId, 'data:image/png;base64,dGVzdA==');
        await s.decidePayment(confirmed1.id, 'confirmed');
        await s.decidePayment(confirmed2.id, 'confirmed');
        await s.decidePayment(rejected.id, 'rejected', 'wrong amount');
        assert.ok(pending);

        const list = await stats();
        const row = list.find((i) => i.slug === 'samer');
        assert.equal(row.orders, 2);
        assert.equal(row.customers, 1);
        assert.equal(row.pendingOrders, 1);
        // 100 + 200 of products, 10% off, delivery excluded
        assert.equal(row.sales, 270);
        assert.equal(row.discounts, 30);
        const lina = list.find((i) => i.slug === 'lina');
        assert.equal(lina.orders, 0); assert.equal(lina.sales, 0); assert.equal(lina.visits, 0);
      });

      await test('the period filter excludes older visits and orders', async () => {
        await engine.query(`UPDATE influencer_visits SET created_at = now() - interval '40 days'`);
        await engine.query(`UPDATE orders SET created_at = now() - interval '40 days'`);
        const recent = (await stats('?days=30')).find((i) => i.slug === 'samer');
        assert.equal(recent.visits, 0); assert.equal(recent.orders, 0); assert.equal(recent.sales, 0);
        const all = (await stats('?days=all')).find((i) => i.slug === 'samer');
        assert.equal(all.visits, 4); assert.equal(all.sales, 270);
      });

      await test('deleting an influencer keeps its code and the orders', async () => {
        assert.equal((await admin('DELETE', `/api/admin/influencers/${samer.id}`)).status, 200);
        assert.equal((await stats()).some((i) => i.slug === 'samer'), false);
        assert.equal((await engine.query(`SELECT 1 FROM influencer_visits`)).rows.length, 0);
        assert.equal((await engine.query(`SELECT 1 FROM coupons WHERE code='SAMER10'`)).rows.length, 1);
        assert.equal((await engine.query(`SELECT 1 FROM orders WHERE coupon_code='SAMER10'`)).rows.length, 4);
      });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
    console.log(`${passed} influencer checks passed`);
  } finally {
    await engine.close();
  }
})().finally(() => { if (fs.existsSync(out)) fs.unlinkSync(out); }).catch((e) => { console.error(e); process.exitCode = 1; });
