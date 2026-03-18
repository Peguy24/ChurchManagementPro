ALTER TABLE public.subscription_discounts 
  ADD COLUMN previous_stripe_subscription_id text DEFAULT NULL,
  ADD COLUMN previous_plan text DEFAULT NULL,
  ADD COLUMN previous_price_id text DEFAULT NULL;