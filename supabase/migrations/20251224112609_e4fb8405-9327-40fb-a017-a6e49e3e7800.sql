-- Create session_addons table for flat session fees (Yolobox, Event Setup, etc.)
CREATE TABLE public.session_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  flat_amount NUMERIC NOT NULL,
  addon_type TEXT NOT NULL, -- 'equipment', 'setup', etc.
  applies_to_session_type TEXT, -- 'diy', 'serviced', or NULL for both
  applies_to_studio_type TEXT, -- studio type restriction or NULL for all
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.session_addons ENABLE ROW LEVEL SECURITY;

-- Anyone can read session_addons
CREATE POLICY "Anyone can read session_addons"
ON public.session_addons
FOR SELECT
USING (true);

-- Admins can manage session_addons
CREATE POLICY "Admins can manage session_addons"
ON public.session_addons
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert the known add-ons
INSERT INTO public.session_addons (name, description, flat_amount, addon_type, applies_to_session_type, applies_to_studio_type)
VALUES 
  ('Yolobox Auto Export', 'Horizontal program export for DIY Lobby Vodcast', 50.00, 'equipment', 'diy', 'full_studio_buyout'),
  ('Event Setup & Breakdown', 'Tables, chairs, PA placement and breakdown', 75.00, 'setup', NULL, NULL);