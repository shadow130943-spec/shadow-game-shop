-- Make screenshots bucket private
UPDATE storage.buckets SET public = false WHERE id = 'screenshots';

-- Drop the overly permissive policy if it exists
DROP POLICY IF EXISTS "Anyone can view screenshots" ON storage.objects;

-- Users can upload to their own folder
CREATE POLICY "Users can upload own screenshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own screenshots
CREATE POLICY "Users can view own screenshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can view all screenshots
CREATE POLICY "Admins can view all screenshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'screenshots' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);