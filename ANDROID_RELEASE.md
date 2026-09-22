# نشر NAYVO على Google Play

الحزمة `today.forsa` ثابتة ولا تُغيَّر. البناء عبر EAS من الفرع `main`.

## أولاً: مفتاح التوقيع

مفتاح التوقيع المحلي (`forsa-release.keystore`) مفقود. ما يمكن عمله يعتمد
على إعداد التوقيع في Play Console، فتحقّق منه قبل أي بناء:

**Play Console → التطبيق → Release → Setup → App integrity → App signing**

### الحالة الأولى: Play App Signing مفعّل

هذه الحالة الغالبة. Google يحتفظ بمفتاح التوقيع النهائي، والمفتاح المفقود
هو مفتاح الرفع فقط (upload key) — وهو قابل للاستبدال.

1. أنشئ مفتاح رفع جديد على جهازك. لا ترفعه على git ولا ترسله لأحد،
   واحتفظ بنسخة احتياطية خارج الجهاز:

   ```bash
   keytool -genkeypair -v \
     -keystore forsa-upload.keystore \
     -alias forsa-upload \
     -keyalg RSA -keysize 2048 -validity 10000
   ```

2. صدّر شهادة المفتاح الجديد:

   ```bash
   keytool -export -rfc \
     -keystore forsa-upload.keystore \
     -alias forsa-upload \
     -file upload_certificate.pem
   ```

3. من Play Console في نفس صفحة App signing اطلب
   **Request upload key reset** وأرفق `upload_certificate.pem`.
   Google بيفعّل المفتاح الجديد خلال يوم إلى يومين عادةً.

4. بعد التفعيل أنشئ `credentials.json` بجذر المستودع (مُتجاهَل في git):

   ```json
   {
     "android": {
       "keystore": {
         "keystorePath": "forsa-upload.keystore",
         "keystoreAlias": "forsa-upload",
         "keystorePassword": "…",
         "keyPassword": "…"
       }
     }
   }
   ```

### الحالة الثانية: Play App Signing غير مفعّل

التطبيق موقّع بالمفتاح المفقود وحده، وما في طريقة لتحديث نفس الإدراج.
البدائل الوحيدة: استرجاع المفتاح من أي نسخة احتياطية قديمة (جهاز سابق،
قرص خارجي، نسخة سحابية)، أو نشر التطبيق بحزمة جديدة وخسارة التثبيتات
والتقييمات. ابحث عن النسخة الاحتياطية أولاً قبل التفكير بالثاني.

## ثانياً: رقم الإصدار

`versionCode` لازم يكون أكبر من آخر رقم مرفوع على Play، ولو كان الرفع
السابق مرفوضاً أو محذوفاً. تحقّق من **Play Console → Release → Production
→ Releases** قبل البناء، وحدّث `app.json`:

```jsonc
"android": { "versionCode": <آخر رقم + 1> }
"version": "<نسخة العرض>"
```

## ثالثاً: البناء والرفع

```bash
npm ci
npx eas build --platform android --profile production --local
```

`eas.json` مضبوط على `credentialsSource: "local"`، يعني EAS بيوقّع من
`credentials.json` على جهازك ولا يحتفظ بالمفتاح على خوادمه. الناتج ملف
`.aab` بجذر المستودع.

ارفع الـ`.aab` من **Play Console → Production → Create new release**،
أو عبر EAS إذا عندك حساب خدمة:

```bash
npx eas submit --platform android --path <الملف>.aab
```

ابدأ بمسار **Internal testing** واختبر الطلب والدفع والإشعارات على جهاز
حقيقي قبل الترقية إلى Production.

## ملاحظات

- الحزمة `today.forsa` والباقة `app.replit.forsa` (iOS) محفوظتان ولا تُعدَّلان.
- النطاق الإنتاجي `nayvo.store`؛ يضبطه `EXPO_PUBLIC_DOMAIN` في `eas.json`.
- `google-services.json` مطلوب للإشعارات وموجود بالمستودع.
- احذف البيانات التجريبية من لوحة الإدارة قبل فتح البيع (راجع RELEASE.md).
