-- Add additional profile columns for enhanced user management
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tags text[];

-- Create index for faster user search
CREATE INDEX IF NOT EXISTS idx_profiles_search ON public.profiles USING gin(to_tsvector('english', coalesce(full_name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(organization, '')));