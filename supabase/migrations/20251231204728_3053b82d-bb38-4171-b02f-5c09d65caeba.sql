-- Backfill existing sessions with complete booking and quote data
UPDATE sessions s
SET selections_json = COALESCE(q.selections_json, '{}'::jsonb) || jsonb_build_object(
  'studioId', b.studio_id,
  'studioType', st.type,
  'studioName', st.name,
  'bookingId', b.id,
  'bookingDate', b.booking_date,
  'startTime', b.start_time,
  'endTime', b.end_time,
  'customerName', b.customer_name,
  'customerEmail', b.customer_email,
  'customerPhone', b.customer_phone,
  'title', b.title,
  'details', b.details,
  'notes', b.notes,
  'peopleCount', b.people_count,
  'estimatedTotal', b.estimated_total,
  'sessionType', COALESCE(b.session_type, 'diy'),
  'source', 'calendar'
),
original_total = COALESCE(s.original_total, b.estimated_total, q.customer_total)
FROM studio_bookings b
JOIN studios st ON b.studio_id = st.id
LEFT JOIN quotes q ON b.quote_id = q.id
WHERE (s.selections_json->>'bookingId')::uuid = b.id;

-- Update the trigger to include notes field
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
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
    
    SELECT type, name INTO studio_type_val, studio_name_val 
    FROM public.studios WHERE id = NEW.studio_id;
    
    IF NEW.quote_id IS NOT NULL THEN
      SELECT selections_json INTO quote_selections 
      FROM public.quotes WHERE id = NEW.quote_id;
    END IF;
    
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
      'notes', NEW.notes,
      'peopleCount', NEW.people_count,
      'estimatedTotal', NEW.estimated_total,
      'sessionType', COALESCE(NEW.session_type, 'diy'),
      'source', 'calendar'
    );
    
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