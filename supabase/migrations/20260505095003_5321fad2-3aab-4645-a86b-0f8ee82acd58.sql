-- Payment methods table
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  holder text NOT NULL,
  logo_url text,
  color text NOT NULL DEFAULT 'bg-primary',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active payment methods"
  ON public.payment_methods FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert payment methods"
  ON public.payment_methods FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update payment methods"
  ON public.payment_methods FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete payment methods"
  ON public.payment_methods FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed existing payment methods
INSERT INTO public.payment_methods (name, phone, holder, color, sort_order) VALUES
  ('Wave Pay', '09680072956', 'Aung Si Moe', 'bg-yellow-400', 1),
  ('KBZ Pay', '09683245994', 'AUNG KYAW HEIN HTET', 'bg-red-600', 2);

-- Public bucket for payment logos
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-logos', 'payment-logos', true);

CREATE POLICY "Public can read payment logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-logos');

CREATE POLICY "Admins can upload payment logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-logos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update payment logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'payment-logos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete payment logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'payment-logos' AND public.has_role(auth.uid(), 'admin'::app_role));