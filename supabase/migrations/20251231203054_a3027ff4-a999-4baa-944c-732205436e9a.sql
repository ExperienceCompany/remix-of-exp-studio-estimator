-- Update trigger to include more booking data in sessions
CREATE OR REPLACE FUNCTION public.create_session_from_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  studio_type_val text;
  studio_name_val text;
BEGIN
  -- Only create session when booking is confirmed
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
    
    -- Get studio type and name from studios table
    SELECT type, name INTO studio_type_val, studio_name_val FROM public.studios WHERE id = NEW.studio_id;
    
    INSERT INTO public.sessions (
      session_type,
      status,
      original_total,
      selections_json,
      created_by,
      created_at
    ) VALUES (
      COALESCE(NEW.session_type, 'diy'),
      'pending',
      NEW.estimated_total,
      jsonb_build_object(
        'studioId', NEW.studio_id,
        'studioType', studio_type_val,
        'studioName', studio_name_val,
        'bookingId', NEW.id,
        'bookingDate', NEW.booking_date,
        'startTime', NEW.start_time,
        'endTime', NEW.end_time,
        'customerName', NEW.customer_name,
        'customerEmail', NEW.customer_email,
        'customerPhone', NEW.customer_phone,
        'title', NEW.title,
        'details', NEW.details,
        'peopleCount', NEW.people_count,
        'estimatedTotal', NEW.estimated_total,
        'sessionType', COALESCE(NEW.session_type, 'diy')
      ),
      NEW.created_by,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;