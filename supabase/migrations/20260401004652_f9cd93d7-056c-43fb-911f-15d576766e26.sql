-- Add 'reseller' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'reseller';

-- Create bot_runs table for tracking bot executions
CREATE TABLE public.bot_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_name text NOT NULL,
  bot_index integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  error_message text,
  items_updated integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bot_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view bot runs"
  ON public.bot_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert bot runs"
  ON public.bot_runs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bot runs"
  ON public.bot_runs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add provider_price column to product_items for tracking original prices
ALTER TABLE public.product_items ADD COLUMN IF NOT EXISTS provider_price numeric DEFAULT 0;

-- Add reseller_discount column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_reseller boolean DEFAULT false;