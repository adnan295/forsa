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

## Run

The workflow file must also exist on the repository default branch before GitHub
exposes its Run workflow button. Integrate the reviewed workflow changes first;
select `hostinger-vps-migration` as the source branch containing the NAYVO updates.
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
