"""Install an existing distribution identity on an ephemeral GitHub macOS runner."""
import base64
import datetime
import os
from pathlib import Path
import plistlib
import re
import secrets
import shutil
import subprocess

os.umask(0o077)
temp = Path(os.environ['RUNNER_TEMP'])
certificate = temp / 'nayvo-signing.p12'
profile = temp / 'nayvo.mobileprovision'
keychain = temp / 'nayvo-signing.keychain-db'
certificate.write_bytes(base64.b64decode(os.environ['IOS_CERTIFICATE_BASE64']))
profile.write_bytes(base64.b64decode(os.environ['IOS_PROFILE_BASE64']))
decoded = subprocess.check_output(['security', 'cms', '-D', '-i', str(profile)])
data = plistlib.loads(decoded)
entitlements = data['Entitlements']
expected = data['ApplicationIdentifierPrefix'][0] + '.app.replit.forsa'
if entitlements.get('application-identifier') != expected:
    raise SystemExit('Provisioning profile must be for app.replit.forsa')
if data.get('ProvisionedDevices') or data.get('ProvisionsAllDevices') or entitlements.get('get-task-allow'):
    raise SystemExit('Use an App Store distribution provisioning profile')
if entitlements.get('aps-environment') != 'production':
    raise SystemExit('Profile must include production Push Notifications')
if data['ExpirationDate'] <= datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None):
    raise SystemExit('Provisioning profile expired')
uuid = data['UUID']
team = data['TeamIdentifier'][0]
if not re.fullmatch(r'[A-Fa-f0-9-]+', uuid) or not re.fullmatch(r'[A-Z0-9]+', team):
    raise SystemExit('Invalid profile identifiers')
password = secrets.token_hex(32)
def security(*args):
    subprocess.run(['security', *args], check=True, stdout=subprocess.DEVNULL)
security('create-keychain', '-p', password, str(keychain))
security('set-keychain-settings', '-lut', '21600', str(keychain))
security('unlock-keychain', '-p', password, str(keychain))
security('import', str(certificate), '-P', os.environ['IOS_CERTIFICATE_PASSWORD'],
         '-A', '-t', 'cert', '-f', 'pkcs12', '-k', str(keychain))
security('set-key-partition-list', '-S', 'apple-tool:,apple:', '-k', password, str(keychain))
security('list-keychains', '-d', 'user', '-s', str(keychain))
identities = subprocess.check_output(['security', 'find-identity', '-v', '-p', 'codesigning', str(keychain)], text=True)
if '0 valid identities found' in identities:
    raise SystemExit('P12 contains no valid signing identity with private key')
for directory in ['Library/MobileDevice/Provisioning Profiles', 'Library/Developer/Xcode/UserData/Provisioning Profiles']:
    target = Path.home() / directory
    target.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(profile, target / (uuid + '.mobileprovision'))
with open(os.environ['GITHUB_ENV'], 'a') as output:
    output.write(f'IOS_TEAM_ID={team}\nIOS_PROFILE_UUID={uuid}\n')
print('Installed App Store signing identity and matching-app profile.')
