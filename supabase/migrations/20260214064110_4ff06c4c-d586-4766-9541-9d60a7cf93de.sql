
CREATE OR REPLACE FUNCTION public.increment_wallet_balance(p_user_id uuid, p_amount numeric)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE profiles
  SET wallet_balance = wallet_balance + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
$$;
