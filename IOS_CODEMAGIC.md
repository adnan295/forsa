# NAYVO iOS upload through Codemagic

Select branch `hostinger-vps-migration` and scan for the root `codemagic.yaml`.
The workflow is `NAYVO - iOS upload`. No Expo account is required.

One-time setup in the same Codemagic account/team as the application:

1. Add an Apple Developer Portal integration named exactly `NAYVO`, using the existing App Store Connect App Manager API key. Upload the private `.p8` directly to Codemagic; do not commit it.
2. Under Code signing identities, generate an Apple Distribution certificate using that integration. Download and securely retain its private-key backup, and upload it to Codemagic if required by the UI. Do not revoke existing certificates used by other builds.
3. Create/fetch an App Store provisioning profile for `app.replit.forsa` matching that certificate, including the app's Push Notifications capability. The YAML selects matching uploaded signing assets by bundle ID and distribution type.
4. Check the existing app's version and latest uploaded build in App Store Connect. Start the workflow with the intended release version and a new higher build number. The inputs deliberately have no guessed defaults.

The workflow installs dependencies, generates the Expo iOS project, signs it, and uploads the IPA to App Store Connect. It does not submit for beta review or App Store review. Once Apple processes the build, complete export-compliance information if requested, test through TestFlight, then select the build for the existing app's update and submit for review.

The bundle identifier stays `app.replit.forsa`. The production API domain is `nayvo.store`. Repository configuration has been parsed locally; a signed build and upload must still be verified on Codemagic with the account's signing assets.

References:
- https://docs.codemagic.io/yaml-quick-start/building-a-react-native-app/
- https://docs.codemagic.io/yaml-code-signing/signing-ios/
- https://docs.codemagic.io/yaml-publishing/app-store-connect/
