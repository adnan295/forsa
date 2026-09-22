// Real storage + HTTP routes, isolated PostgreSQL-compatible database; no external services.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, '.commerce-test.cjs');
(async () => {
  await require('esbuild').build({
    stdin: { contents: `export {storage} from './server/storage'; export {registerRoutes} from './server/routes'; export {engine} from 'test-db'; export * from './shared/commerce';`, resolveDir: root },
    bundle: true, platform: 'node', format: 'cjs', packages: 'external', outfile: out,
    plugins: [{ name: 'isolate-services', setup(b) {
      b.onResolve({filter: /^(test-db|\.\/db|connect-pg-simple|\.\/firebase|\.\/apns)$/}, a => ({path:['test-db','./db'].includes(a.path)?'test-db':a.path, namespace:'test'}));
      b.onLoad({filter:/.*/, namespace:'test'}, a => {
        let contents;
        if (a.path==='connect-pg-simple') contents=`import session from 'express-session'; export default () => session.MemoryStore;`;
        else if (a.path==='./firebase') contents=`export const sendFcmNotification=async()=>{};export const sendFcmToUser=async()=>{};`;
        else if (a.path==='./apns') contents=`export const isApnsConfigured=()=>false;export const sendApnsNotifications=async()=>({});`;
        else contents=`import {PGlite} from '@electric-sql/pglite'; import {drizzle} from 'drizzle-orm/pglite';export const engine=new PGlite();export const db=drizzle(engine);export const pool={};`;
        return {contents,loader:'js',resolveDir:root};
      });
    }}],
  });
  // Ensure the test entry and ./db use the exact same virtual module.
  const {storage:s, engine, registerRoutes, isBankTransferMethod} = require(out);
  try {
    await engine.exec(fs.readFileSync(path.join(root,'scripts/sql/nayvo-schema.sql'),'utf8'));
    await engine.exec(fs.readFileSync(path.join(root,'scripts/sql/launch-hardening.sql'),'utf8'));
    await engine.exec(fs.readFileSync(path.join(root,'scripts/sql/launch-hardening.sql'),'utf8'));
    const bcrypt = require('bcryptjs');
    const password = await bcrypt.hash('test-password', 4);
    await engine.query(`INSERT INTO users(id,username,email,password,role,email_verified) VALUES ('u','audit','audit@example.invalid',$1,'admin',true)`,[password]);
    await engine.exec(`INSERT INTO products(id,name,price,stock) VALUES ('p','Test product',30,20);
      INSERT INTO payment_methods(id,name,name_ar) VALUES ('bank','Bank Transfer','تحويل بنكي'),('cash','Cash on Delivery','الدفع عند الاستلام');
      UPDATE payment_methods SET bank_name='Test Bank',account_name='Test Owner',iban='TEST-ACCOUNT' WHERE id='bank';
      INSERT INTO draws(id,title,prize_name,ticket_price,target_tickets,status) VALUES ('d','Test draw','Test prize',15,2,'active');
      INSERT INTO coupons(id,code,discount_percent,max_uses) VALUES ('c','SAVE',10,20);`);
    const payload = {items:[{productId:'p',quantity:1}],paymentMethod:'bank',shippingFullName:'Test',shippingPhone:'123456789',shippingCity:'Test',shippingAddress:'Test',shippingCountry:'Test'};
    let passed=0;
    async function test(name, fn) { await fn(); console.log('PASS', name); passed++; }
    await test('bank only, no cash or Sham Cash', async()=>{
      assert.equal(isBankTransferMethod({name:'Sham Cash',iban:'x'}),false);
      await assert.rejects(s.checkout('u',{...payload,paymentMethod:'cash'}));
    });
    let order;
    await test('checkout includes delivery and stores promised tickets',async()=>{
      order=await s.checkout('u',{...payload,checkoutKey:'unique-checkout-key-001'});
      assert.equal(order.totalAmount,'32.00');assert.equal(order.expectedTickets,2);assert.equal(order.paymentStatus,'pending_payment');assert.equal(order.paymentMethod,'bank_transfer');
    });
    await test('checkout retry does not duplicate stock or order',async()=>{
      const replay=await s.checkout('u',{...payload,checkoutKey:'unique-checkout-key-001'});
      assert.equal(replay.id,order.id);assert.equal((await s.getProduct('p')).stock,19);
    });
    await test('payment requires bank receipt',async()=>{await assert.rejects(s.decidePayment(order.id,'confirmed'));});
    await test('draw cannot run early',async()=>{await assert.rejects(s.drawWinner('d'));});
    await test('promised tickets unchanged by later price changes; concurrent confirmation exactly once',async()=>{
      await s.updateDraw('d',{ticketPrice:'30'});
      await s.submitReceipt(order.id,'u','data:image/png;base64,dGVzdA==');
      const results=await Promise.all([s.decidePayment(order.id,'confirmed'),s.decidePayment(order.id,'confirmed')]);
      assert.equal(results.reduce((n,r)=>n+r.created,0),2);assert.equal((await s.getTicketsByDraw('d')).length,2);assert.equal((await s.getDraw('d')).soldTickets,2);
    });
    await test('confirmed payment cannot be rejected or receipt overwritten',async()=>{
      await assert.rejects(s.decidePayment(order.id,'rejected'));await assert.rejects(s.submitReceipt(order.id,'u','data:test'));
    });
    await test('full draw produces exactly one winner',async()=>{
      const results=await Promise.allSettled([s.drawWinner('d'),s.drawWinner('d')]);
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await s.getTicketsByDraw('d')).filter(t=>t.isWinner).length,1);
    });
    await test('rejection restores stock and coupon once; cannot reconfirm rejected order',async()=>{
      const o=await s.checkout('u',{...payload,couponCode:'SAVE'});
      await Promise.all([s.decidePayment(o.id,'rejected'),s.decidePayment(o.id,'rejected')]);
      assert.equal((await s.getProduct('p')).stock,19);
      assert.equal((await engine.query(`SELECT used_count FROM coupons WHERE id='c'`)).rows[0].used_count,0);
      await assert.rejects(s.decidePayment(o.id,'confirmed'));
    });
    await test('payment rolls back if ticket creation fails',async()=>{
      const o=await s.checkout('u',payload);
      await s.submitReceipt(o.id,'u','data:image/png;base64,dGVzdA==');
      await engine.exec(`CREATE FUNCTION audit_fail_ticket() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'simulated failure';END$$; CREATE TRIGGER audit_fail BEFORE INSERT ON tickets FOR EACH ROW EXECUTE FUNCTION audit_fail_ticket();`);
      await assert.rejects(s.decidePayment(o.id,'confirmed'));
      assert.equal((await s.getOrder(o.id)).paymentStatus,'pending_review');
      await engine.exec('DROP TRIGGER audit_fail ON tickets; DROP FUNCTION audit_fail_ticket();');
      await s.decidePayment(o.id,'rejected');
    });
    // Real HTTP requests through Express, with local memory sessions and email disabled.
    delete process.env.RESEND_API_KEY;process.env.NODE_ENV='test';
    const express=require('express');const app=express();app.use(express.json());
    const server=await registerRoutes(app);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const base=`http://127.0.0.1:${server.address().port}`;
    async function post(url,body,cookie=''){return fetch(base+url,{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify(body)});}
    try {
      await test('password reset response does not disclose code when email unavailable',async()=>{
        const res=await post('/api/auth/forgot-password',{email:'audit@example.invalid'});const body=await res.json();assert.equal(res.status,200);assert.deepEqual(Object.keys(body),['message']);
      });
      const login=await post('/api/auth/login',{username:'audit',password:'test-password'});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
      await test('HTTP checkout rejects cash and serves bank only',async()=>{
        const methods=await (await fetch(base+'/api/payment-methods')).json();assert.equal(methods.length,1);
        assert.equal((await post('/api/checkout',{...payload,paymentMethod:'cash'},cookie)).status,400);
      });
      await test('HTTP checkout rejects incomplete shipping',async()=>{assert.equal((await post('/api/checkout',{...payload,shippingAddress:''},cookie)).status,400);});
      await test('HTTP receipt upload, confirmation and order read',async()=>{
        const res=await post('/api/checkout',payload,cookie);assert.equal(res.status,200);const {order:o}=await res.json();
        const form=new FormData();form.append('receipt',new Blob(['test receipt'],{type:'image/png'}),'receipt.png');
        const uploaded=await fetch(base+`/api/orders/${o.id}/receipt`,{method:'POST',headers:{cookie},body:form});assert.equal(uploaded.status,200);
        const confirmed=await fetch(base+`/api/admin/orders/${o.id}/payment`,{method:'PUT',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({paymentStatus:'confirmed'})});assert.equal(confirmed.status,200);
        const stored=await (await fetch(base+`/api/orders/${o.id}`,{headers:{cookie}})).json();assert.equal(stored.paymentStatus,'confirmed');assert.equal(stored.totalAmount,'32.00');
      });
      await test('every admin section API loads and rejects anonymous access',async()=>{
        for (const route of ['dashboard','orders','users','support-tickets','products','draws','payment-methods','coupons','activity-log','notifications','sales-chart']) {
          const res=await fetch(base+'/api/admin/'+route,{headers:{cookie}});
          assert.equal(res.status,200,route);await res.json();
          assert.equal((await fetch(base+'/api/admin/'+route)).status,401,route);
        }
      });
      await test('admin order details expose lines and promised ticket count',async()=>{
        const rows=await (await fetch(base+'/api/admin/orders',{headers:{cookie}})).json();
        assert.ok(rows.length);assert.ok(rows.every(o=>Array.isArray(o.items)&&Number.isInteger(o.expectedTickets)));
        assert.equal(JSON.stringify(rows).includes('walletAmount'),false);
      });
      await test('shipping is blocked before payment and cannot go backwards',async()=>{
        const o=await s.checkout('u',payload);
        const update=async(data)=>fetch(base+`/api/admin/orders/${o.id}/shipping`,{method:'PUT',headers:{cookie,'content-type':'application/json'},body:JSON.stringify(data)});
        assert.equal((await update({shippingStatus:'shipped'})).status,400);
        await s.submitReceipt(o.id,'u','data:image/png;base64,dGVzdA==');await s.decidePayment(o.id,'confirmed');
        assert.equal((await update({shippingStatus:'processing'})).status,200);
        assert.equal((await update({shippingStatus:'shipped',trackingNumber:'TRACK-1'})).status,200);
        assert.equal((await update({shippingStatus:'pending'})).status,400);
        assert.equal((await update({shippingStatus:'cancelled'})).status,400);
      });
      await test('admin totals and sales chart count confirmed payments only',async()=>{
        const all=await s.getAllOrders(), paid=all.filter(o=>o.paymentStatus==='confirmed');
        const sum=paid.reduce((n,o)=>n+Number(o.totalAmount),0);
        const stats=await (await fetch(base+'/api/admin/dashboard',{headers:{cookie}})).json();
        assert.equal(Number(stats.totalRevenue),sum);
        assert.equal(Number(stats.averageOrderValue),Number((sum/paid.length).toFixed(2)));
        assert.ok(Number(stats.conversionRate)<=100);
        assert.equal(Number((await s.getUserStats('u')).totalSpent),sum);
        const chart=await (await fetch(base+'/api/admin/sales-chart',{headers:{cookie}})).json();
        assert.equal(chart.reduce((n,d)=>n+Number(d.total),0),sum);
      });
      await test('product edits and coupon edits reject invalid values',async()=>{
        const update=async(url,data)=>fetch(base+url,{method:'PUT',headers:{cookie,'content-type':'application/json'},body:JSON.stringify(data)});
        assert.equal((await update('/api/admin/products/p',{price:'-1'})).status,400);
        assert.equal((await update('/api/admin/products/p',{stock:1.5})).status,400);
        assert.equal((await post('/api/admin/coupons',{code:'INVALID',discountPercent:150,maxUses:1},cookie)).status,400);
        assert.equal((await update('/api/admin/coupons/c',{discountPercent:-10})).status,400);
        assert.equal((await update('/api/admin/products/p',{price:'35.00'})).status,200);
      });
      await test('bank account configuration, enable and disable are consistent',async()=>{
        assert.equal((await post('/api/admin/payment-methods',{name:'Bank Transfer',nameAr:'Bank'},cookie)).status,400);
        const res=await post('/api/admin/payment-methods',{name:'Bank Transfer 2',nameAr:'Bank 2',bankName:'Bank',accountName:'Owner',iban:'TEST-2'},cookie);
        assert.equal(res.status,200);const method=await res.json();
        const disabled=await fetch(base+`/api/admin/payment-methods/${method.id}`,{method:'PUT',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({enabled:false})});assert.equal(disabled.status,200);
        const enabled=await (await fetch(base+'/api/payment-methods')).json();assert.equal(enabled.some(m=>m.id===method.id),false);
      });
      await test('admin account changes authenticate before changing email',async()=>{
        const before=await s.getUser('u');
        const res=await fetch(base+'/api/admin/account-settings',{method:'PUT',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({email:'changed@example.com',currentPassword:'wrong-password',newPassword:'new-password'})});
        assert.equal(res.status,401);assert.equal((await s.getUser('u')).email,before.email);
        assert.equal((await post('/api/admin/create-admin',{email:'bad',username:'aa',password:'x'},cookie)).status,400);
      });
      await test('admin CSV exports are available',async()=>{
        for(const kind of ['orders','users']) {
          const res=await fetch(base+'/api/admin/'+kind+'/export/csv',{headers:{cookie}});
          assert.equal(res.status,200);assert.match(res.headers.get('content-type'),/csv/);
        }
      });
      await test('removed referrals and campaign endpoints are unavailable',async()=>{
        for(const route of ['/api/referral','/api/admin/campaigns']) assert.equal((await fetch(base+route,{headers:{cookie}})).status,404);
      });
      await test('wallet endpoint removed',async()=>{assert.equal((await fetch(base+'/api/user/wallet',{headers:{cookie}})).status,404);});
    } finally {await new Promise(resolve=>server.close(resolve));}
    await test('account deletion with orders, tickets and support succeeds atomically',async()=>{
      await s.createSupportTicket('u',{subject:'Test',message:'Test',priority:'normal'});await s.deleteUser('u');assert.equal(await s.getUser('u'),undefined);
    });
    console.log(`${passed} regression checks passed`);
  } finally {await engine.close();}
})().finally(()=>{if(fs.existsSync(out))fs.unlinkSync(out);}).catch(e=>{console.error(e);process.exitCode=1;});
