
CREATE TABLE public.digital_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  service_id integer NOT NULL,
  service_name text NOT NULL,
  link text NOT NULL,
  quantity integer NOT NULL,
  charge numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  external_order_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.digital_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own digital orders"
  ON public.digital_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own digital orders"
  ON public.digital_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all digital orders"
  ON public.digital_orders FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update digital orders"
  ON public.digital_orders FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_digital_orders_updated_at
  BEFORE UPDATE ON public.digital_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
