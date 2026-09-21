# دليل نشر «فرصة» — النسخة 1.1.0

> **الترتيب مهم.** السيرفر أولاً ثم التطبيق. بالعكس رح يفتح التطبيق الجديد
> على سيرفر قديم ما فيه المسارات الجديدة.

## أرقام هذه النسخة

| | القيمة |
|---|---|
| `version` | `1.1.0` |
| iOS `buildNumber` | `5` |
| Android `versionCode` | `7` |
| iOS bundle | `app.replit.forsa` |
| Android package | `today.forsa` |

المتجران يرفضان رفع نفس رقم البناء مرتين — لكل رفعة جديدة زِد
`buildNumber` و `versionCode` قبل البناء.

---

## المرحلة ١ — السيرفر وقاعدة البيانات

### 1.1 دمج الفرع
```bash
git checkout main
git pull origin main
git merge claude/app-modification-2ywc2r
git push origin main
```

### 1.2 نسخة احتياطية (اختياري لكن مستحسن)
```bash
pg_dump "$DATABASE_URL" > forsa-backup-$(date +%F).sql
```

### 1.3 تطبيق مخطط قاعدة البيانات
```bash
npm run db:push
```

> ⚠️ **عملية هدّامة.** رح تحذف جدولَي `campaigns` و `campaign_products`،
> وتعيد بناء `orders` و `tickets` ببنية جديدة. الطلبات والتذاكر القديمة
> لا تُنقل لأن بنيتها تغيّرت كلياً.

الجداول الجديدة: `products` · `draws` · `order_items`
الأعمدة الجديدة: `products.specs_json` · `orders.delivery_fee`

### 1.4 نشر السيرفر
من Replit: زر **Deploy**. سكربت البناء المضبوط مسبقاً:
```
npm run expo:static:build && npm run server:build
```
وأمر التشغيل: `npm run server:prod`

### 1.5 تحقّق من أن السيرفر شغّال
```bash
curl -s https://forsa.today/api/products          # لازم يرجّع []
curl -s https://forsa.today/api/draws/current     # لازم يرجّع null
```
إذا رجّعوا `404` فالنشر ما نجح بعد.

---

## المرحلة ٢ — تعبئة المحتوى (قبل المراجعة)

بعد `db:push` التطبيق **فاضي تماماً**. المتجران — وخصوصاً Apple —
يرفضان التطبيقات الفارغة (Guideline 4.2 Minimum Functionality).

1. ادخل على `/admin` بحساب الأدمن
   (اسم المستخدم `admin`، وكلمة السر من متغيّر البيئة `ADMIN_PASSWORD`)
2. **المنتجات** → أضف منتجات فعلية بصور وأسعار ومواصفات
3. **جولات السحب** → أنشئ جولة واحدة على الأقل (جائزة، سعر الفرصة، العدد المستهدف)
4. **الدفع** → تأكّد أن طرق الدفع مفعّلة وبياناتها البنكية صحيحة
5. افتح التطبيق على الويب وتأكّد أن المنتجات وبطاقة الجائزة تظهر

---

## المرحلة ٣ — بناء التطبيقات

> الأندرويد مضبوط على `credentialsSource: "local"` — يعني لازم تبني من
> **نفس الجهاز الذي فيه الـ keystore و `credentials.json`**. هالملفات
> مستثناة من الريبو عمداً. ضياع الـ keystore = استحالة تحديث التطبيق
> على Google Play لاحقاً، فخُذ منه نسخة احتياطية بمكان آمن.

```bash
npm install
npx eas login
npx eas whoami          # تأكّد من الحساب الصحيح

# بناء المنصّتين معاً
npx eas build --platform all --profile production
```

أو كل منصّة لحالها:
```bash
npx eas build --platform android --profile production
npx eas build --platform ios --profile production
```

البناء يصير على خوادم EAS ويستغرق 10–25 دقيقة. الروابط تظهر في الطرفية
وعلى `expo.dev`.

### اختبار قبل الرفع (مستحسن)
```bash
npx eas build --platform android --profile preview   # ملف APK للتجريب
```
نزّله على جهاز حقيقي وجرّب: التصفّح، السلة، إتمام طلب، رفع إيصال.

---

## المرحلة ٤ — الرفع للمتجرين

```bash
npx eas submit --platform android --latest
npx eas submit --platform ios --latest
```

### ما يلزمك جاهزاً

**Google Play** — مفتاح خدمة (Service Account JSON) لأول رفع آلي،
أو ارفع ملف `.aab` يدوياً من Play Console.

**App Store** — حساب Apple Developer، و App-Specific Password أو
مفتاح App Store Connect API.

### نص «الجديد في هذه النسخة»
```
تجربة جديدة كلياً:
• متجر منتجات بتصميم جديد وواجهة أوضح
• فرص السحب تُحتسب تلقائياً من قيمة مشترياتك
• صفحة سحب مستقلة تتابع فيها تقدّم الجولة وفرصك
• تتبّع أدق لحالة الطلب من الدفع حتى التسليم
• تحسينات على السرعة والاستقرار
```

---

## بعد النشر

- [ ] افتح التطبيق على جهاز حقيقي بعد نزوله من المتجر
- [ ] نفّذ طلب تجريبي كامل وأكّد الدفع من لوحة الإدارة
- [ ] تأكّد أن الفرص مُنحت بعد تأكيد الدفع
- [ ] جرّب إشعاراً واحداً على الأقل (Push)

## ملاحظة عن النسخة السابقة

النسخة 1.0.2 كانت تستدعي `/api/campaigns` و `/api/purchase` و
`/api/cart-purchase` — وكلها محذوفة الآن. أي جهاز عليه النسخة القديمة
لن يعمل بعد نشر السيرفر الجديد، وسيحتاج التحديث من المتجر.
