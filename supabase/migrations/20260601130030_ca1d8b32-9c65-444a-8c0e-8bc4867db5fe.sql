
-- Game logos (per game_code)
CREATE TABLE public.game_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_code text NOT NULL UNIQUE,
  logo_url text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.game_assets TO anon, authenticated;
GRANT ALL ON public.game_assets TO service_role;
ALTER TABLE public.game_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view game assets" ON public.game_assets FOR SELECT USING (true);
CREATE POLICY "Admins manage game assets - ins" ON public.game_assets FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage game assets - upd" ON public.game_assets FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage game assets - del" ON public.game_assets FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Branding (hero banner, site logo, favicon)
CREATE TABLE public.branding_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  image_url text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.branding_assets TO anon, authenticated;
GRANT ALL ON public.branding_assets TO service_role;
ALTER TABLE public.branding_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view branding" ON public.branding_assets FOR SELECT USING (true);
CREATE POLICY "Admins manage branding - ins" ON public.branding_assets FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage branding - upd" ON public.branding_assets FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage branding - del" ON public.branding_assets FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Package overrides (rename / reprice / hide individual packages)
CREATE TABLE public.package_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_code text NOT NULL,
  catalogue_name text NOT NULL,
  display_name text,
  price_mmk_override numeric,
  is_hidden boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_code, catalogue_name)
);
GRANT SELECT ON public.package_overrides TO anon, authenticated;
GRANT ALL ON public.package_overrides TO service_role;
ALTER TABLE public.package_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view package overrides" ON public.package_overrides FOR SELECT USING (true);
CREATE POLICY "Admins manage overrides - ins" ON public.package_overrides FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage overrides - upd" ON public.package_overrides FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage overrides - del" ON public.package_overrides FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Public storage bucket for branding + game logos
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read branding bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

CREATE POLICY "Admins upload branding"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update branding"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete branding"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));
