> The canonical iOS release path is Codemagic on main; see IOS_CODEMAGIC.md. This GitHub workflow is a manual fallback only.

# NAYVO iOS release from GitHub

The workflow builds the native Expo application on a GitHub macOS runner. It does
not require Replit or an Expo account. Keep the existing `app.replit.forsa` bundle
identifier. App Store Connect upload does not publish or submit the app for review.

## Repository secrets

- `ASC_KEY_ID`: App Store Connect API key ID.
- `ASC_ISSUER_ID`: team API issuer ID.
- `ASC_PRIVATE_KEY`: complete raw P8 content, including header and footer.
- `IOS_CERTIFICATE_BASE64`: base64 of an Apple Distribution P12 **with private key**.
- `IOS_CERTIFICATE_PASSWORD`: nonempty password protecting that P12.
- `IOS_PROFILE_BASE64`: base64 of an App Store Connect distribution provisioning
  profile for `app.replit.forsa`, using that certificate and production push notifications.

Never commit signing files. Keep a secure backup of the P12 and password.
On a Mac, `base64 -i /path/to/file | pbcopy` copies encoded file content directly
to the clipboard for pasting into GitHub Secrets. Do not send secrets in chat.
If the old certificate private key cannot be recovered, create a new Apple
Distribution certificate and matching profile without revoking unrelated certificates.

## Creating the signing material

`ASC_KEY_ID`, `ASC_ISSUER_ID` and `ASC_PRIVATE_KEY` are already set. The three
signing secrets are produced once and reused for every release.

### On a Mac

Export the Apple Distribution identity from Keychain Access as a `.p12` with a
password, download the App Store profile for `app.replit.forsa` from the
developer portal, then encode both:

```bash
base64 -i distribution.p12 | pbcopy      # IOS_CERTIFICATE_BASE64
base64 -i nayvo.mobileprovision | pbcopy # IOS_PROFILE_BASE64
```

### Without a Mac

A distribution certificate is just a signed key pair, so openssl is enough.

1. Generate a private key and a certificate signing request. Keep `ios.key`:
   the certificate is useless without it, and losing it means starting over.

   ```bash
   openssl genrsa -out ios.key 2048
   openssl req -new -key ios.key -out ios.csr \
     -subj "/emailAddress=<البريد>/CN=NAYVO Distribution/C=SY"
   ```

2. developer.apple.com → Certificates, Identifiers & Profiles → Certificates →
   **+** → **Apple Distribution** → upload `ios.csr` → download `distribution.cer`.
   Do not revoke certificates other builds still use.

3. Profiles → **+** → **App Store Connect** → App ID `app.replit.forsa` →
   select the certificate just created → download `nayvo.mobileprovision`.
   The App ID must have the Push Notifications capability enabled, because the
   application ships `aps-environment: production`.

4. Combine the certificate and its private key into a password-protected P12:

   ```bash
   openssl x509 -in distribution.cer -inform DER -out ios.pem -outform PEM
   openssl pkcs12 -export -inkey ios.key -in ios.pem -out distribution.p12
   ```

5. Encode both for GitHub (`-w 0` keeps the output on one line):

   ```bash
   base64 -w 0 distribution.p12 > cert.b64
   base64 -w 0 nayvo.mobileprovision > profile.b64
   ```

Add the three secrets under **Settings → Secrets and variables → Actions**:
`IOS_CERTIFICATE_BASE64` from `cert.b64`, `IOS_CERTIFICATE_PASSWORD` (the export
password, which must not be empty), and `IOS_PROFILE_BASE64` from `profile.b64`.

Back up `ios.key`, `distribution.p12` and the password somewhere outside the
working machine, and delete the local copies once the secrets are stored. Never
commit them and never paste them into a chat or an issue.

## Run

The workflow file must also exist on the repository default branch before GitHub
exposes its Run workflow button. Integrate the reviewed workflow changes first;
select `main` as the source branch containing the NAYVO updates.
Do not build the older application from main by accident.

1. Confirm latest published version and uploaded build numbers in App Store Connect.
2. Actions > NAYVO iOS upload > Run workflow.
3. Enter a new three-part version and unused numeric build number.
4. Leave upload off for a signed IPA artifact only, or enable it to upload to
   App Store Connect. Concurrent releases are serialized.
5. Confirm processing succeeds in TestFlight, test the native app, update the
   NAYVO store listing, attach the build to a new version and submit for review.

The workflow validates required secrets before installing dependencies. Signing
material lives in the ephemeral runner and is removed in the final cleanup step.
Only the signed IPA is retained as a GitHub artifact for seven days.

Status: configuration prepared; a real macOS signed build and App Store upload
still require the signing secrets and have not yet been verified.
