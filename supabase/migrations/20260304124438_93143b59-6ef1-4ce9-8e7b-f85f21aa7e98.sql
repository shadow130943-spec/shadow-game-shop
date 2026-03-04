
-- Create game_orders table
CREATE TABLE public.game_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_item_id UUID NOT NULL REFERENCES public.product_items(id),
  product_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  game_id TEXT NOT NULL,
  server_id TEXT,
  status TEXT NOT NULL DEFAULT 'processing',
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_orders ENABLE ROW LEVEL SECURITY;

-- Users can insert own orders
CREATE POLICY "Users can insert own game orders"
ON public.game_orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view own orders
CREATE POLICY "Users can view own game orders"
ON public.game_orders
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all orders
CREATE POLICY "Admins can view all game orders"
ON public.game_orders
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can update orders
CREATE POLICY "Admins can update game orders"
ON public.game_orders
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_game_orders_updated_at
BEFORE UPDATE ON public.game_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_orders;
