-- Create ops_settings table for rent and operating expenses
CREATE TABLE public.ops_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

-- Insert initial settings
INSERT INTO public.ops_settings (setting_key, setting_value, description) VALUES
  ('monthly_rent', 0, 'Monthly studio rent'),
  ('monthly_utilities', 0, 'Monthly utilities (electric, internet, etc)'),
  ('monthly_insurance', 0, 'Monthly insurance costs'),
  ('monthly_other', 0, 'Other monthly operating expenses'),
  ('operating_hours_per_month', 240, 'Estimated operating hours per month');

-- Enable RLS
ALTER TABLE public.ops_settings ENABLE ROW LEVEL SECURITY;

-- Staff can view ops_settings
CREATE POLICY "Staff can view ops_settings" ON public.ops_settings
  FOR SELECT USING (is_staff_or_admin(auth.uid()));

-- Admins can manage ops_settings
CREATE POLICY "Admins can manage ops_settings" ON public.ops_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));