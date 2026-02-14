

# Security Hardening Plan

This plan addresses all active security findings from the scan.

## Issues to Fix

1. **Wallet Balance Function Lacks Access Controls** (error) -- The `increment_wallet_balance` function can be called by any authenticated user via RPC, allowing arbitrary balance manipulation.

2. **Notifications Table Missing INSERT Policy** (info, but requested) -- No INSERT policy exists, making the security model implicit rather than explicit.

3. **Admin Route Lacks Client-Side Protection** (warn) -- Non-admin users can briefly see admin UI skeleton before redirect.

4. **Leaked Password Protection Disabled** (warn, infrastructure) -- Cannot be fixed through code; requires manual configuration.

## Changes

### 1. Database Migration

Add authorization and validation to `increment_wallet_balance` so it can only be called by admins, and add an explicit INSERT policy on notifications:

```sql
-- Harden the wallet balance function with admin-only access + positive amount check
CREATE OR REPLACE FUNCTION public.increment_wallet_balance(p_user_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
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

-- Explicit deny for client-side notification inserts (service role bypasses this)
CREATE POLICY "Only service role can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (false);
```

### 2. Admin Route Protection (src/App.tsx)

Wrap the `/admin` route with a guard component that checks auth and admin status before rendering, preventing any UI flash for non-admins.

Create a small `AdminRoute` wrapper that shows a loading spinner during verification and redirects non-admins immediately.

### 3. Security Findings Cleanup

After implementing fixes, delete the resolved findings from the scan:
- `increment_wallet_unchecked` (fixed with auth checks)
- `notifications_no_insert` (fixed with explicit policy)
- `admin_route_protection` (fixed with route guard)

Mark `SUPA_auth_leaked_password_protection` as needing manual action (cannot be fixed in code).

## Technical Details

- The `increment_wallet_balance` function switches from SQL to PL/pgSQL to support conditional logic
- The edge function already calls this via service role, but `auth.uid()` returns NULL for service role calls. We need to handle this: service role bypasses RLS but `auth.uid()` may be NULL. The fix: check if caller is service role OR admin.
- Actually, the edge function uses the service role key which bypasses RLS entirely, but RPC functions with SECURITY DEFINER run in their own context. We need to verify: when called via `supabaseAdmin` (service role), `auth.uid()` returns NULL. So the function must allow service-role calls too.

**Revised function logic:**
```sql
-- Allow if auth.uid() is NULL (service role) OR if caller is admin
IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
  RAISE EXCEPTION 'Only admins can modify wallet balances';
END IF;
```

This ensures:
- Service role calls (from edge functions) work (auth.uid() is NULL)
- Direct client RPC calls require admin role
- Non-admin authenticated users are blocked

### Files Modified
- **New migration SQL** -- hardens `increment_wallet_balance` + adds notifications INSERT policy
- **src/App.tsx** -- adds AdminRoute guard component
- **src/pages/Admin.tsx** -- minor cleanup (route guard handles initial protection)
- **supabase/functions/admin-actions/index.ts** -- no changes needed (already correct)

