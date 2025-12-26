-- Create sessions table for tracking active/completed studio sessions
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES public.quotes(id),
  
  -- Session timing
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  paused_at timestamptz,
  ended_at timestamptz,
  total_paused_seconds integer DEFAULT 0,
  actual_duration_seconds integer,
  
  -- Snapshot of selections
  session_type text NOT NULL,
  selections_json jsonb,
  
  -- Billing
  original_total numeric(10,2),
  final_total numeric(10,2),
  
  -- Payment
  payment_status text DEFAULT 'unpaid',
  square_payment_id text,
  
  -- Metadata
  affiliate_code text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add constraint for status values
ALTER TABLE public.sessions ADD CONSTRAINT sessions_status_check 
  CHECK (status IN ('pending', 'active', 'paused', 'completed', 'cancelled'));

-- Add constraint for payment_status values  
ALTER TABLE public.sessions ADD CONSTRAINT sessions_payment_status_check 
  CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed'));

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can create sessions (authenticated or not for guest checkouts)
CREATE POLICY "Anyone can create sessions" 
  ON public.sessions 
  FOR INSERT 
  WITH CHECK (true);

-- Staff and admins can view all sessions
CREATE POLICY "Staff can view all sessions" 
  ON public.sessions 
  FOR SELECT 
  USING (public.is_staff_or_admin(auth.uid()));

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions" 
  ON public.sessions 
  FOR SELECT 
  USING (created_by = auth.uid() OR created_by IS NULL);

-- Staff and admins can update sessions
CREATE POLICY "Staff can update sessions" 
  ON public.sessions 
  FOR UPDATE 
  USING (public.is_staff_or_admin(auth.uid()));

-- Anyone can update their own session (for timer controls)
CREATE POLICY "Anyone can update own sessions" 
  ON public.sessions 
  FOR UPDATE 
  USING (created_by = auth.uid() OR created_by IS NULL);

-- Trigger for updated_at
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();