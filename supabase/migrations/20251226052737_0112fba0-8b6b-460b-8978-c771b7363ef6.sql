-- Create admin_logs table to store logged examples from all estimator flows
CREATE TABLE public.admin_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  log_type TEXT NOT NULL CHECK (log_type IN ('studio_estimate', 'photo_editing', 'video_editing', 'team_project', 'internal_ops')),
  log_name TEXT,
  customer_total NUMERIC,
  provider_payout NUMERIC,
  gross_margin NUMERIC,
  net_profit NUMERIC,
  hours NUMERIC,
  data_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Staff can view all logs
CREATE POLICY "Staff can view admin_logs" 
ON public.admin_logs 
FOR SELECT 
USING (is_staff_or_admin(auth.uid()));

-- Admins can manage (insert, update, delete) logs
CREATE POLICY "Admins can manage admin_logs" 
ON public.admin_logs 
FOR ALL 
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_admin_logs_updated_at
BEFORE UPDATE ON public.admin_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();