-- Fix PUBLIC_DATA_EXPOSURE: Customer Contact Data Publicly Accessible
-- Remove the overly permissive public read policy
DROP POLICY IF EXISTS "Anyone can read studio_bookings" ON public.studio_bookings;

-- Add policy for staff/admin to view all bookings (they need full access for calendar management)
CREATE POLICY "Staff can view all bookings"
ON public.studio_bookings
FOR SELECT
USING (is_staff_or_admin(auth.uid()));

-- Add policy for users to view their own bookings (by created_by)
CREATE POLICY "Users can view own bookings"
ON public.studio_bookings
FOR SELECT
USING (created_by = auth.uid());