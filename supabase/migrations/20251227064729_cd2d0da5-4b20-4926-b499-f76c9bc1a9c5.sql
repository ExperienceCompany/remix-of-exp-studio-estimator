-- Add new columns to studios table
ALTER TABLE public.studios 
ADD COLUMN IF NOT EXISTS thumbnail_url text,
ADD COLUMN IF NOT EXISTS calendar_color text DEFAULT '#3b82f6';

-- Create storage bucket for studio images
INSERT INTO storage.buckets (id, name, public)
VALUES ('studio-images', 'studio-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view studio images
CREATE POLICY "Public can view studio images"
ON storage.objects FOR SELECT
USING (bucket_id = 'studio-images');

-- Only admins can upload studio images
CREATE POLICY "Admins can upload studio images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'studio-images' AND has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update studio images
CREATE POLICY "Admins can update studio images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'studio-images' AND has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete studio images
CREATE POLICY "Admins can delete studio images"
ON storage.objects FOR DELETE
USING (bucket_id = 'studio-images' AND has_role(auth.uid(), 'admin'::app_role));