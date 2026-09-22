"""Point the generated Android release build at the upload keystore."""
import base64
import os
import re
import subprocess
from pathlib import Path

gradle = Path('android/app/build.gradle')
keystore = Path('android/app/upload.keystore')

os.umask(0o077)
keystore.write_bytes(base64.b64decode(os.environ['ANDROID_KEYSTORE_BASE64']))

alias = os.environ['ANDROID_KEY_ALIAS']
store_password = os.environ['ANDROID_KEYSTORE_PASSWORD']
key_password = os.environ['ANDROID_KEY_PASSWORD']
if not alias or not store_password or not key_password:
    raise SystemExit('Keystore alias and passwords must not be empty')

# يفشل هنا بدل ما يفشل بعد بناء كامل بملف لا يقبله Play
probe = subprocess.run(
    ['keytool', '-list', '-keystore', str(keystore), '-alias', alias,
     '-storepass', store_password],
    capture_output=True, text=True)
if probe.returncode != 0:
    # تتجاهل ضجيج الـJVM حتى تصل رسالة keytool نفسها
    lines = [l.strip() for l in (probe.stderr + probe.stdout).splitlines()
             if l.strip() and 'JAVA_TOOL_OPTIONS' not in l]
    reason = next((l for l in lines if 'keytool error' in l or 'Exception' in l),
                  lines[-1] if lines else 'unknown error')
    raise SystemExit('Keystore does not open with this alias and password: ' + reason)

source = gradle.read_text()


def build_types(text: str) -> str:
    """The buildTypes block, which is the only place a build type is wired up."""
    start = text.index('    buildTypes {')
    return text[start:text.index('\n    }\n', start)]


# الترتيب مقصود: نعيد توجيه نوع البناء قبل حقن أي كتلة release أخرى،
# وإلا التقط التعبير النمطي الكتلة المحقونة وعدّل debug بالخطأ.
before = build_types(source)
patched_types, count = re.subn(
    r'(release \{\n(?:.*\n)*?\s*)signingConfig signingConfigs\.debug',
    r'\1signingConfig signingConfigs.release',
    before, count=1)
if count != 1:
    raise SystemExit('Could not repoint the release build type away from the debug key')
source = source.replace(before, patched_types, 1)

block = """    signingConfigs {
        release {
            storeFile file('upload.keystore')
            storePassword project.property('NAYVO_STORE_PASSWORD')
            keyAlias project.property('NAYVO_KEY_ALIAS')
            keyPassword project.property('NAYVO_KEY_PASSWORD')
        }
"""
source, count = re.subn(r'    signingConfigs \{\n', block, source, count=1)
if count != 1:
    raise SystemExit('Could not find the signingConfigs block to extend')

# تحقّق نهائي: كل نوع بناء موصول بمفتاحه، ولا واحد أخذ مكان الآخر
final = build_types(source)
release_part = final[final.index('        release {'):]
debug_part = final[final.index('        debug {'):final.index('        release {')]
if 'signingConfig signingConfigs.release' not in release_part:
    raise SystemExit('Release build type is still not signed with the upload key')
if 'signingConfig signingConfigs.debug' not in debug_part:
    raise SystemExit('Debug build type lost its own signing config')

gradle.write_text(source)

# تُنشر البصمة ليقارنها فحص ما بعد البناء بتوقيع الملف الناتج
listing = subprocess.run(
    ['keytool', '-list', '-v', '-keystore', str(keystore), '-alias', alias,
     '-storepass', store_password],
    capture_output=True, text=True, check=True).stdout
fingerprint = re.search(r'SHA256:\s*([0-9A-F:]+)', listing)
if not fingerprint:
    raise SystemExit('Could not read the upload certificate fingerprint')
with open(os.environ['GITHUB_ENV'], 'a') as output:
    output.write(f'NAYVO_UPLOAD_FINGERPRINT={fingerprint.group(1)}\n')

print(f'Release builds now sign with {keystore} using alias {alias}.')
print(f'Upload certificate SHA256: {fingerprint.group(1)}')
