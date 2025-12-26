-- Add affiliate_code column to profiles table (unique, nullable)
ALTER TABLE public.profiles 
ADD COLUMN affiliate_code text UNIQUE;

-- Create index for faster lookups by affiliate code
CREATE INDEX idx_profiles_affiliate_code ON public.profiles(affiliate_code);

-- Add affiliate_code to quotes table for tracking referrals
ALTER TABLE public.quotes 
ADD COLUMN affiliate_code text;

-- Add affiliate_code to admin_logs for tracking referrals on all log types
ALTER TABLE public.admin_logs 
ADD COLUMN affiliate_code text;