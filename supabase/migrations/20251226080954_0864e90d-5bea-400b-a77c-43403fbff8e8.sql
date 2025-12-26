-- Add lead_count column to profiles table for tracking affiliate leads
ALTER TABLE public.profiles 
ADD COLUMN lead_count integer NOT NULL DEFAULT 0;