
-- Add phone and user_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_code text UNIQUE;

-- Generate user_code automatically
CREATE OR REPLACE FUNCTION public.generate_user_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code text;
BEGIN
  new_code := 'GT' || LPAD(FLOOR(RANDOM() * 999999 + 1)::text, 6, '0');
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE user_code = new_code) LOOP
    new_code := 'GT' || LPAD(FLOOR(RANDOM() * 999999 + 1)::text, 6, '0');
  END LOOP;
  NEW.user_code := new_code;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_user_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
WHEN (NEW.user_code IS NULL)
EXECUTE FUNCTION public.generate_user_code();

-- Update handle_new_user to store phone
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create app_role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS for user_roles: users can read their own roles, admins can read all
CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Create deposits table
CREATE TABLE public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  screenshot_url text NOT NULL,
  status text NOT NULL DEFAULT 'processing',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- Users can view own deposits, admins can view all
CREATE POLICY "Users can view own deposits" ON public.deposits
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deposits" ON public.deposits
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all deposits" ON public.deposits
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update deposits" ON public.deposits
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update any profile (for transfers)
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at on deposits
CREATE TRIGGER update_deposits_updated_at
BEFORE UPDATE ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('screenshots', 'screenshots', true);

-- Storage policies
CREATE POLICY "Users can upload screenshots" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view screenshots" ON storage.objects
FOR SELECT USING (bucket_id = 'screenshots');

-- Enable realtime for deposits
ALTER PUBLICATION supabase_realtime ADD TABLE public.deposits;
