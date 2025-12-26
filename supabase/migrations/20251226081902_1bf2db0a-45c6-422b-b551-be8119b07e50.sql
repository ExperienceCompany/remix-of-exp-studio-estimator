-- Create function to increment lead count when quote is completed
CREATE OR REPLACE FUNCTION public.increment_affiliate_lead_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only increment if:
  -- 1. Status changed to 'completed'
  -- 2. Quote has an affiliate_code
  -- 3. Previous status was not 'completed' (prevent double counting)
  IF NEW.status = 'completed' 
     AND NEW.affiliate_code IS NOT NULL 
     AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    UPDATE public.profiles
    SET lead_count = lead_count + 1
    WHERE affiliate_code = NEW.affiliate_code;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on quotes table
CREATE TRIGGER on_quote_completed_increment_lead
  AFTER UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_affiliate_lead_count();