# NAYVO repository guidance

Read PROJECT_GUIDE.md and RELEASE.md before making changes.
main is the canonical integration and release branch. Historical branches are not release sources.
The approved design is the shared Expo UI in app/ and components/ with tokens in constants/colors.ts.
Preserve app.replit.forsa (iOS) and today.forsa (Android).
Do not overwrite shared UI with legacy campaign screens or edit generated build outputs.
The user explicitly authorized deleting legacy application data on 2026-09-22. See RELEASE.md for the reset procedure. Back up first, verify the exact app database target, and preserve signing assets, service secrets and backups. Do not require preserving old orders/tickets as a release prerequisite.
Validate changes locally; report separately code committed, builds tested, and releases deployed.

