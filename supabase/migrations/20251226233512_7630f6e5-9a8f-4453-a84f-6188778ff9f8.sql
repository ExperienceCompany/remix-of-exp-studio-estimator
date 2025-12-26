-- Add title and people_count columns to studio_bookings
ALTER TABLE public.studio_bookings 
ADD COLUMN title TEXT,
ADD COLUMN people_count INTEGER DEFAULT 1;