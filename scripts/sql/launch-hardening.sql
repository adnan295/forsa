-- Additive migration; run while the application is stopped, inside one transaction.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_key text;
CREATE UNIQUE INDEX IF NOT EXISTS orders_checkout_key_unique ON orders(checkout_key);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS expected_tickets integer;
-- Older pending orders did not store the promise; derive once using the existing draw rate.
UPDATE orders SET expected_tickets = CASE WHEN tickets_awarded > 0 THEN tickets_awarded ELSE
  floor(ticket_eligible_amount / coalesce((SELECT nullif(ticket_price, 0) FROM draws WHERE status IN ('active','ready_to_draw') ORDER BY sort_order, created_at LIMIT 1), 10))::integer END
WHERE expected_tickets IS NULL;
ALTER TABLE orders ALTER COLUMN expected_tickets SET DEFAULT 0;
ALTER TABLE orders ALTER COLUMN expected_tickets SET NOT NULL;

-- Wallet removed at the owner's request. Deployment takes a database backup first.
-- Do not silently change existing paid order totals.
DROP TABLE IF EXISTS wallet_transactions;
ALTER TABLE users DROP COLUMN IF EXISTS wallet_balance;
ALTER TABLE orders DROP COLUMN IF EXISTS wallet_amount;
UPDATE payment_methods SET enabled = false WHERE lower(name) ~ 'cash|cod|sham' OR coalesce(name_ar, '') ~ 'شام|عند الاستلام';

-- Referral system removed at the owner's request.
ALTER TABLE users DROP COLUMN IF EXISTS referral_code;
ALTER TABLE users DROP COLUMN IF EXISTS referred_by;

-- Admin-designed home banner per round; the ticket counter is drawn over it.
ALTER TABLE draws ADD COLUMN IF NOT EXISTS banner_image_url text;

-- Admin toggles for the periodic reminders. Absent keys mean enabled.
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY NOT NULL,
  value text NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

-- Sign in with Apple / Google: external identities linked to a user.
CREATE TABLE IF NOT EXISTS user_identities (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  subject text NOT NULL,
  email text,
  apple_refresh_token text,
  created_at timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS user_identities_provider_subject_idx ON user_identities (provider, subject);

-- Compressed uploads served from /api/media/:id instead of inline data URLs.
CREATE TABLE IF NOT EXISTS media (
  id varchar PRIMARY KEY NOT NULL,
  mime_type text NOT NULL,
  data_base64 text NOT NULL,
  bytes integer NOT NULL,
  width integer,
  height integer,
  is_private boolean DEFAULT false NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL
);
