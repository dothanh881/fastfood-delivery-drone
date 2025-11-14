-- Add order_code column and unique index to orders table
ALTER TABLE orders ADD COLUMN order_code VARCHAR(32) NOT NULL;

-- Ensure uniqueness for order_code
CREATE UNIQUE INDEX uq_orders_order_code ON orders(order_code);