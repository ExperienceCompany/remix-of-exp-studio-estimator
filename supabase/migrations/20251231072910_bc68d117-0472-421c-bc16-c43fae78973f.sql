-- Add columns for tracking repeat booking information
ALTER TABLE public.studio_bookings
ADD COLUMN IF NOT EXISTS repeat_series_id UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS repeat_pattern TEXT DEFAULT NULL;

-- Add index for efficient series lookups
CREATE INDEX IF NOT EXISTS idx_studio_bookings_repeat_series_id 
ON public.studio_bookings(repeat_series_id) 
WHERE repeat_series_id IS NOT NULL;