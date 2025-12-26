-- Add details column to studio_bookings (separate from notes)
ALTER TABLE public.studio_bookings 
ADD COLUMN details TEXT;