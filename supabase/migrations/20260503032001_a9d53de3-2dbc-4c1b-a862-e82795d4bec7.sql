-- Profit margin overrides with hierarchy: package > game > global
CREATE TABLE public.profit_margins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('global', 'game', 'package')),
  game_code text,
  catalogue_name text,
  margin_percent numeric NOT NULL DEFAULT 0 CHECK (margin_percent >= 0 AND margin_percent <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Uniqueness per scope key
CREATE UNIQUE INDEX profit_margins_global_uniq
  ON public.profit_margins ((1)) WHERE scope = 'global';
CREATE UNIQUE INDEX profit_margins_game_uniq
  ON public.profit_margins (game_code) WHERE scope = 'game';
CREATE UNIQUE INDEX profit_margins_package_uniq
  ON public.profit_margins (game_code, catalogue_name) WHERE scope = 'package';

ALTER TABLE public.profit_margins ENABLE ROW LEVEL SECURITY;

-- Anyone can read margins (used to compute prices for Shop)
CREATE POLICY "Anyone can view profit margins"
  ON public.profit_margins FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert profit margins"
  ON public.profit_margins FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update profit margins"
  ON public.profit_margins FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete profit margins"
  ON public.profit_margins FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_profit_margins_updated_at
BEFORE UPDATE ON public.profit_margins
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a 0% global default
INSERT INTO public.profit_margins (scope, margin_percent) VALUES ('global', 0);
