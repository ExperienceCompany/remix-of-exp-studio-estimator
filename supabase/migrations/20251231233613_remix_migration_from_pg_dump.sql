CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'staff',
    'user',
    'affiliate'
);


--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_status AS ENUM (
    'pending',
    'approved',
    'confirmed',
    'cancelled',
    'completed'
);


--
-- Name: booking_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_type AS ENUM (
    'customer',
    'internal',
    'unavailable'
);


--
-- Name: provider_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.provider_level AS ENUM (
    'lv1',
    'lv2',
    'lv3'
);


--
-- Name: quote_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.quote_status AS ENUM (
    'draft',
    'sent',
    'approved',
    'completed'
);


--
-- Name: service_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.service_type AS ENUM (
    'audio_podcast',
    'vodcast',
    'recording_session',
    'photoshoot'
);


--
-- Name: session_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.session_type AS ENUM (
    'diy',
    'serviced'
);


--
-- Name: studio_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.studio_type AS ENUM (
    'podcast_room',
    'audio_studio',
    'multimedia_studio',
    'digital_edit_studio',
    'full_studio_buyout'
);


--
-- Name: time_slot_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.time_slot_type AS ENUM (
    'mon_wed_day',
    'mon_wed_eve',
    'thu_fri_day',
    'thu_fri_eve',
    'sat_sun_day',
    'sat_sun_eve'
);


--
-- Name: check_booking_overlap(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_booking_overlap() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  full_buyout_studio_id uuid;
  has_full_buyout boolean := false;
  has_regular_booking boolean := false;
BEGIN
  -- Skip validation for cancelled bookings
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Get the Full Studio Buyout studio ID if it exists
  SELECT id INTO full_buyout_studio_id FROM studios WHERE type = 'full_studio_buyout' LIMIT 1;

  -- Check if there's any overlapping booking for the same studio
  IF EXISTS (
    SELECT 1 FROM studio_bookings
    WHERE studio_id = NEW.studio_id
      AND booking_date = NEW.booking_date
      AND status != 'cancelled'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND NOT (NEW.end_time <= start_time OR NEW.start_time >= end_time)
  ) THEN
    RAISE EXCEPTION 'Booking overlaps with an existing booking for this studio';
  END IF;

  -- If booking a Full Studio Buyout, check all other studios for conflicts
  IF full_buyout_studio_id IS NOT NULL AND NEW.studio_id = full_buyout_studio_id THEN
    IF EXISTS (
      SELECT 1 FROM studio_bookings
      WHERE studio_id != NEW.studio_id
        AND booking_date = NEW.booking_date
        AND status != 'cancelled'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND NOT (NEW.end_time <= start_time OR NEW.start_time >= end_time)
    ) THEN
      RAISE EXCEPTION 'Full Studio Buyout conflicts with existing bookings in other studios';
    END IF;
  END IF;

  -- If booking a regular studio, check if Full Studio Buyout exists for that time
  IF full_buyout_studio_id IS NOT NULL AND NEW.studio_id != full_buyout_studio_id THEN
    IF EXISTS (
      SELECT 1 FROM studio_bookings
      WHERE studio_id = full_buyout_studio_id
        AND booking_date = NEW.booking_date
        AND status != 'cancelled'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND NOT (NEW.end_time <= start_time OR NEW.start_time >= end_time)
    ) THEN
      RAISE EXCEPTION 'This time slot is reserved for a Full Studio Buyout';
    END IF;
  END IF;

  -- NEW: Check if booking conflicts with another studio in the same shared group
  IF EXISTS (
    SELECT 1 FROM studio_bookings sb
    JOIN shared_studio_group_members m1 ON sb.studio_id = m1.studio_id
    JOIN shared_studio_group_members m2 ON m1.group_id = m2.group_id AND m2.studio_id = NEW.studio_id
    WHERE sb.studio_id != NEW.studio_id
      AND sb.booking_date = NEW.booking_date
      AND sb.status != 'cancelled'
      AND sb.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND NOT (NEW.end_time <= sb.start_time OR NEW.start_time >= sb.end_time)
  ) THEN
    RAISE EXCEPTION 'Booking conflicts with a studio in the same shared group';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: create_session_from_booking(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_session_from_booking() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: increment_affiliate_lead_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_affiliate_lead_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: is_staff_or_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_staff_or_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'staff')
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: access_control_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_control_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    schedule_visibility text DEFAULT 'public'::text NOT NULL,
    booking_permission text DEFAULT 'everyone'::text NOT NULL,
    allowed_booking_tags text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    log_type text NOT NULL,
    log_name text,
    customer_total numeric,
    provider_payout numeric,
    gross_margin numeric,
    net_profit numeric,
    hours numeric,
    data_json jsonb NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    affiliate_code text,
    CONSTRAINT admin_logs_log_type_check CHECK ((log_type = ANY (ARRAY['studio_estimate'::text, 'photo_editing'::text, 'video_editing'::text, 'team_project'::text, 'internal_ops'::text]))),
    CONSTRAINT admin_logs_status_check CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text])))
);


--
-- Name: all_day_defaults; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.all_day_defaults (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    studio_id uuid NOT NULL,
    show_all_day_checkbox boolean DEFAULT false,
    checked_by_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    action text NOT NULL,
    old_values jsonb,
    new_values jsonb,
    changed_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: availability_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.availability_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    studio_ids uuid[] NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    days_of_week integer[] NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: blocked_dates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blocked_dates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    studio_id uuid,
    blocked_date date NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: booking_color_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_color_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    color text DEFAULT '#3b82f6'::text NOT NULL,
    conditions jsonb DEFAULT '[]'::jsonb NOT NULL,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: booking_custom_field_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_custom_field_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    field_id uuid NOT NULL,
    field_value jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: booking_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    policy_type text NOT NULL,
    policy_value text NOT NULL,
    hours_before_start integer DEFAULT 24,
    hours_after_end integer DEFAULT 0,
    allowed_tags text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: booking_visibility_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_visibility_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    viewer_type text DEFAULT 'any_user'::text NOT NULL,
    viewer_tags text[] DEFAULT '{}'::text[],
    space_filter text DEFAULT 'any_space'::text NOT NULL,
    space_ids uuid[] DEFAULT '{}'::uuid[],
    holder_filter text DEFAULT 'any_or_no_user'::text NOT NULL,
    holder_tags text[] DEFAULT '{}'::text[],
    booking_type_filter text DEFAULT 'any'::text NOT NULL,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: calendar_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    studio_id uuid NOT NULL,
    time_increment_minutes integer DEFAULT 15 NOT NULL,
    buffer_minutes integer DEFAULT 15 NOT NULL,
    min_booking_hours integer DEFAULT 1 NOT NULL,
    max_booking_hours integer DEFAULT 8 NOT NULL,
    advance_booking_days integer DEFAULT 30 NOT NULL,
    operating_start_time time without time zone DEFAULT '10:00:00'::time without time zone NOT NULL,
    operating_end_time time without time zone DEFAULT '22:00:00'::time without time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: custom_booking_fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_booking_fields (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    field_type text NOT NULL,
    field_label text NOT NULL,
    field_nickname text NOT NULL,
    field_placeholder text,
    field_options text[],
    field_help_text text,
    is_required boolean DEFAULT false,
    is_admin_only boolean DEFAULT false,
    min_selections integer,
    max_selections integer,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: custom_field_conditions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_field_conditions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    field_id uuid NOT NULL,
    condition_group integer DEFAULT 0,
    condition_field text NOT NULL,
    condition_operator text NOT NULL,
    condition_values text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: diy_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diy_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    studio_id uuid NOT NULL,
    time_slot_id uuid NOT NULL,
    first_hour_rate numeric(10,2) NOT NULL,
    after_first_hour_rate numeric(10,2),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: editing_menu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.editing_menu (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    base_price numeric(10,2) NOT NULL,
    increment_price numeric(10,2),
    increment_unit text,
    description text,
    is_active boolean DEFAULT true,
    customer_price numeric
);


--
-- Name: ops_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ops_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value numeric DEFAULT 0 NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


--
-- Name: packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.packages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    preset_json jsonb NOT NULL,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    is_package_pricing boolean DEFAULT false,
    package_price_first_hour numeric,
    package_price_additional_hour numeric,
    included_edits integer DEFAULT 0,
    payout_base numeric DEFAULT 0,
    payout_hourly numeric DEFAULT 0,
    payout_edits_included integer DEFAULT 0
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    affiliate_code text,
    lead_count integer DEFAULT 0 NOT NULL,
    first_name text,
    last_name text,
    phone text,
    organization text,
    tags text[]
);


--
-- Name: provider_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_levels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    level public.provider_level NOT NULL,
    hourly_rate numeric(10,2) NOT NULL,
    display_name text NOT NULL,
    is_active boolean DEFAULT true
);


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mode text DEFAULT 'customer'::text NOT NULL,
    session_type public.session_type NOT NULL,
    studio_id uuid,
    service_id uuid,
    time_slot_id uuid,
    hours integer DEFAULT 1 NOT NULL,
    provider_level public.provider_level,
    camera_count integer DEFAULT 1,
    selections_json jsonb,
    totals_json jsonb,
    customer_total numeric(10,2),
    provider_payout numeric(10,2),
    gross_margin numeric(10,2),
    ops_notes text,
    status public.quote_status DEFAULT 'draft'::public.quote_status,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    affiliate_code text
);


--
-- Name: scheduler_display_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduler_display_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    display_start_time time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
    display_end_time time without time zone DEFAULT '00:00:00'::time without time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type public.service_type NOT NULL,
    base_pay numeric(10,2) DEFAULT 0,
    base_pay_type text,
    description text,
    is_active boolean DEFAULT true
);


--
-- Name: session_addons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_addons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    flat_amount numeric NOT NULL,
    addon_type text NOT NULL,
    applies_to_session_type text,
    applies_to_studio_type text,
    is_active boolean DEFAULT true,
    is_hourly boolean DEFAULT false,
    applies_to_studio_types text[]
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    started_at timestamp with time zone,
    paused_at timestamp with time zone,
    ended_at timestamp with time zone,
    total_paused_seconds integer DEFAULT 0,
    actual_duration_seconds integer,
    session_type text NOT NULL,
    selections_json jsonb,
    original_total numeric(10,2),
    final_total numeric(10,2),
    payment_status text DEFAULT 'unpaid'::text,
    square_payment_id text,
    affiliate_code text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sessions_payment_status_check CHECK ((payment_status = ANY (ARRAY['unpaid'::text, 'pending'::text, 'paid'::text, 'failed'::text]))),
    CONSTRAINT sessions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'paused'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: shared_studio_group_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shared_studio_group_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    studio_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: shared_studio_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shared_studio_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: studio_bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.studio_bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    studio_id uuid NOT NULL,
    booking_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    booking_type public.booking_type DEFAULT 'customer'::public.booking_type NOT NULL,
    status public.booking_status DEFAULT 'pending'::public.booking_status NOT NULL,
    customer_name text,
    customer_email text,
    customer_phone text,
    notes text,
    session_type text,
    quote_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    title text,
    people_count integer DEFAULT 1,
    details text,
    repeat_series_id uuid,
    repeat_pattern text,
    requires_approval boolean DEFAULT false,
    approved_by uuid,
    approved_at timestamp with time zone,
    deposit_amount numeric,
    deposit_paid boolean DEFAULT false,
    deposit_paid_at timestamp with time zone,
    square_payment_id text,
    estimated_total numeric
);


--
-- Name: studios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.studios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type public.studio_type NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    thumbnail_url text,
    calendar_color text DEFAULT '#3b82f6'::text
);


--
-- Name: time_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type public.time_slot_type NOT NULL,
    display_name text NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_visibility_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_visibility_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    viewer_type text DEFAULT 'any_user'::text NOT NULL,
    viewer_tags text[] DEFAULT '{}'::text[],
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: vertical_autoedit_addons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vertical_autoedit_addons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    time_slot_group text NOT NULL,
    tier_name text NOT NULL,
    hourly_amount numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true
);


--
-- Name: vodcast_camera_addons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vodcast_camera_addons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cameras integer NOT NULL,
    customer_addon_amount numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true
);


--
-- Name: access_control_settings access_control_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_control_settings
    ADD CONSTRAINT access_control_settings_pkey PRIMARY KEY (id);


--
-- Name: admin_logs admin_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_pkey PRIMARY KEY (id);


--
-- Name: all_day_defaults all_day_defaults_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.all_day_defaults
    ADD CONSTRAINT all_day_defaults_pkey PRIMARY KEY (id);


--
-- Name: all_day_defaults all_day_defaults_studio_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.all_day_defaults
    ADD CONSTRAINT all_day_defaults_studio_id_key UNIQUE (studio_id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: availability_rules availability_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_rules
    ADD CONSTRAINT availability_rules_pkey PRIMARY KEY (id);


--
-- Name: blocked_dates blocked_dates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_dates
    ADD CONSTRAINT blocked_dates_pkey PRIMARY KEY (id);


--
-- Name: booking_color_rules booking_color_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_color_rules
    ADD CONSTRAINT booking_color_rules_pkey PRIMARY KEY (id);


--
-- Name: booking_custom_field_values booking_custom_field_values_booking_id_field_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_custom_field_values
    ADD CONSTRAINT booking_custom_field_values_booking_id_field_id_key UNIQUE (booking_id, field_id);


--
-- Name: booking_custom_field_values booking_custom_field_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_custom_field_values
    ADD CONSTRAINT booking_custom_field_values_pkey PRIMARY KEY (id);


--
-- Name: booking_policies booking_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_policies
    ADD CONSTRAINT booking_policies_pkey PRIMARY KEY (id);


--
-- Name: booking_policies booking_policies_policy_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_policies
    ADD CONSTRAINT booking_policies_policy_type_key UNIQUE (policy_type);


--
-- Name: booking_visibility_rules booking_visibility_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_visibility_rules
    ADD CONSTRAINT booking_visibility_rules_pkey PRIMARY KEY (id);


--
-- Name: calendar_settings calendar_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_settings
    ADD CONSTRAINT calendar_settings_pkey PRIMARY KEY (id);


--
-- Name: calendar_settings calendar_settings_studio_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_settings
    ADD CONSTRAINT calendar_settings_studio_id_key UNIQUE (studio_id);


--
-- Name: custom_booking_fields custom_booking_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_booking_fields
    ADD CONSTRAINT custom_booking_fields_pkey PRIMARY KEY (id);


--
-- Name: custom_field_conditions custom_field_conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_field_conditions
    ADD CONSTRAINT custom_field_conditions_pkey PRIMARY KEY (id);


--
-- Name: diy_rates diy_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diy_rates
    ADD CONSTRAINT diy_rates_pkey PRIMARY KEY (id);


--
-- Name: diy_rates diy_rates_studio_id_time_slot_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diy_rates
    ADD CONSTRAINT diy_rates_studio_id_time_slot_id_key UNIQUE (studio_id, time_slot_id);


--
-- Name: editing_menu editing_menu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.editing_menu
    ADD CONSTRAINT editing_menu_pkey PRIMARY KEY (id);


--
-- Name: ops_settings ops_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ops_settings
    ADD CONSTRAINT ops_settings_pkey PRIMARY KEY (id);


--
-- Name: ops_settings ops_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ops_settings
    ADD CONSTRAINT ops_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: packages packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_affiliate_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_affiliate_code_key UNIQUE (affiliate_code);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: provider_levels provider_levels_level_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_levels
    ADD CONSTRAINT provider_levels_level_key UNIQUE (level);


--
-- Name: provider_levels provider_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_levels
    ADD CONSTRAINT provider_levels_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: scheduler_display_settings scheduler_display_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduler_display_settings
    ADD CONSTRAINT scheduler_display_settings_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: services services_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_type_key UNIQUE (type);


--
-- Name: session_addons session_addons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_addons
    ADD CONSTRAINT session_addons_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: shared_studio_group_members shared_studio_group_members_group_id_studio_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_studio_group_members
    ADD CONSTRAINT shared_studio_group_members_group_id_studio_id_key UNIQUE (group_id, studio_id);


--
-- Name: shared_studio_group_members shared_studio_group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_studio_group_members
    ADD CONSTRAINT shared_studio_group_members_pkey PRIMARY KEY (id);


--
-- Name: shared_studio_groups shared_studio_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_studio_groups
    ADD CONSTRAINT shared_studio_groups_pkey PRIMARY KEY (id);


--
-- Name: studio_bookings studio_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_bookings
    ADD CONSTRAINT studio_bookings_pkey PRIMARY KEY (id);


--
-- Name: studios studios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studios
    ADD CONSTRAINT studios_pkey PRIMARY KEY (id);


--
-- Name: time_slots time_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_slots
    ADD CONSTRAINT time_slots_pkey PRIMARY KEY (id);


--
-- Name: time_slots time_slots_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_slots
    ADD CONSTRAINT time_slots_type_key UNIQUE (type);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_visibility_rules user_visibility_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_visibility_rules
    ADD CONSTRAINT user_visibility_rules_pkey PRIMARY KEY (id);


--
-- Name: vertical_autoedit_addons vertical_autoedit_addons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vertical_autoedit_addons
    ADD CONSTRAINT vertical_autoedit_addons_pkey PRIMARY KEY (id);


--
-- Name: vertical_autoedit_addons vertical_autoedit_addons_time_slot_group_tier_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vertical_autoedit_addons
    ADD CONSTRAINT vertical_autoedit_addons_time_slot_group_tier_name_key UNIQUE (time_slot_group, tier_name);


--
-- Name: vodcast_camera_addons vodcast_camera_addons_cameras_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vodcast_camera_addons
    ADD CONSTRAINT vodcast_camera_addons_cameras_key UNIQUE (cameras);


--
-- Name: vodcast_camera_addons vodcast_camera_addons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vodcast_camera_addons
    ADD CONSTRAINT vodcast_camera_addons_pkey PRIMARY KEY (id);


--
-- Name: idx_blocked_dates_studio_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blocked_dates_studio_date ON public.blocked_dates USING btree (studio_id, blocked_date);


--
-- Name: idx_profiles_affiliate_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_affiliate_code ON public.profiles USING btree (affiliate_code);


--
-- Name: idx_profiles_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_search ON public.profiles USING gin (to_tsvector('english'::regconfig, ((((COALESCE(full_name, ''::text) || ' '::text) || COALESCE(email, ''::text)) || ' '::text) || COALESCE(organization, ''::text))));


--
-- Name: idx_studio_bookings_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_studio_bookings_date ON public.studio_bookings USING btree (booking_date);


--
-- Name: idx_studio_bookings_repeat_series_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_studio_bookings_repeat_series_id ON public.studio_bookings USING btree (repeat_series_id) WHERE (repeat_series_id IS NOT NULL);


--
-- Name: idx_studio_bookings_studio_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_studio_bookings_studio_date ON public.studio_bookings USING btree (studio_id, booking_date);


--
-- Name: studio_bookings on_booking_confirmed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_booking_confirmed AFTER INSERT OR UPDATE ON public.studio_bookings FOR EACH ROW EXECUTE FUNCTION public.create_session_from_booking();


--
-- Name: quotes on_quote_completed_increment_lead; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_quote_completed_increment_lead AFTER UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.increment_affiliate_lead_count();


--
-- Name: studio_bookings prevent_booking_overlap; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prevent_booking_overlap BEFORE INSERT OR UPDATE ON public.studio_bookings FOR EACH ROW EXECUTE FUNCTION public.check_booking_overlap();


--
-- Name: access_control_settings update_access_control_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_access_control_settings_updated_at BEFORE UPDATE ON public.access_control_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admin_logs update_admin_logs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_admin_logs_updated_at BEFORE UPDATE ON public.admin_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: all_day_defaults update_all_day_defaults_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_all_day_defaults_updated_at BEFORE UPDATE ON public.all_day_defaults FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: availability_rules update_availability_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_availability_rules_updated_at BEFORE UPDATE ON public.availability_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: booking_color_rules update_booking_color_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_booking_color_rules_updated_at BEFORE UPDATE ON public.booking_color_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: booking_policies update_booking_policies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_booking_policies_updated_at BEFORE UPDATE ON public.booking_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: booking_visibility_rules update_booking_visibility_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_booking_visibility_rules_updated_at BEFORE UPDATE ON public.booking_visibility_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: calendar_settings update_calendar_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_calendar_settings_updated_at BEFORE UPDATE ON public.calendar_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: custom_booking_fields update_custom_booking_fields_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_custom_booking_fields_updated_at BEFORE UPDATE ON public.custom_booking_fields FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: diy_rates update_diy_rates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_diy_rates_updated_at BEFORE UPDATE ON public.diy_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quotes update_quotes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: scheduler_display_settings update_scheduler_display_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_scheduler_display_settings_updated_at BEFORE UPDATE ON public.scheduler_display_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sessions update_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shared_studio_groups update_shared_studio_groups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shared_studio_groups_updated_at BEFORE UPDATE ON public.shared_studio_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: studio_bookings update_studio_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_studio_bookings_updated_at BEFORE UPDATE ON public.studio_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: studios update_studios_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_studios_updated_at BEFORE UPDATE ON public.studios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_visibility_rules update_user_visibility_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_visibility_rules_updated_at BEFORE UPDATE ON public.user_visibility_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admin_logs admin_logs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: all_day_defaults all_day_defaults_studio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.all_day_defaults
    ADD CONSTRAINT all_day_defaults_studio_id_fkey FOREIGN KEY (studio_id) REFERENCES public.studios(id) ON DELETE CASCADE;


--
-- Name: audit_log audit_log_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);


--
-- Name: blocked_dates blocked_dates_studio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_dates
    ADD CONSTRAINT blocked_dates_studio_id_fkey FOREIGN KEY (studio_id) REFERENCES public.studios(id) ON DELETE CASCADE;


--
-- Name: booking_custom_field_values booking_custom_field_values_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_custom_field_values
    ADD CONSTRAINT booking_custom_field_values_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.studio_bookings(id) ON DELETE CASCADE;


--
-- Name: booking_custom_field_values booking_custom_field_values_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_custom_field_values
    ADD CONSTRAINT booking_custom_field_values_field_id_fkey FOREIGN KEY (field_id) REFERENCES public.custom_booking_fields(id) ON DELETE CASCADE;


--
-- Name: calendar_settings calendar_settings_studio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_settings
    ADD CONSTRAINT calendar_settings_studio_id_fkey FOREIGN KEY (studio_id) REFERENCES public.studios(id) ON DELETE CASCADE;


--
-- Name: custom_field_conditions custom_field_conditions_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_field_conditions
    ADD CONSTRAINT custom_field_conditions_field_id_fkey FOREIGN KEY (field_id) REFERENCES public.custom_booking_fields(id) ON DELETE CASCADE;


--
-- Name: diy_rates diy_rates_studio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diy_rates
    ADD CONSTRAINT diy_rates_studio_id_fkey FOREIGN KEY (studio_id) REFERENCES public.studios(id) ON DELETE CASCADE;


--
-- Name: diy_rates diy_rates_time_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diy_rates
    ADD CONSTRAINT diy_rates_time_slot_id_fkey FOREIGN KEY (time_slot_id) REFERENCES public.time_slots(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: quotes quotes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: quotes quotes_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- Name: quotes quotes_studio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_studio_id_fkey FOREIGN KEY (studio_id) REFERENCES public.studios(id);


--
-- Name: quotes quotes_time_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_time_slot_id_fkey FOREIGN KEY (time_slot_id) REFERENCES public.time_slots(id);


--
-- Name: sessions sessions_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id);


--
-- Name: shared_studio_group_members shared_studio_group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_studio_group_members
    ADD CONSTRAINT shared_studio_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.shared_studio_groups(id) ON DELETE CASCADE;


--
-- Name: shared_studio_group_members shared_studio_group_members_studio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_studio_group_members
    ADD CONSTRAINT shared_studio_group_members_studio_id_fkey FOREIGN KEY (studio_id) REFERENCES public.studios(id) ON DELETE CASCADE;


--
-- Name: studio_bookings studio_bookings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_bookings
    ADD CONSTRAINT studio_bookings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: studio_bookings studio_bookings_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_bookings
    ADD CONSTRAINT studio_bookings_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;


--
-- Name: studio_bookings studio_bookings_studio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_bookings
    ADD CONSTRAINT studio_bookings_studio_id_fkey FOREIGN KEY (studio_id) REFERENCES public.studios(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: access_control_settings Admins can manage access_control_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage access_control_settings" ON public.access_control_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_logs Admins can manage admin_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage admin_logs" ON public.admin_logs USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: all_day_defaults Admins can manage all_day_defaults; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all_day_defaults" ON public.all_day_defaults USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: availability_rules Admins can manage availability_rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage availability_rules" ON public.availability_rules USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: blocked_dates Admins can manage blocked_dates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage blocked_dates" ON public.blocked_dates USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: booking_color_rules Admins can manage booking_color_rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage booking_color_rules" ON public.booking_color_rules USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: booking_policies Admins can manage booking_policies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage booking_policies" ON public.booking_policies USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: booking_visibility_rules Admins can manage booking_visibility_rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage booking_visibility_rules" ON public.booking_visibility_rules USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: calendar_settings Admins can manage calendar_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage calendar_settings" ON public.calendar_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: custom_booking_fields Admins can manage custom_booking_fields; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage custom_booking_fields" ON public.custom_booking_fields USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: custom_field_conditions Admins can manage custom_field_conditions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage custom_field_conditions" ON public.custom_field_conditions USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: diy_rates Admins can manage diy_rates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage diy_rates" ON public.diy_rates TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: editing_menu Admins can manage editing_menu; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage editing_menu" ON public.editing_menu TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ops_settings Admins can manage ops_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage ops_settings" ON public.ops_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: packages Admins can manage packages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage packages" ON public.packages TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: provider_levels Admins can manage provider_levels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage provider_levels" ON public.provider_levels TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: scheduler_display_settings Admins can manage scheduler_display_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage scheduler_display_settings" ON public.scheduler_display_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: services Admins can manage services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage services" ON public.services TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: session_addons Admins can manage session_addons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage session_addons" ON public.session_addons USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: shared_studio_group_members Admins can manage shared_studio_group_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage shared_studio_group_members" ON public.shared_studio_group_members USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: shared_studio_groups Admins can manage shared_studio_groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage shared_studio_groups" ON public.shared_studio_groups USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: studios Admins can manage studios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage studios" ON public.studios TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: time_slots Admins can manage time_slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage time_slots" ON public.time_slots TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_visibility_rules Admins can manage user_visibility_rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage user_visibility_rules" ON public.user_visibility_rules USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: vertical_autoedit_addons Admins can manage vertical_autoedit_addons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage vertical_autoedit_addons" ON public.vertical_autoedit_addons TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: vodcast_camera_addons Admins can manage vodcast_camera_addons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage vodcast_camera_addons" ON public.vodcast_camera_addons TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sessions Anonymous users can update anonymous sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anonymous users can update anonymous sessions" ON public.sessions FOR UPDATE TO anon USING ((created_by IS NULL));


--
-- Name: quotes Anonymous users can view anonymous quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anonymous users can view anonymous quotes" ON public.quotes FOR SELECT TO anon USING ((created_by IS NULL));


--
-- Name: sessions Anonymous users can view anonymous sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anonymous users can view anonymous sessions" ON public.sessions FOR SELECT TO anon USING ((created_by IS NULL));


--
-- Name: studio_bookings Anyone can create customer bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create customer bookings" ON public.studio_bookings FOR INSERT WITH CHECK ((booking_type = 'customer'::public.booking_type));


--
-- Name: quotes Anyone can create quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create quotes" ON public.quotes FOR INSERT WITH CHECK (true);


--
-- Name: sessions Anyone can create sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create sessions" ON public.sessions FOR INSERT WITH CHECK (true);


--
-- Name: booking_custom_field_values Anyone can insert booking_custom_field_values; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert booking_custom_field_values" ON public.booking_custom_field_values FOR INSERT WITH CHECK (true);


--
-- Name: access_control_settings Anyone can read access_control_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read access_control_settings" ON public.access_control_settings FOR SELECT USING (true);


--
-- Name: all_day_defaults Anyone can read all_day_defaults; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read all_day_defaults" ON public.all_day_defaults FOR SELECT USING (true);


--
-- Name: availability_rules Anyone can read availability_rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read availability_rules" ON public.availability_rules FOR SELECT USING (true);


--
-- Name: blocked_dates Anyone can read blocked_dates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read blocked_dates" ON public.blocked_dates FOR SELECT USING (true);


--
-- Name: booking_color_rules Anyone can read booking_color_rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read booking_color_rules" ON public.booking_color_rules FOR SELECT USING (true);


--
-- Name: booking_custom_field_values Anyone can read booking_custom_field_values; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read booking_custom_field_values" ON public.booking_custom_field_values FOR SELECT USING (true);


--
-- Name: booking_policies Anyone can read booking_policies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read booking_policies" ON public.booking_policies FOR SELECT USING (true);


--
-- Name: booking_visibility_rules Anyone can read booking_visibility_rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read booking_visibility_rules" ON public.booking_visibility_rules FOR SELECT USING (true);


--
-- Name: calendar_settings Anyone can read calendar_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read calendar_settings" ON public.calendar_settings FOR SELECT USING (true);


--
-- Name: custom_booking_fields Anyone can read custom_booking_fields; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read custom_booking_fields" ON public.custom_booking_fields FOR SELECT USING (true);


--
-- Name: custom_field_conditions Anyone can read custom_field_conditions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read custom_field_conditions" ON public.custom_field_conditions FOR SELECT USING (true);


--
-- Name: diy_rates Anyone can read diy_rates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read diy_rates" ON public.diy_rates FOR SELECT USING (true);


--
-- Name: editing_menu Anyone can read editing_menu; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read editing_menu" ON public.editing_menu FOR SELECT USING (true);


--
-- Name: packages Anyone can read packages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read packages" ON public.packages FOR SELECT USING (true);


--
-- Name: provider_levels Anyone can read provider_levels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read provider_levels" ON public.provider_levels FOR SELECT USING (true);


--
-- Name: scheduler_display_settings Anyone can read scheduler_display_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read scheduler_display_settings" ON public.scheduler_display_settings FOR SELECT USING (true);


--
-- Name: services Anyone can read services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read services" ON public.services FOR SELECT USING (true);


--
-- Name: session_addons Anyone can read session_addons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read session_addons" ON public.session_addons FOR SELECT USING (true);


--
-- Name: shared_studio_group_members Anyone can read shared_studio_group_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read shared_studio_group_members" ON public.shared_studio_group_members FOR SELECT USING (true);


--
-- Name: shared_studio_groups Anyone can read shared_studio_groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read shared_studio_groups" ON public.shared_studio_groups FOR SELECT USING (true);


--
-- Name: studios Anyone can read studios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read studios" ON public.studios FOR SELECT USING (true);


--
-- Name: time_slots Anyone can read time_slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read time_slots" ON public.time_slots FOR SELECT USING (true);


--
-- Name: user_visibility_rules Anyone can read user_visibility_rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read user_visibility_rules" ON public.user_visibility_rules FOR SELECT USING (true);


--
-- Name: vertical_autoedit_addons Anyone can read vertical_autoedit_addons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read vertical_autoedit_addons" ON public.vertical_autoedit_addons FOR SELECT USING (true);


--
-- Name: vodcast_camera_addons Anyone can read vodcast_camera_addons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read vodcast_camera_addons" ON public.vodcast_camera_addons FOR SELECT USING (true);


--
-- Name: studio_bookings Public can view bookings for availability; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view bookings for availability" ON public.studio_bookings FOR SELECT TO authenticated, anon USING ((status <> 'cancelled'::public.booking_status));


--
-- Name: studio_bookings Staff can manage all bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage all bookings" ON public.studio_bookings USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));


--
-- Name: booking_custom_field_values Staff can manage booking_custom_field_values; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage booking_custom_field_values" ON public.booking_custom_field_values USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));


--
-- Name: quotes Staff can manage quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage quotes" ON public.quotes TO authenticated USING (public.is_staff_or_admin(auth.uid())) WITH CHECK (public.is_staff_or_admin(auth.uid()));


--
-- Name: sessions Staff can update sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update sessions" ON public.sessions FOR UPDATE USING (public.is_staff_or_admin(auth.uid()));


--
-- Name: admin_logs Staff can view admin_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view admin_logs" ON public.admin_logs FOR SELECT USING (public.is_staff_or_admin(auth.uid()));


--
-- Name: studio_bookings Staff can view all bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view all bookings" ON public.studio_bookings FOR SELECT USING (public.is_staff_or_admin(auth.uid()));


--
-- Name: quotes Staff can view all quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view all quotes" ON public.quotes FOR SELECT TO authenticated USING (public.is_staff_or_admin(auth.uid()));


--
-- Name: sessions Staff can view all sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view all sessions" ON public.sessions FOR SELECT USING (public.is_staff_or_admin(auth.uid()));


--
-- Name: audit_log Staff can view audit log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view audit log" ON public.audit_log FOR SELECT TO authenticated USING (public.is_staff_or_admin(auth.uid()));


--
-- Name: ops_settings Staff can view ops_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view ops_settings" ON public.ops_settings FOR SELECT USING (public.is_staff_or_admin(auth.uid()));


--
-- Name: audit_log System can insert audit log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert audit log" ON public.audit_log FOR INSERT WITH CHECK (true);


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: sessions Users can update own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own sessions" ON public.sessions FOR UPDATE USING ((created_by = auth.uid()));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: studio_bookings Users can view own bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own bookings" ON public.studio_bookings FOR SELECT USING ((created_by = auth.uid()));


--
-- Name: sessions Users can view own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own sessions" ON public.sessions FOR SELECT USING ((created_by = auth.uid()));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: quotes Users can view their own quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own quotes" ON public.quotes FOR SELECT USING ((created_by = auth.uid()));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: access_control_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.access_control_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: all_day_defaults; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.all_day_defaults ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: availability_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: blocked_dates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_color_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_color_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_custom_field_values; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_custom_field_values ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_policies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_policies ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_visibility_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_visibility_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_booking_fields; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_booking_fields ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_field_conditions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_field_conditions ENABLE ROW LEVEL SECURITY;

--
-- Name: diy_rates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.diy_rates ENABLE ROW LEVEL SECURITY;

--
-- Name: editing_menu; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.editing_menu ENABLE ROW LEVEL SECURITY;

--
-- Name: ops_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ops_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: packages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: provider_levels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.provider_levels ENABLE ROW LEVEL SECURITY;

--
-- Name: quotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

--
-- Name: scheduler_display_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scheduler_display_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: services; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

--
-- Name: session_addons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.session_addons ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: shared_studio_group_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shared_studio_group_members ENABLE ROW LEVEL SECURITY;

--
-- Name: shared_studio_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shared_studio_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: studio_bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.studio_bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: studios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;

--
-- Name: time_slots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_visibility_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_visibility_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: vertical_autoedit_addons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vertical_autoedit_addons ENABLE ROW LEVEL SECURITY;

--
-- Name: vodcast_camera_addons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vodcast_camera_addons ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;