-- Demo Data Setup for FastFood Drone Delivery
-- Run this script to create sample data for demonstration

-- 1. Insert sample stores (if not exists)
INSERT IGNORE INTO stores (id, name, address, phone, lat, lng, created_at, updated_at) VALUES
(1, 'FastFood Central', '123 Nguyen Hue, District 1, HCMC', '0901234567', 10.7769, 106.7009, NOW(), NOW()),
(2, 'FastFood District 3', '456 Le Van Sy, District 3, HCMC', '0901234568', 10.7886, 106.6917, NOW(), NOW());

-- 2. Insert sample customers (if not exists)
INSERT IGNORE INTO users (id, username, email, password, full_name, phone, role, created_at, updated_at) VALUES
(100, 'customer1', 'customer1@demo.com', '$2a$10$demopassword', 'Nguyen Van A', '0987654321', 'CUSTOMER', NOW(), NOW()),
(101, 'customer2', 'customer2@demo.com', '$2a$10$demopassword', 'Tran Thi B', '0987654322', 'CUSTOMER', NOW(), NOW()),
(102, 'admin', 'admin@demo.com', '$2a$10$demopassword', 'Admin User', '0987654323', 'ADMIN', NOW(), NOW());

-- 3. Insert sample addresses
INSERT IGNORE INTO addresses (id, user_id, address_line, ward, district, city, lat, lng, is_default, created_at, updated_at) VALUES
(1, 100, '789 Tran Hung Dao, District 1', 'Ben Nghe', 'District 1', 'Ho Chi Minh City', 10.7691, 106.7072, true, NOW(), NOW()),
(2, 101, '321 Vo Van Tan, District 3', 'Ward 6', 'District 3', 'Ho Chi Minh City', 10.7823, 106.6934, true, NOW(), NOW());

-- 4. Insert sample menu items
INSERT IGNORE INTO menu_items (id, name, description, price, category, image_url, available, store_id, created_at, updated_at) VALUES
(1, 'Classic Burger', 'Beef patty with lettuce, tomato, cheese', 89000, 'BURGER', '/images/burger1.jpg', true, 1, NOW(), NOW()),
(2, 'Chicken Wings', '6 pieces crispy chicken wings', 75000, 'CHICKEN', '/images/wings1.jpg', true, 1, NOW(), NOW()),
(3, 'French Fries', 'Crispy golden fries', 35000, 'SIDE', '/images/fries1.jpg', true, 1, NOW(), NOW()),
(4, 'Coca Cola', 'Cold soft drink 330ml', 25000, 'DRINK', '/images/coke1.jpg', true, 1, NOW(), NOW());

-- 5. Insert sample drones
INSERT IGNORE INTO drones (id, serial, model, max_payload_kg, status, home_lat, home_lng, battery_pct, current_lat, current_lng, created_at, last_seen_at) VALUES
(1, 'DRONE-001', 'DJI Delivery Pro', 5.0, 'IDLE', 10.7769, 106.7009, 95.0, 10.7769, 106.7009, NOW(), NOW()),
(2, 'DRONE-002', 'DJI Delivery Pro', 5.0, 'IDLE', 10.7769, 106.7009, 88.0, 10.7769, 106.7009, NOW(), NOW()),
(3, 'DRONE-003', 'DJI Delivery Pro', 5.0, 'OFFLINE', 10.7769, 106.7009, 12.0, 10.7769, 106.7009, NOW(), NOW());

-- 6. Insert sample orders in different states
INSERT IGNORE INTO orders (id, customer_id, store_id, status, total_amount, payment_method, payment_status, address_id, note, created_at, updated_at) VALUES
-- Order 1: Ready for demo (CONFIRMED -> can be moved to PREPARING)
(1, 100, 1, 'CONFIRMED', 149000, 'COD', 'PENDING', 1, 'Extra sauce please', NOW() - INTERVAL 10 MINUTE, NOW()),
-- Order 2: In preparation
(2, 101, 1, 'PREPARING', 199000, 'VNPAY', 'PAID', 2, 'No onions', NOW() - INTERVAL 5 MINUTE, NOW()),
-- Order 3: Ready for delivery
(3, 100, 1, 'READY_FOR_DELIVERY', 89000, 'COD', 'PENDING', 1, 'Call when arrived', NOW() - INTERVAL 2 MINUTE, NOW());

-- 7. Insert order items
INSERT IGNORE INTO order_items (id, order_id, menu_item_id, quantity, unit_price, total_price) VALUES
-- Order 1 items
(1, 1, 1, 1, 89000, 89000),
(2, 1, 4, 2, 25000, 50000),
(3, 1, 3, 1, 35000, 35000),
-- Order 2 items  
(4, 2, 1, 2, 89000, 178000),
(5, 2, 2, 1, 75000, 75000),
-- Order 3 items
(6, 3, 1, 1, 89000, 89000);

-- 8. Create a delivery that's ready to be assigned
INSERT IGNORE INTO deliveries (id, order_id, status, w1_lat, w1_lng, w2_lat, w2_lng, w3_lat, w3_lng, created_at, updated_at) VALUES
(1, 3, 'PENDING', 10.7769, 106.7009, 10.7691, 106.7072, 10.7769, 106.7009, NOW(), NOW());

-- Demo Instructions:
-- 1. Use Order ID 1 to simulate: CONFIRMED -> PREPARING -> READY_FOR_DELIVERY
-- 2. Use Order ID 3 to assign drone and start delivery simulation
-- 3. Use the drone tracking UI to monitor real-time updates