// Image uploads are compressed into the media table and served by URL; inline
// data: images already in the database are migrated. Real storage, routes and sharp on PGlite.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const out = path.join(root, '.media-test.cjs');

(async () => {
  await require('esbuild').build({
    stdin: {
      contents: `export {storage} from './server/storage'; export {registerRoutes} from './server/routes'; export {engine} from 'test-db'; export * from './server/media';`,
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
  const { storage: s, engine, registerRoutes, compressImage, saveUpload, migrateInlineImages, MediaError } = require(out);

  // A large "phone photo" with EXIF, a PNG with transparency, and an SVG
  const photo = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: '#3366cc' } })
    .jpeg({ quality: 95 }).withMetadata({ exif: { IFD0: { Make: 'TestPhone', Model: 'GPS here' } } }).toBuffer();
  const png = await sharp({ create: { width: 800, height: 800, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><script>alert(1)</script><rect width="64" height="64" fill="#1267E8"/></svg>');
  const dataUrl = (mime, buf) => `data:${mime};base64,${buf.toString('base64')}`;

  try {
    await engine.exec(fs.readFileSync(path.join(root, 'scripts/sql/nayvo-schema.sql'), 'utf8'));
    await engine.exec(fs.readFileSync(path.join(root, 'scripts/sql/launch-hardening.sql'), 'utf8'));
    await engine.exec(fs.readFileSync(path.join(root, 'scripts/sql/launch-hardening.sql'), 'utf8'));
    const bcrypt = require('bcryptjs');
    const password = await bcrypt.hash('test-password', 4);
    await engine.query(`INSERT INTO users(id,username,email,password,role,email_verified) VALUES ('admin','boss','boss@example.com',$1,'admin',true),('buyer','buyer','buyer@example.com',$1,'user',true)`, [password]);

    let passed = 0;
    const test = async (name, fn) => { await fn(); console.log('PASS', name); passed++; };

    await test('phone photos are resized, re-encoded as WebP and stripped of EXIF', async () => {
      const result = await compressImage(photo, 'product');
      assert.equal(result.mimeType, 'image/webp');
      assert.ok(result.width <= 1200 && result.height <= 1200, `${result.width}x${result.height}`);
      assert.ok(result.data.length < photo.length / 5, `${result.data.length} vs ${photo.length}`);
      const meta = await sharp(result.data).metadata();
      assert.equal(meta.format, 'webp'); assert.equal(meta.exif, undefined);
    });

    await test('banners keep more resolution; receipts become JPEG on white', async () => {
      assert.equal((await compressImage(photo, 'banner')).width, 1600);
      const receipt = await compressImage(png, 'receipt');
      assert.equal(receipt.mimeType, 'image/jpeg');
      assert.equal((await sharp(receipt.data).metadata()).hasAlpha, false);
    });

    await test('SVG is rasterised so no script can be served; junk is refused', async () => {
      const result = await compressImage(svg, 'product');
      assert.equal(result.mimeType, 'image/webp');
      assert.ok(!result.data.toString('latin1').includes('<script'));
      await assert.rejects(compressImage(Buffer.from('not an image'), 'product'), MediaError);
      await assert.rejects(saveUpload(Buffer.from('%PDF-1.4 x'), 'application/pdf', 'product'), MediaError);
      assert.match(await saveUpload(Buffer.from('%PDF-1.4 receipt'), 'application/pdf', 'receipt'), /^\/api\/media\/[A-Za-z0-9_-]+\.pdf$/);
    });

    const express = require('express');
    const app = express(); app.use(express.json());
    const server = await registerRoutes(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'boss', password: 'test-password' }) });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const upload = (file, kind) => {
      const form = new FormData();
      if (kind) form.append('kind', kind);
      form.append('image', new Blob([file], { type: 'image/jpeg' }), 'photo.jpg');
      return fetch(base + '/api/admin/products/upload-image', { method: 'POST', headers: { cookie }, body: form });
    };

    try {
      let imageUrl;
      await test('admin upload returns a short media URL served with long caching', async () => {
        const res = await upload(photo);
        assert.equal(res.status, 200);
        imageUrl = (await res.json()).imageUrl;
        assert.match(imageUrl, /^\/api\/media\/[A-Za-z0-9_-]{24}\.webp$/);
        const img = await fetch(base + imageUrl);
        assert.equal(img.status, 200);
        assert.equal(img.headers.get('content-type'), 'image/webp');
        assert.match(img.headers.get('cache-control'), /public, max-age=31536000, immutable/);
        assert.equal(img.headers.get('x-content-type-options'), 'nosniff');
        const again = await fetch(base + imageUrl, { headers: { 'if-none-match': img.headers.get('etag') } });
        assert.equal(again.status, 304);
      });

      await test('banner uploads are stored at banner size', async () => {
        const res = await upload(photo, 'banner');
        const url = (await res.json()).imageUrl;
        const meta = await sharp(Buffer.from(await (await fetch(base + url)).arrayBuffer())).metadata();
        assert.equal(meta.width, 1600);
      });

      await test('unknown or malformed media ids are 404; non-images are refused with a message', async () => {
        assert.equal((await fetch(base + '/api/media/doesnotexistdoesnotexist.webp')).status, 404);
        assert.equal((await fetch(base + '/api/media/..%2F..%2Fetc')).status, 404);
        const bad = await upload(Buffer.from('definitely not a picture'));
        assert.equal(bad.status, 400);
        assert.match((await bad.json()).message, /الصورة/);
      });

      await test('anonymous users cannot upload', async () => {
        const form = new FormData(); form.append('image', new Blob([photo], { type: 'image/jpeg' }), 'p.jpg');
        assert.equal((await fetch(base + '/api/admin/products/upload-image', { method: 'POST', body: form })).status, 401);
      });

      await test('inline images already in the database move to media, deduplicated, once', async () => {
        const productImg = dataUrl('image/jpeg', photo);
        await engine.query(`INSERT INTO products(id,name,price,stock,image_url,images_json) VALUES ('p1','Photo product',30,5,$1,$2)`,
          [productImg, JSON.stringify([productImg, dataUrl('image/png', png), '/api/media/already-a-url.webp'])]);
        await engine.query(`INSERT INTO draws(id,title,prize_name,ticket_price,target_tickets,status,prize_image_url,banner_image_url) VALUES ('d1','Round','Prize',10,5,'active',$1,$2)`,
          [dataUrl('image/svg+xml', svg), dataUrl('image/jpeg', photo)]);
        await engine.query(`INSERT INTO orders(id,user_id,subtotal,total_amount,status,payment_status,receipt_url) VALUES ('o1','buyer',30,32,'pending','pending_review',$1)`, [dataUrl('image/png', png)]);
        await engine.query(`INSERT INTO order_items(id,order_id,product_id,product_name,product_image_url,unit_price,quantity,line_total) VALUES ('i1','o1','p1','Photo product',$1,30,1,30)`, [productImg]);

        const first = await migrateInlineImages(() => {});
        assert.equal(first.failed, 0);
        const { rows: [p] } = await engine.query(`SELECT image_url, images_json FROM products WHERE id='p1'`);
        const { rows: [d] } = await engine.query(`SELECT prize_image_url, banner_image_url FROM draws WHERE id='d1'`);
        const { rows: [o] } = await engine.query(`SELECT receipt_url FROM orders WHERE id='o1'`);
        const { rows: [i] } = await engine.query(`SELECT product_image_url FROM order_items WHERE id='i1'`);
        const list = JSON.parse(p.images_json);
        for (const url of [p.image_url, ...list, d.prize_image_url, d.banner_image_url, o.receipt_url, i.product_image_url]) {
          assert.match(url, /^\/api\/media\//);
        }
        assert.equal(list[0], p.image_url, 'same image reuses one media row');
        assert.equal(i.product_image_url, p.image_url);
        assert.equal(list[2], '/api/media/already-a-url.webp');
        assert.match(o.receipt_url, /\.jpg$/);
        const receipt = await fetch(base + o.receipt_url);
        assert.match(receipt.headers.get('cache-control'), /^private/);
        assert.equal(first.converted, 5);
        assert.deepEqual(await migrateInlineImages(() => {}), { converted: 0, failed: 0 });
      });

      await test('the public product list is now small', async () => {
        const res = await fetch(base + '/api/products');
        const text = await res.text();
        assert.ok(text.length < 5000, `${text.length} bytes`);
        assert.ok(!text.includes('data:image'));
      });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
    console.log(`${passed} media checks passed`);
  } finally {
    await engine.close();
  }
})().finally(() => { if (fs.existsSync(out)) fs.unlinkSync(out); }).catch((e) => { console.error(e); process.exitCode = 1; });
