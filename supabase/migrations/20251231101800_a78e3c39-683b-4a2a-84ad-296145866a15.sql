-- Update the check_booking_overlap function to include shared studio group blocking
CREATE OR REPLACE FUNCTION public.check_booking_overlap()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  full_buyout_studio_id uuid;
  has_full_buyout boolean := false;
  has_regular_booking boolean := false;
BEGIN
  -- Skip validation for cancelled bookings
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Get the Full Studio Buyout studio ID if it exists
  SELECT id INTO full_buyout_studio_id FROM studios WHERE type = 'full_studio_buyout' LIMIT 1;

  -- Check if there's any overlapping booking for the same studio
  IF EXISTS (
    SELECT 1 FROM studio_bookings
    WHERE studio_id = NEW.studio_id
      AND booking_date = NEW.booking_date
      AND status != 'cancelled'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND NOT (NEW.end_time <= start_time OR NEW.start_time >= end_time)
  ) THEN
    RAISE EXCEPTION 'Booking overlaps with an existing booking for this studio';
  END IF;

  -- If booking a Full Studio Buyout, check all other studios for conflicts
  IF full_buyout_studio_id IS NOT NULL AND NEW.studio_id = full_buyout_studio_id THEN
    IF EXISTS (
      SELECT 1 FROM studio_bookings
      WHERE studio_id != NEW.studio_id
        AND booking_date = NEW.booking_date
        AND status != 'cancelled'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND NOT (NEW.end_time <= start_time OR NEW.start_time >= end_time)
    ) THEN
      RAISE EXCEPTION 'Full Studio Buyout conflicts with existing bookings in other studios';
    END IF;
  END IF;

  -- If booking a regular studio, check if Full Studio Buyout exists for that time
  IF full_buyout_studio_id IS NOT NULL AND NEW.studio_id != full_buyout_studio_id THEN
    IF EXISTS (
      SELECT 1 FROM studio_bookings
      WHERE studio_id = full_buyout_studio_id
        AND booking_date = NEW.booking_date
        AND status != 'cancelled'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND NOT (NEW.end_time <= start_time OR NEW.start_time >= end_time)
    ) THEN
      RAISE EXCEPTION 'This time slot is reserved for a Full Studio Buyout';
    END IF;
  END IF;

  -- NEW: Check if booking conflicts with another studio in the same shared group
  IF EXISTS (
    SELECT 1 FROM studio_bookings sb
    JOIN shared_studio_group_members m1 ON sb.studio_id = m1.studio_id
    JOIN shared_studio_group_members m2 ON m1.group_id = m2.group_id AND m2.studio_id = NEW.studio_id
    WHERE sb.studio_id != NEW.studio_id
      AND sb.booking_date = NEW.booking_date
      AND sb.status != 'cancelled'
      AND sb.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND NOT (NEW.end_time <= sb.start_time OR NEW.start_time >= sb.end_time)
  ) THEN
    RAISE EXCEPTION 'Booking conflicts with a studio in the same shared group';
  END IF;

  RETURN NEW;
END;
$function$;