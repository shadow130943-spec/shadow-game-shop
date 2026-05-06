-- Restore trigger to auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Restore trigger to auto-generate user_code on profile insert
DROP TRIGGER IF EXISTS generate_user_code_trigger ON public.profiles;
CREATE TRIGGER generate_user_code_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW
WHEN (NEW.user_code IS NULL)
EXECUTE FUNCTION public.generate_user_code();

-- Backfill missing profiles for existing auth users
INSERT INTO public.profiles (user_id, name, phone)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', 'User'),
  COALESCE(u.raw_user_meta_data->>'phone', u.email)
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL;

-- Updated_at trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();