
-- Harden the wallet balance function with admin-only access + positive amount check
-- Allow service role calls (auth.uid() is NULL) and admin calls
CREATE OR REPLACE FUNCTION public.increment_wallet_balance(p_user_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role calls have auth.uid() = NULL, allow those through
  -- For authenticated users, require admin role
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can modify wallet balances';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  UPDATE profiles
  SET wallet_balance = wallet_balance + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- Explicit deny for client-side notification inserts (service role bypasses RLS)
CREATE POLICY "Only service role can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (false);
