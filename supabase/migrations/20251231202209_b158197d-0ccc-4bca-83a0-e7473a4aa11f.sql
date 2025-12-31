-- Add 'approved' status to booking_status enum
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'approved' AFTER 'pending';

-- Add approval and payment tracking columns to studio_bookings
ALTER TABLE studio_bookings 
ADD COLUMN IF NOT EXISTS requires_approval boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS deposit_amount numeric,
ADD COLUMN IF NOT EXISTS deposit_paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deposit_paid_at timestamptz,
ADD COLUMN IF NOT EXISTS square_payment_id text,
ADD COLUMN IF NOT EXISTS estimated_total numeric;