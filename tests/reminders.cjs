// Reminders against a real schema on PGlite; push and email are stubbed out.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, '.reminders-test.cjs');

(async () => {
  const sent = [];
  await require('esbuild').build({
    stdin: {
      contents: `export {storage} from './server/storage';
export {runReminders} from './server/reminders';
export {engine} from 'test-db';
export {sent} from './push';`,
      resolveDir: root,
    },
    bundle: true, platform: 'node', format: 'cjs', packages: 'external', outfile: out,
    plugins: [{ name: 'isolate', setup(b) {
      b.onResolve({ filter: /^(test-db|\.\/db|\.\/push|\.\/firebase|\.\/apns|connect-pg-simple)$/ },
        a => ({ path: ['test-db', './db'].includes(a.path) ? 'test-db' : a.path, namespace: 'test' }));
      b.onLoad({ filter: /.*/, namespace: 'test' }, a => {
        let contents;
        if (a.path === './push') contents = `export const sent=[];export function sendPushNotifications(ids,title,body,data){sent.push({ids,title,body,data});}`;
        else if (a.path === './firebase') contents = `export const sendFcmNotification=async()=>{};export const sendFcmToUser=async()=>{};`;
        else if (a.path === './apns') contents = `export const isApnsConfigured=()=>false;export const sendApnsNotifications=async()=>({});`;
        else if (a.path === 'connect-pg-simple') contents = `import session from 'express-session';export default()=>session.MemoryStore;`;
        else contents = `import {PGlite} from '@electric-sql/pglite';import {drizzle} from 'drizzle-orm/pglite';export const engine=new PGlite();export const db=drizzle(engine);export const pool={};`;
        return { contents, loader: 'js', resolveDir: root };
      });
    }}],
  });

  const { storage, runReminders, engine, sent: pushes } = require(out);
  let passed = 0;
  const check = (name, cond) => {
    assert.ok(cond, name);
    console.log('PASS', name);
    passed++;
  };

  try {
    await engine.exec(fs.readFileSync(path.join(root, 'scripts/sql/nayvo-schema.sql'), 'utf8'));
    const bcrypt = require('bcryptjs');
    const pw = await bcrypt.hash('x', 4);

    const mk = async (username, role) => {
      const u = await storage.createUser({ username, email: `${username}@t.invalid`, password: pw });
      if (role === 'admin') await engine.query(`update users set role='admin' where id=$1`, [u.id]);
      return u;
    };
    const admin = await mk('admin', 'admin');
    const buyer = await mk('buyer');
    const idle = await mk('idle');

    const notifs = async (type) =>
      (await engine.query(`select user_id from user_notifications where type=$1`, [type])).rows;

    // جولة نشطة تجاوزت عتبة الاقتراب (٨٠٪)
    const draw = await storage.createDraw({
      title: 'الأولى', prizeName: 'آيفون', ticketPrice: 10, targetTickets: 100,
    });
    await engine.query(`update draws set sold_tickets=85, status='active' where id=$1`, [draw.id]);

    // المشتري عنده تذكرتان، والخامل ولا وحدة
    const order = await engine.query(
      `insert into orders (user_id, subtotal, total_amount, payment_status, status)
       values ($1,'50','50','confirmed','paid') returning id`,
      [buyer.id]);
    for (const n of ['T-1', 'T-2']) {
      await engine.query(
        `insert into tickets (ticket_number, user_id, order_id, draw_id) values ($1,$2,$3,$4)`,
        [n, buyer.id, order.rows[0].id, draw.id]);
    }

    // طلب بلا إيصال أقدم من المهلة
    await engine.query(
      `insert into orders (user_id, subtotal, total_amount, payment_status, status, created_at)
       values ($1,'20','20','pending_payment','pending', now() - interval '10 hours')`, [buyer.id]);

    await runReminders();

    check('تذكير اقتراب السحب يصل للمستخدمين لا للإدارة',
      (await notifs('draw_closing')).map(r => r.user_id).sort().join() === [buyer.id, idle.id].sort().join());
    check('تذكير الفرص يصل للمشارك وحده',
      (await notifs('your_chances')).length === 1);
    check('تذكير عدم المشاركة يصل لمن لا تذكرة له وحده',
      (await notifs('not_joined')).map(r => r.user_id).join() === idle.id);
    check('تذكير الإيصال يصل لصاحب الطلب المعلّق',
      (await notifs('receipt_due')).map(r => r.user_id).join() === buyer.id);
    check('لا تنبيه إدارة قبل اكتمال الجولة',
      (await notifs('draw_ready_admin')).length === 0);

    const after = pushes.length;
    check('كل تذكير أُرسل دفعاً أيضاً', after > 0);

    // الدورة الثانية يجب ألا تكرر شيئاً
    await runReminders();
    check('إعادة الدورة لا تكرر اقتراب السحب', (await notifs('draw_closing')).length === 2);
    check('إعادة الدورة لا تكرر الفرص', (await notifs('your_chances')).length === 1);
    check('إعادة الدورة لا تكرر عدم المشاركة', (await notifs('not_joined')).length === 1);
    check('إعادة الدورة لا تكرر الإيصال', (await notifs('receipt_due')).length === 1);
    check('إعادة الدورة لا ترسل دفعاً جديداً', pushes.length === after);

    // الجولة تكتمل: تنبيه الإدارة وحدها
    await engine.query(`update draws set sold_tickets=100, status='ready_to_draw' where id=$1`, [draw.id]);
    await runReminders();
    check('تنبيه الجولة المكتملة يصل للإدارة وحدها',
      (await notifs('draw_ready_admin')).map(r => r.user_id).join() === admin.id);

    console.log(`\n${passed} فحصاً ناجحاً`);
  } finally {
    fs.rmSync(out, { force: true });
  }
})().catch(err => { console.error('FAIL:', err.message); process.exit(1); });
