-- Fix PUBLIC_DATA_EXPOSURE: NULL created_by bypass vulnerability
-- The issue: policies like "(created_by = auth.uid() OR created_by IS NULL)" allow ANY authenticated user 
-- to view ALL records with NULL created_by, exposing customer data between users.
-- 
-- Solution: 
-- 1. Keep anonymous insert capability (required for public booking flow)
-- 2. NULL records should only be viewable by staff/admin OR by unauthenticated users
-- 3. Authenticated regular users should NOT see other people's anonymous bookings

-- ============================================
-- FIX QUOTES TABLE
-- ============================================

-- Drop the problematic policy that allows any user to see NULL records
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;

-- New policy: Authenticated users can only view quotes they created (strict, no NULL bypass)
CREATE POLICY "Users can view their own quotes"
ON public.quotes
FOR SELECT
USING (created_by = auth.uid());

-- New policy: Unauthenticated users can view anonymous quotes (for session continuity)
CREATE POLICY "Anonymous users can view anonymous quotes"
ON public.quotes
FOR SELECT
TO anon
USING (created_by IS NULL);

-- ============================================
-- FIX SESSIONS TABLE  
-- ============================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Anyone can update own sessions" ON public.sessions;

-- New policy: Authenticated users can only view sessions they created (strict)
CREATE POLICY "Users can view own sessions"
ON public.sessions
FOR SELECT
USING (created_by = auth.uid());

-- New policy: Unauthenticated users can view anonymous sessions
CREATE POLICY "Anonymous users can view anonymous sessions"
ON public.sessions
FOR SELECT
TO anon
USING (created_by IS NULL);

-- New policy: Authenticated users can only update their own sessions (strict)
CREATE POLICY "Users can update own sessions"
ON public.sessions
FOR UPDATE
USING (created_by = auth.uid());

-- New policy: Unauthenticated users can update anonymous sessions
CREATE POLICY "Anonymous users can update anonymous sessions"
ON public.sessions
FOR UPDATE
TO anon
USING (created_by IS NULL);