-- Add package pricing columns to packages table
ALTER TABLE packages ADD COLUMN is_package_pricing boolean DEFAULT false;
ALTER TABLE packages ADD COLUMN package_price_first_hour numeric;
ALTER TABLE packages ADD COLUMN package_price_additional_hour numeric;
ALTER TABLE packages ADD COLUMN included_edits integer DEFAULT 0;
ALTER TABLE packages ADD COLUMN payout_base numeric DEFAULT 0;
ALTER TABLE packages ADD COLUMN payout_hourly numeric DEFAULT 0;
ALTER TABLE packages ADD COLUMN payout_edits_included integer DEFAULT 0;

-- Insert the Professional Photoshoot Package
INSERT INTO packages (name, description, preset_json, display_order, is_package_pricing,
  package_price_first_hour, package_price_additional_hour, included_edits,
  payout_base, payout_hourly, payout_edits_included)
VALUES (
  'Professional Photoshoot',
  '$300 first hour, $100/hr additional - includes 10 enhance edits',
  '{"session_type": "serviced", "studio_type": "multimedia_studio", "service_type": "photoshoot", "provider_level": "lv3"}',
  10,
  true,
  300,
  100,
  10,
  60,
  40,
  10
);