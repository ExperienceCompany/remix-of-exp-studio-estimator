-- Create a function to check for overlapping bookings
CREATE OR REPLACE FUNCTION check_booking_overlap()
RETURNS TRIGGER AS $$
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
  SELECT id INTO full_buyout_studio_id FROM studios WHERE type = 'full_buyout' LIMIT 1;

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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS prevent_booking_overlap ON studio_bookings;
CREATE TRIGGER prevent_booking_overlap
  BEFORE INSERT OR UPDATE ON studio_bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_booking_overlap();