-- Create booking_type enum
CREATE TYPE booking_type AS ENUM ('customer', 'internal', 'unavailable');

-- Create booking_status enum
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- Create calendar_settings table for per-studio configuration
CREATE TABLE public.calendar_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  time_increment_minutes INTEGER NOT NULL DEFAULT 15,
  buffer_minutes INTEGER NOT NULL DEFAULT 15,
  min_booking_hours INTEGER NOT NULL DEFAULT 1,
  max_booking_hours INTEGER NOT NULL DEFAULT 8,
  advance_booking_days INTEGER NOT NULL DEFAULT 30,
  operating_start_time TIME NOT NULL DEFAULT '10:00:00',
  operating_end_time TIME NOT NULL DEFAULT '22:00:00',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(studio_id)
);

-- Create studio_bookings table for actual bookings
CREATE TABLE public.studio_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  booking_type booking_type NOT NULL DEFAULT 'customer',
  status booking_status NOT NULL DEFAULT 'pending',
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  notes TEXT,
  session_type TEXT,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blocked_dates table for studio closures
CREATE TABLE public.blocked_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  studio_id UUID REFERENCES public.studios(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.calendar_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

-- RLS for calendar_settings: Admins can manage, anyone can read
CREATE POLICY "Anyone can read calendar_settings"
ON public.calendar_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage calendar_settings"
ON public.calendar_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS for studio_bookings: Anyone can create customer bookings, staff can manage all
CREATE POLICY "Anyone can read studio_bookings"
ON public.studio_bookings
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create customer bookings"
ON public.studio_bookings
FOR INSERT
WITH CHECK (booking_type = 'customer');

CREATE POLICY "Staff can manage all bookings"
ON public.studio_bookings
FOR ALL
USING (is_staff_or_admin(auth.uid()))
WITH CHECK (is_staff_or_admin(auth.uid()));

-- RLS for blocked_dates: Admins can manage, anyone can read
CREATE POLICY "Anyone can read blocked_dates"
ON public.blocked_dates
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage blocked_dates"
ON public.blocked_dates
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create indexes for better query performance
CREATE INDEX idx_studio_bookings_studio_date ON public.studio_bookings(studio_id, booking_date);
CREATE INDEX idx_studio_bookings_date ON public.studio_bookings(booking_date);
CREATE INDEX idx_blocked_dates_studio_date ON public.blocked_dates(studio_id, blocked_date);

-- Create updated_at triggers
CREATE TRIGGER update_calendar_settings_updated_at
BEFORE UPDATE ON public.calendar_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_studio_bookings_updated_at
BEFORE UPDATE ON public.studio_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default calendar settings for each existing studio
INSERT INTO public.calendar_settings (studio_id)
SELECT id FROM public.studios WHERE is_active = true;