-- Create booking_policies table
CREATE TABLE public.booking_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_type TEXT NOT NULL, -- 'lock_in' or 'repeat_bookings'
  policy_value TEXT NOT NULL, -- 'open', 'flexible', 'moderate', 'strict' OR 'all' / 'tag_restricted'
  hours_before_start INTEGER DEFAULT 24,
  hours_after_end INTEGER DEFAULT 0,
  allowed_tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(policy_type)
);

-- Insert default policies
INSERT INTO public.booking_policies (policy_type, policy_value, hours_before_start, hours_after_end, allowed_tags)
VALUES 
  ('lock_in', 'strict', 24, 0, '{}'),
  ('repeat_bookings', 'tag_restricted', 0, 0, ARRAY['Team']);

-- Enable RLS
ALTER TABLE public.booking_policies ENABLE ROW LEVEL SECURITY;

-- Anyone can read policies
CREATE POLICY "Anyone can read booking_policies" ON public.booking_policies
  FOR SELECT USING (true);

-- Only admins can manage policies
CREATE POLICY "Admins can manage booking_policies" ON public.booking_policies
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_booking_policies_updated_at
  BEFORE UPDATE ON public.booking_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();