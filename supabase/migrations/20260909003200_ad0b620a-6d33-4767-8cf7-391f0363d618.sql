CREATE OR REPLACE FUNCTION public.get_top_buyers()
RETURNS TABLE (
  user_id uuid,
  name text,
  avatar_url text,
  total_spend numeric,
  is_owner boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH spend AS (
    SELECT o.user_id, SUM(o.price)::numeric AS total_spend
    FROM public.game_orders o
    WHERE o.status = 'approved'
    GROUP BY o.user_id
    HAVING SUM(o.price) > 0
  ),
  admins AS (
    SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin'::app_role
  ),
  ranked AS (
    SELECT s.user_id, s.total_spend, false AS is_owner
    FROM spend s
    WHERE s.user_id NOT IN (SELECT a.user_id FROM admins a)
    ORDER BY s.total_spend DESC
    LIMIT 10
  ),
  owner AS (
    SELECT a.user_id, COALESCE(s.total_spend, 0)::numeric AS total_spend, true AS is_owner
    FROM admins a
    LEFT JOIN spend s ON s.user_id = a.user_id
    ORDER BY COALESCE(s.total_spend, 0) DESC
    LIMIT 1
  ),
  combined AS (
    SELECT * FROM owner
    UNION ALL
    SELECT * FROM ranked
  )
  SELECT c.user_id,
         COALESCE(p.name, 'User') AS name,
         p.avatar_url,
         c.total_spend,
         c.is_owner
  FROM combined c
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  ORDER BY c.is_owner DESC, c.total_spend DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_buyers() TO anon, authenticated, service_role;