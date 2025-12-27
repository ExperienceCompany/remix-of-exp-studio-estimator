-- Create custom_booking_fields table
CREATE TABLE public.custom_booking_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_type TEXT NOT NULL, -- 'text', 'multiline_text', 'checkbox', 'single_select', 'multi_select'
  field_label TEXT NOT NULL,
  field_nickname TEXT NOT NULL,
  field_placeholder TEXT,
  field_options TEXT[],
  field_help_text TEXT,
  is_required BOOLEAN DEFAULT false,
  is_admin_only BOOLEAN DEFAULT false,
  min_selections INTEGER,
  max_selections INTEGER,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create custom_field_conditions table
CREATE TABLE public.custom_field_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID NOT NULL REFERENCES custom_booking_fields(id) ON DELETE CASCADE,
  condition_group INTEGER DEFAULT 0,
  condition_field TEXT NOT NULL,
  condition_operator TEXT NOT NULL,
  condition_values TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create booking_custom_field_values table
CREATE TABLE public.booking_custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES studio_bookings(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES custom_booking_fields(id) ON DELETE CASCADE,
  field_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(booking_id, field_id)
);

-- Enable RLS
ALTER TABLE public.custom_booking_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_custom_field_values ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_booking_fields
CREATE POLICY "Anyone can read custom_booking_fields" ON public.custom_booking_fields
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage custom_booking_fields" ON public.custom_booking_fields
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for custom_field_conditions
CREATE POLICY "Anyone can read custom_field_conditions" ON public.custom_field_conditions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage custom_field_conditions" ON public.custom_field_conditions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for booking_custom_field_values
CREATE POLICY "Anyone can read booking_custom_field_values" ON public.booking_custom_field_values
  FOR SELECT USING (true);

CREATE POLICY "Staff can manage booking_custom_field_values" ON public.booking_custom_field_values
  FOR ALL USING (is_staff_or_admin(auth.uid()))
  WITH CHECK (is_staff_or_admin(auth.uid()));

CREATE POLICY "Anyone can insert booking_custom_field_values" ON public.booking_custom_field_values
  FOR INSERT WITH CHECK (true);

-- Add updated_at trigger for custom_booking_fields
CREATE TRIGGER update_custom_booking_fields_updated_at
  BEFORE UPDATE ON public.custom_booking_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();