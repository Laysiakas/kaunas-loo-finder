-- Add DELETE policy for toilets table
CREATE POLICY "Users can delete their own toilets"
ON public.toilets
FOR DELETE
USING (auth.uid() = created_by);

-- Add DELETE policy for profiles table
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = id);

-- Add storage bucket constraints for toilet-images
UPDATE storage.buckets 
SET 
  file_size_limit = 5242880,  -- 5MB limit
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE name = 'toilet-images';