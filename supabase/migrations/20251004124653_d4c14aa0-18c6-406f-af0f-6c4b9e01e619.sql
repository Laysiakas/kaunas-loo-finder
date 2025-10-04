-- Add image_url column to toilets table
ALTER TABLE public.toilets ADD COLUMN image_url text;

-- Create storage bucket for toilet images
INSERT INTO storage.buckets (id, name, public)
VALUES ('toilet-images', 'toilet-images', true);

-- Allow authenticated users to upload images
CREATE POLICY "Users can upload toilet images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'toilet-images' 
  AND auth.role() = 'authenticated'
);

-- Allow everyone to view toilet images
CREATE POLICY "Toilet images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'toilet-images');

-- Allow users to update their own uploads
CREATE POLICY "Users can update their own toilet images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'toilet-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own toilet images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'toilet-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);