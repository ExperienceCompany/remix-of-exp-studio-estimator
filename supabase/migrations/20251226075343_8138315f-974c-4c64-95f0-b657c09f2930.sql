-- Add 'affiliate' to app_role enum
ALTER TYPE public.app_role ADD VALUE 'affiliate';

-- Add RLS policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));