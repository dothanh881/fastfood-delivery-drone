-- Insert test data for Railway database

-- Insert roles
INSERT INTO role (id, code, name, description, created_at, updated_at)
VALUES
(1, 'CUSTOMER', 'Customer', 'Regular customer role', NOW(), NOW()),
(2, 'ADMIN', 'Admin', 'Administrator role', NOW(), NOW()),
(3, 'MERCHANT', 'Merchant', 'Store merchant role', NOW(), NOW()),
(4, 'STAFF', 'Staff', 'Store staff role', NOW(), NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Insert test users (password for all: 123qwe, BCrypt encoded)
-- BCrypt hash for "123qwe" = $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhkK
INSERT INTO user (id, email, username, password_hash, full_name, phone, enabled, created_at, updated_at)
VALUES
(1, 'customer@example.com', 'customer', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhkK', 'Customer Test', '0123456789', 1, NOW(), NOW()),
(2, 'admin@example.com', 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhkK', 'Admin Test', '0987654321', 1, NOW(), NOW()),
(3, 'merchant@example.com', 'merchant', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhkK', 'Merchant Test', '0111222333', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE username=VALUES(username);

-- Link users to roles
INSERT INTO user_roles (user_id, role_id)
VALUES
(1, 1),  -- customer -> CUSTOMER
(2, 2),  -- admin -> ADMIN
(3, 3)   -- merchant -> MERCHANT
ON DUPLICATE KEY UPDATE user_id=VALUES(user_id);

-- Insert test store
INSERT INTO store (id, name, address, phone, lat, lng, status, image_url, created_at, updated_at)
VALUES
(1, 'FastFood Store 1', '227 Nguyen Van Cu, District 5, HCMC', '0281234567', 10.7545, 106.6632, 'ACTIVE', 'https://via.placeholder.com/400x300', NOW(), NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Insert test menu items
INSERT INTO menu_item (id, store_id, name, description, price, image_url, category, available, created_at, updated_at)
VALUES
(1, 1, 'Burger Classic', 'Classic beef burger with cheese', 50000, 'https://via.placeholder.com/300x200', 'BURGER', 1, NOW(), NOW()),
(2, 1, 'French Fries', 'Crispy golden fries', 25000, 'https://via.placeholder.com/300x200', 'SIDE', 1, NOW(), NOW()),
(3, 1, 'Coca Cola', 'Refreshing cola drink', 15000, 'https://via.placeholder.com/300x200', 'DRINK', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name);

