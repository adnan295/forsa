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

-- Admin toggles for the periodic reminders. Absent keys mean enabled.
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY NOT NULL,
  value text NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);
