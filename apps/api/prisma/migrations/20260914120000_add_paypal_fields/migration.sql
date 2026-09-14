-- Add PayPal subscription tracking to Subscription.
-- Additive and nullable, so existing Paystack and Lemon Squeezy rows are untouched.

ALTER TABLE "Subscription" ADD COLUMN "paypalSubscriptionId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "billingInterval" TEXT;

-- One workspace per PayPal subscription; also gives the webhook a fast lookup
-- when a renewal event arrives without custom_id.
CREATE UNIQUE INDEX "Subscription_paypalSubscriptionId_key"
  ON "Subscription"("paypalSubscriptionId");
