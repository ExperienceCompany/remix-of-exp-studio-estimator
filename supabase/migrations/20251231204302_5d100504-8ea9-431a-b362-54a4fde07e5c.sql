-- Update the create_session_from_booking trigger to include quote details
CREATE OR REPLACE FUNCTION public.create_session_from_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  studio_type_val text;
  studio_name_val text;
  quote_selections jsonb;
  merged_json jsonb;
BEGIN
  -- Only create session when booking is confirmed
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
    
    -- Get studio type and name from studios table
    SELECT type, name INTO studio_type_val, studio_name_val 
    FROM public.studios WHERE id = NEW.studio_id;
    
    -- Get quote selections if quote_id exists
    IF NEW.quote_id IS NOT NULL THEN
      SELECT selections_json INTO quote_selections 
      FROM public.quotes WHERE id = NEW.quote_id;
    END IF;
    
    -- Build base booking JSON
    merged_json := jsonb_build_object(
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
      'sessionType', COALESCE(NEW.session_type, 'diy'),
      'source', 'calendar'
    );
    
    -- Merge quote data if available (quote data first, then booking data overlays)
    -- This preserves all add-ons, rates, crew allocation, service type, etc.
    IF quote_selections IS NOT NULL THEN
      merged_json := quote_selections || merged_json;
    END IF;
    
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
      merged_json,
      NEW.created_by,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;