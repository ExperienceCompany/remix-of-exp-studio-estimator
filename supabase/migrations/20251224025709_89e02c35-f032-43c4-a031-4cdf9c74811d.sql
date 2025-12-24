-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'user');

-- Create enum for time slots
CREATE TYPE public.time_slot_type AS ENUM ('mon_wed_day', 'mon_wed_eve', 'thu_fri_day', 'thu_fri_eve', 'sat_sun_day', 'sat_sun_eve');

-- Create enum for studio types
CREATE TYPE public.studio_type AS ENUM ('podcast_room', 'audio_studio', 'multimedia_studio', 'digital_edit_studio');

-- Create enum for provider levels
CREATE TYPE public.provider_level AS ENUM ('lv1', 'lv2', 'lv3');

-- Create enum for service types
CREATE TYPE public.service_type AS ENUM ('audio_podcast', 'vodcast', 'recording_session', 'photoshoot');

-- Create enum for quote status
CREATE TYPE public.quote_status AS ENUM ('draft', 'sent', 'approved', 'completed');

-- Create enum for session types
CREATE TYPE public.session_type AS ENUM ('diy', 'serviced');

-- Studios table
CREATE TABLE public.studios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type studio_type NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Time slots table
CREATE TABLE public.time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type time_slot_type NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- DIY rates table
CREATE TABLE public.diy_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES public.studios(id) ON DELETE CASCADE NOT NULL,
  time_slot_id UUID REFERENCES public.time_slots(id) ON DELETE CASCADE NOT NULL,
  first_hour_rate DECIMAL(10,2) NOT NULL,
  after_first_hour_rate DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(studio_id, time_slot_id)
);

-- Provider levels table
CREATE TABLE public.provider_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level provider_level NOT NULL UNIQUE,
  hourly_rate DECIMAL(10,2) NOT NULL,
  display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Services table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type service_type NOT NULL UNIQUE,
  base_pay DECIMAL(10,2) DEFAULT 0,
  base_pay_type TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Vodcast camera add-ons table
CREATE TABLE public.vodcast_camera_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cameras INTEGER NOT NULL UNIQUE,
  customer_addon_amount DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Vertical auto-edit add-ons table
CREATE TABLE public.vertical_autoedit_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_slot_group TEXT NOT NULL,
  tier_name TEXT NOT NULL,
  hourly_amount DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(time_slot_group, tier_name)
);

-- Editing menu table
CREATE TABLE public.editing_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  increment_price DECIMAL(10,2),
  increment_unit TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Packages table
CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  preset_json JSONB NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles table (security-critical - separate from profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Quotes table
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL DEFAULT 'customer',
  session_type session_type NOT NULL,
  studio_id UUID REFERENCES public.studios(id),
  service_id UUID REFERENCES public.services(id),
  time_slot_id UUID REFERENCES public.time_slots(id),
  hours INTEGER NOT NULL DEFAULT 1,
  provider_level provider_level,
  camera_count INTEGER DEFAULT 1,
  selections_json JSONB,
  totals_json JSONB,
  customer_total DECIMAL(10,2),
  provider_payout DECIMAL(10,2),
  gross_margin DECIMAL(10,2),
  ops_notes TEXT,
  status quote_status DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Audit log for rate changes
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diy_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vodcast_camera_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vertical_autoedit_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editing_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin or staff
CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'staff')
  )
$$;

-- Public read policies for reference data (studios, rates, etc.)
CREATE POLICY "Anyone can read studios" ON public.studios FOR SELECT USING (true);
CREATE POLICY "Anyone can read time_slots" ON public.time_slots FOR SELECT USING (true);
CREATE POLICY "Anyone can read diy_rates" ON public.diy_rates FOR SELECT USING (true);
CREATE POLICY "Anyone can read provider_levels" ON public.provider_levels FOR SELECT USING (true);
CREATE POLICY "Anyone can read services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Anyone can read vodcast_camera_addons" ON public.vodcast_camera_addons FOR SELECT USING (true);
CREATE POLICY "Anyone can read vertical_autoedit_addons" ON public.vertical_autoedit_addons FOR SELECT USING (true);
CREATE POLICY "Anyone can read editing_menu" ON public.editing_menu FOR SELECT USING (true);
CREATE POLICY "Anyone can read packages" ON public.packages FOR SELECT USING (true);

-- Admin-only write policies for reference data
CREATE POLICY "Admins can manage studios" ON public.studios FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage time_slots" ON public.time_slots FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage diy_rates" ON public.diy_rates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage provider_levels" ON public.provider_levels FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage services" ON public.services FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage vodcast_camera_addons" ON public.vodcast_camera_addons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage vertical_autoedit_addons" ON public.vertical_autoedit_addons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage editing_menu" ON public.editing_menu FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage packages" ON public.packages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profile policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Quotes policies
CREATE POLICY "Anyone can create quotes" ON public.quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their own quotes" ON public.quotes FOR SELECT USING (created_by = auth.uid() OR created_by IS NULL);
CREATE POLICY "Staff can view all quotes" ON public.quotes FOR SELECT TO authenticated USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "Staff can manage quotes" ON public.quotes FOR ALL TO authenticated USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- Audit log policies
CREATE POLICY "Staff can view audit log" ON public.audit_log FOR SELECT TO authenticated USING (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "System can insert audit log" ON public.audit_log FOR INSERT WITH CHECK (true);

-- Trigger for profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_studios_updated_at BEFORE UPDATE ON public.studios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_diy_rates_updated_at BEFORE UPDATE ON public.diy_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();