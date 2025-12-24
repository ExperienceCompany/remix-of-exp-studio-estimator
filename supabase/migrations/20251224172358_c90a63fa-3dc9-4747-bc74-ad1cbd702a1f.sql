-- Add is_hourly column to session_addons
ALTER TABLE session_addons ADD COLUMN IF NOT EXISTS is_hourly boolean DEFAULT false;

-- Add applies_to_studio_types array column for multi-studio filtering
ALTER TABLE session_addons ADD COLUMN IF NOT EXISTS applies_to_studio_types text[];

-- Update Yolobox to "Auto-Editing Video Recording Device" with hourly pricing
UPDATE session_addons 
SET 
  name = 'Auto-Editing Video Recording Device',
  description = 'Horizontal program auto-export for DIY Lobby Vodcast sessions',
  is_hourly = true
WHERE name = 'Yolobox Auto Export';

-- Update Event Setup & Breakdown to apply to Full Studio Buyout OR Multimedia Studio
UPDATE session_addons 
SET applies_to_studio_types = ARRAY['full_studio_buyout', 'multimedia_studio']
WHERE name = 'Event Setup & Breakdown';

-- Deactivate all vertical autoedit tier records (keep for historical data)
UPDATE vertical_autoedit_addons SET is_active = false;