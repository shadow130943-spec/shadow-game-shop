DROP POLICY IF EXISTS "Users can view their own avatar" ON storage.objects;

CREATE POLICY "Authenticated users can view avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');