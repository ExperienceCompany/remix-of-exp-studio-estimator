-- Add customer-facing price column to editing_menu
ALTER TABLE editing_menu ADD COLUMN customer_price numeric;

-- Update photo editing items with doubled customer prices (payout × 2)
UPDATE editing_menu SET customer_price = 10.00 WHERE name = 'Enhance Edit';
UPDATE editing_menu SET customer_price = 25.00 WHERE name = 'Advanced Edit';
UPDATE editing_menu SET customer_price = 50.00 WHERE name = 'Special Effects Edit';

-- For any other items without a customer_price, default to base_price × 2
UPDATE editing_menu SET customer_price = base_price * 2 WHERE customer_price IS NULL;