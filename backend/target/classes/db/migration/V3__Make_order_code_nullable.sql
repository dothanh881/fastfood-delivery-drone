-- Alter order_code to allow NULL to avoid initial insert failures
ALTER TABLE orders MODIFY order_code VARCHAR(32) NULL;