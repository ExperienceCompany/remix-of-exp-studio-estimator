-- Create function to auto-create session from confirmed booking
CREATE OR REPLACE FUNCTION public.create_session_from_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only create session when booking is confirmed (new or updated to confirmed)
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
    INSERT INTO public.sessions (
      session_type,
      status,
      selections_json,
      created_by,
      created_at
    ) VALUES (
      COALESCE(NEW.session_type, 'diy'),
      'pending',
      jsonb_build_object(
        'studioId', NEW.studio_id,
        'bookingId', NEW.id,
        'bookingDate', NEW.booking_date,
        'startTime', NEW.start_time,
        'endTime', NEW.end_time,
        'customerName', NEW.customer_name,
        'customerEmail', NEW.customer_email
      ),
      NEW.created_by,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on studio_bookings
DROP TRIGGER IF EXISTS on_booking_confirmed ON public.studio_bookings;
CREATE TRIGGER on_booking_confirmed
  AFTER INSERT OR UPDATE ON public.studio_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_session_from_booking();