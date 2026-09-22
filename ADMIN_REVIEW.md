# Admin alignment with bank-transfer commerce

Reviewed 2026-09-22. Applies to the shared web/native admin screen.

- Products: validated edits, integer inventory, order quantity wording.
- Draw rounds: atomic activation, confirmed target required before winner selection, purchase-threshold wording.
- Orders: full line items and amount breakdown, fixed ticket entitlement, receipt review, explicit rejection and stock release.
- Fulfillment: confirmed payment required; forward shipping transitions only; rejection separate from shipping.
- Bank accounts: all required bank details checked; incomplete accounts cannot be enabled.
- Dashboard and sales chart: confirmed revenue and paid-product quantities; customer conversion bounded by distinct buyers.
- Customers: confirmed spending totals and working CSV export URLs.
- Coupons: validated percentages, limits and edits.
- Support, notifications and activity: authenticated endpoints checked; query errors display retry controls.
- Account settings: current password verified before email/password changes, input validation and refreshed signed-in profile.
- Removed campaign terminology in commerce admin and confirmed wallet/referral/legacy campaign endpoints remain unavailable.

Validation: 25 commerce regression checks, TypeScript, server bundle and Expo web export. Tests run locally with PGlite and mocked external mail/session dependencies. Live production, signed iOS/Android builds and device interactions are not certified by these checks. Deploy the updated main branch to apply the changes.
