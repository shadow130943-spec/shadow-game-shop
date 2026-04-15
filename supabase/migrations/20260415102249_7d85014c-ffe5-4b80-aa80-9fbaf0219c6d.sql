
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id integer NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  type text,
  rate numeric NOT NULL DEFAULT 0,
  selling_rate numeric NOT NULL DEFAULT 0,
  min integer NOT NULL DEFAULT 1,
  max integer NOT NULL DEFAULT 1,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active services"
ON public.services FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage services"
ON public.services FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_services_category ON public.services(category);
CREATE INDEX idx_services_service_id ON public.services(service_id);
