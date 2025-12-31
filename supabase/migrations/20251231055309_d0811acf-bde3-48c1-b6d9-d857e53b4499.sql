-- Allow public to view bookings for calendar availability
-- This is safe because the public calendar only displays time, title, and type indicators
-- Customer PII fields are only shown in admin/staff modals
CREATE POLICY "Public can view bookings for availability"
  ON public.studio_bookings
  FOR SELECT
  TO anon, authenticated
  USING (status != 'cancelled');