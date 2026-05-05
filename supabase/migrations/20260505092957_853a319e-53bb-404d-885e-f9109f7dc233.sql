
-- 1. Lock down user_roles: only service role / admins via direct SQL
CREATE POLICY "No client inserts on user_roles"
ON public.user_roles FOR INSERT
WITH CHECK (false);

CREATE POLICY "No client updates on user_roles"
ON public.user_roles FOR UPDATE
USING (false);

CREATE POLICY "No client deletes on user_roles"
ON public.user_roles FOR DELETE
USING (false);

-- 2. Drop duplicate screenshots upload policy
DROP POLICY IF EXISTS "Users can upload screenshots" ON storage.objects;

-- 3. Revoke EXECUTE on sensitive SECURITY DEFINER functions from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.increment_wallet_balance(uuid, numeric) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
-- has_role is needed by RLS policies which run as the calling role; keep authenticated execute
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
