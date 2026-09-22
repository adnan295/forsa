#!/usr/bin/env bash
# إنشاء هوية توقيع iOS بدون ماك.
#
# بيشتغل على مرحلتين لأن في خطوة يدوية بالنص على developer.apple.com:
#
#   bash scripts/make-ios-signing.sh csr     ← المرحلة الأولى
#   … ارفع ios.csr على آبل ونزّل distribution.cer ونزّل الـprofile …
#   bash scripts/make-ios-signing.sh pack    ← المرحلة الثانية
#
# كل شي بيضل على جهازك. ما بينرفع ولا بينبعت لحدا.
set -euo pipefail

OUT="${IOS_SIGNING_DIR:-$HOME/nayvo-signing}"
KEY="$OUT/ios.key"
CSR="$OUT/ios.csr"
CER="$OUT/distribution.cer"
P12="$OUT/distribution.p12"

need() { command -v "$1" >/dev/null || { echo "ناقص: $1"; exit 1; }; }

case "${1:-}" in
csr)
  need openssl
  mkdir -p "$OUT"; chmod 700 "$OUT"
  if [ -f "$KEY" ]; then
    echo "المفتاح موجود مسبقاً: $KEY — ما رح يتبدّل."
  else
    openssl genrsa -out "$KEY" 2048 2>/dev/null
    chmod 600 "$KEY"
    echo "أُنشئ المفتاح الخاص: $KEY"
  fi
  read -rp "بريد حساب آبل المطوّر: " EMAIL
  openssl req -new -key "$KEY" -out "$CSR" \
    -subj "/emailAddress=${EMAIL}/CN=NAYVO Distribution/C=SY"
  echo
  echo "أُنشئ طلب التوقيع: $CSR"
  cat <<'NEXT'

الخطوات اليدوية على developer.apple.com:

  1. Certificates, Identifiers & Profiles ← Certificates ← +
     اختر Apple Distribution، ارفع ملف ios.csr، ونزّل الشهادة.
     لا تُبطل (revoke) أي شهادة قديمة يستعملها بناء آخر.

  2. Identifiers ← app.replit.forsa ← تأكد أن Push Notifications مفعّلة.
     بدونها الـprofile ما بيوقّع، لأن التطبيق يشحن aps-environment: production.

  3. Profiles ← + ← App Store Connect ← التطبيق app.replit.forsa
     ← اختر الشهادة يلي عملتها هلق ← نزّل الـprofile.

بعدين حط الملفين بنفس المجلد وشغّل: bash scripts/make-ios-signing.sh pack
NEXT
  echo "المجلد: $OUT"
  ;;

pack)
  need openssl; need base64
  [ -f "$KEY" ] || { echo "ما في مفتاح بـ$KEY — شغّل المرحلة csr أولاً."; exit 1; }
  [ -f "$CER" ] || { echo "حط الشهادة المنزّلة باسم distribution.cer بـ$OUT"; exit 1; }

  PROFILE="$(find "$OUT" -maxdepth 1 -name '*.mobileprovision' | head -1)"
  [ -n "$PROFILE" ] || { echo "ما لقيت ملف .mobileprovision بـ$OUT"; exit 1; }

  # الشهادة بتنزل DER من آبل؛ منحوّلها PEM قبل الدمج
  openssl x509 -in "$CER" -inform DER -out "$OUT/ios.pem" -outform PEM 2>/dev/null \
    || openssl x509 -in "$CER" -out "$OUT/ios.pem" -outform PEM

  # تحقّق أن الشهادة فعلاً تخصّ هذا المفتاح، قبل ما نبني p12 لا يوقّع
  a=$(openssl x509 -noout -modulus -in "$OUT/ios.pem" | openssl md5)
  b=$(openssl rsa  -noout -modulus -in "$KEY"         | openssl md5)
  [ "$a" = "$b" ] || { echo "الشهادة لا تطابق المفتاح الخاص — نزّلت شهادة من CSR ثاني."; exit 1; }
  echo "الشهادة تطابق المفتاح ✓"

  read -rsp "كلمة سر لحماية ملف p12 (لا تتركها فاضية): " PW; echo
  [ -n "$PW" ] || { echo "كلمة السر مطلوبة — الرفع بيرفض p12 بدون كلمة سر."; exit 1; }

  openssl pkcs12 -export -inkey "$KEY" -in "$OUT/ios.pem" -out "$P12" \
    -passout "pass:$PW" -legacy 2>/dev/null \
    || openssl pkcs12 -export -inkey "$KEY" -in "$OUT/ios.pem" -out "$P12" -passout "pass:$PW"
  chmod 600 "$P12"

  base64 -w 0 "$P12"     > "$OUT/IOS_CERTIFICATE_BASE64.txt" 2>/dev/null \
    || base64 -i "$P12"  > "$OUT/IOS_CERTIFICATE_BASE64.txt"
  base64 -w 0 "$PROFILE"    > "$OUT/IOS_PROFILE_BASE64.txt" 2>/dev/null \
    || base64 -i "$PROFILE" > "$OUT/IOS_PROFILE_BASE64.txt"

  cat <<NEXT

جاهز. حط هالقيم بـGitHub ← Settings ← Secrets and variables ← Actions:

  IOS_CERTIFICATE_BASE64     محتوى $OUT/IOS_CERTIFICATE_BASE64.txt
  IOS_PROFILE_BASE64         محتوى $OUT/IOS_PROFILE_BASE64.txt
  IOS_CERTIFICATE_PASSWORD   كلمة السر يلي كتبتها هلق

بعدها خذ نسخة احتياطية من المجلد $OUT خارج الجهاز (المفتاح ios.key
بالذات — بدونه بتعيد كل شي من الصفر)، ولا ترفعه على git أبداً.
NEXT
  ;;

*)
  echo "الاستعمال: bash scripts/make-ios-signing.sh csr|pack"
  exit 1
  ;;
esac
