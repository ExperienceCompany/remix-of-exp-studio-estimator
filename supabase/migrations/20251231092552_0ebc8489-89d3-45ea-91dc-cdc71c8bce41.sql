-- =============================================
-- SHARED STUDIO GROUPS
-- =============================================
CREATE TABLE public.shared_studio_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.shared_studio_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.shared_studio_groups(id) ON DELETE CASCADE NOT NULL,
  studio_id UUID REFERENCES public.studios(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, studio_id)
);

-- =============================================
-- AVAILABILITY RULES
-- =============================================
CREATE TABLE public.availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_ids UUID[] NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week INTEGER[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- SCHEDULER DISPLAY SETTINGS
-- =============================================
CREATE TABLE public.scheduler_display_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_start_time TIME NOT NULL DEFAULT '09:00',
  display_end_time TIME NOT NULL DEFAULT '00:00',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings
INSERT INTO public.scheduler_display_settings (display_start_time, display_end_time) 
VALUES ('09:00', '00:00');

-- =============================================
-- ALL-DAY DEFAULTS
-- =============================================
CREATE TABLE public.all_day_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES public.studios(id) ON DELETE CASCADE NOT NULL UNIQUE,
  show_all_day_checkbox BOOLEAN DEFAULT false,
  checked_by_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ACCESS CONTROL SETTINGS
-- =============================================
CREATE TABLE public.access_control_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_visibility TEXT NOT NULL DEFAULT 'public',
  booking_permission TEXT NOT NULL DEFAULT 'everyone',
  allowed_booking_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings
INSERT INTO public.access_control_settings (schedule_visibility, booking_permission) 
VALUES ('public', 'everyone');

-- =============================================
-- USER VISIBILITY RULES
-- =============================================
CREATE TABLE public.user_visibility_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_type TEXT NOT NULL DEFAULT 'any_user',
  viewer_tags TEXT[] DEFAULT '{}',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- BOOKING VISIBILITY RULES
-- =============================================
CREATE TABLE public.booking_visibility_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_type TEXT NOT NULL DEFAULT 'any_user',
  viewer_tags TEXT[] DEFAULT '{}',
  space_filter TEXT NOT NULL DEFAULT 'any_space',
  space_ids UUID[] DEFAULT '{}',
  holder_filter TEXT NOT NULL DEFAULT 'any_or_no_user',
  holder_tags TEXT[] DEFAULT '{}',
  booking_type_filter TEXT NOT NULL DEFAULT 'any',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Shared Studio Groups
ALTER TABLE public.shared_studio_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage shared_studio_groups" ON public.shared_studio_groups
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read shared_studio_groups" ON public.shared_studio_groups
  FOR SELECT USING (true);

-- Shared Studio Group Members
ALTER TABLE public.shared_studio_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage shared_studio_group_members" ON public.shared_studio_group_members
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read shared_studio_group_members" ON public.shared_studio_group_members
  FOR SELECT USING (true);

-- Availability Rules
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage availability_rules" ON public.availability_rules
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read availability_rules" ON public.availability_rules
  FOR SELECT USING (true);

-- Scheduler Display Settings
ALTER TABLE public.scheduler_display_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage scheduler_display_settings" ON public.scheduler_display_settings
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read scheduler_display_settings" ON public.scheduler_display_settings
  FOR SELECT USING (true);

-- All-Day Defaults
ALTER TABLE public.all_day_defaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage all_day_defaults" ON public.all_day_defaults
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read all_day_defaults" ON public.all_day_defaults
  FOR SELECT USING (true);

-- Access Control Settings
ALTER TABLE public.access_control_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage access_control_settings" ON public.access_control_settings
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read access_control_settings" ON public.access_control_settings
  FOR SELECT USING (true);

-- User Visibility Rules
ALTER TABLE public.user_visibility_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage user_visibility_rules" ON public.user_visibility_rules
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read user_visibility_rules" ON public.user_visibility_rules
  FOR SELECT USING (true);

-- Booking Visibility Rules
ALTER TABLE public.booking_visibility_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage booking_visibility_rules" ON public.booking_visibility_rules
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read booking_visibility_rules" ON public.booking_visibility_rules
  FOR SELECT USING (true);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE TRIGGER update_shared_studio_groups_updated_at
  BEFORE UPDATE ON public.shared_studio_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_availability_rules_updated_at
  BEFORE UPDATE ON public.availability_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduler_display_settings_updated_at
  BEFORE UPDATE ON public.scheduler_display_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_all_day_defaults_updated_at
  BEFORE UPDATE ON public.all_day_defaults
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_access_control_settings_updated_at
  BEFORE UPDATE ON public.access_control_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_visibility_rules_updated_at
  BEFORE UPDATE ON public.user_visibility_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_booking_visibility_rules_updated_at
  BEFORE UPDATE ON public.booking_visibility_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();