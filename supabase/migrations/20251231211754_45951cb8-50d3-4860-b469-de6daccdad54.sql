-- Update the trigger function to always populate holder info
CREATE OR REPLACE FUNCTION public.create_session_from_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  studio_type_val text;
  studio_name_val text;
  quote_selections jsonb;
  merged_json jsonb;
  creator_name_val text;
  creator_email_val text;
  creator_phone_val text;
  creator_role_val text;
  holder_name_val text;
  holder_email_val text;
  holder_phone_val text;
  holder_role_val text;
BEGIN
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
    
    SELECT type, name INTO studio_type_val, studio_name_val 
    FROM public.studios WHERE id = NEW.studio_id;
    
    IF NEW.quote_id IS NOT NULL THEN
      SELECT selections_json INTO quote_selections 
      FROM public.quotes WHERE id = NEW.quote_id;
    END IF;
    
    -- Get creator info from profiles
    IF NEW.created_by IS NOT NULL THEN
      SELECT full_name, email, phone INTO creator_name_val, creator_email_val, creator_phone_val
      FROM public.profiles WHERE id = NEW.created_by;
      
      -- Get creator role
      SELECT role::text INTO creator_role_val
      FROM public.user_roles WHERE user_id = NEW.created_by
      ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'staff' THEN 2 ELSE 3 END
      LIMIT 1;
    END IF;
    
    -- Determine holder info: use customer fields if available, otherwise use creator
    IF NEW.customer_name IS NOT NULL AND NEW.customer_name != '' THEN
      holder_name_val := NEW.customer_name;
      holder_email_val := NEW.customer_email;
      holder_phone_val := NEW.customer_phone;
      holder_role_val := 'customer';
    ELSE
      holder_name_val := creator_name_val;
      holder_email_val := creator_email_val;
      holder_phone_val := creator_phone_val;
      holder_role_val := creator_role_val;
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
      'holderName', holder_name_val,
      'holderEmail', holder_email_val,
      'holderPhone', holder_phone_val,
      'holderRole', holder_role_val,
      'title', NEW.title,
      'details', NEW.details,
      'notes', NEW.notes,
      'peopleCount', NEW.people_count,
      'estimatedTotal', NEW.estimated_total,
      'sessionType', COALESCE(NEW.session_type, 'diy'),
      'source', 'calendar',
      'createdBy', NEW.created_by,
      'creatorName', creator_name_val,
      'creatorRole', creator_role_val
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
$function$;

-- Backfill existing sessions with holder info
UPDATE public.sessions s
SET selections_json = s.selections_json || jsonb_build_object(
  'holderName', COALESCE(
    b.customer_name,
    p.full_name,
    s.selections_json->>'customerName',
    'Unknown'
  ),
  'holderEmail', COALESCE(
    b.customer_email,
    p.email,
    s.selections_json->>'customerEmail'
  ),
  'holderPhone', COALESCE(
    b.customer_phone,
    p.phone,
    s.selections_json->>'customerPhone'
  ),
  'holderRole', CASE 
    WHEN b.customer_name IS NOT NULL AND b.customer_name != '' THEN 'customer'
    WHEN ur.role IS NOT NULL THEN ur.role::text
    ELSE 'user'
  END
)
FROM public.studio_bookings b
LEFT JOIN public.profiles p ON b.created_by = p.id
LEFT JOIN public.user_roles ur ON b.created_by = ur.user_id
WHERE s.selections_json->>'bookingId' = b.id::text
  AND (s.selections_json->>'holderName' IS NULL OR s.selections_json->>'holderName' = '');