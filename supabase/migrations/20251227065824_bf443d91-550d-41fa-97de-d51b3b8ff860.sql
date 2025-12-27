-- Create booking_color_rules table
CREATE TABLE public.booking_color_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  color TEXT NOT NULL DEFAULT '#3b82f6',
  conditions JSONB NOT NULL DEFAULT '[]',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default color rules matching booking types
INSERT INTO public.booking_color_rules (color, conditions, display_order)
VALUES 
  ('#ef4444', '[{"field": "booking_type", "operator": "is_equal_to", "value": "unavailable"}]', 0),
  ('#6b7280', '[{"field": "booking_type", "operator": "is_equal_to", "value": "customer"}]', 1),
  ('#06b6d4', '[{"field": "booking_type", "operator": "is_equal_to", "value": "internal"}]', 2);

-- Enable RLS
ALTER TABLE public.booking_color_rules ENABLE ROW LEVEL SECURITY;

-- Anyone can read color rules
CREATE POLICY "Anyone can read booking_color_rules" ON public.booking_color_rules
  FOR SELECT USING (true);

-- Only admins can manage color rules
CREATE POLICY "Admins can manage booking_color_rules" ON public.booking_color_rules
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_booking_color_rules_updated_at
  BEFORE UPDATE ON public.booking_color_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();