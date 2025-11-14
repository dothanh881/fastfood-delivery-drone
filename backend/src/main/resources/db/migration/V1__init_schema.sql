-- Initial schema based on JPA entities
-- Notes:
-- - Enum fields use VARCHAR to match @Enumerated(EnumType.STRING)
-- - Timestamps use DATETIME; application handles auditing values
-- - Add indexes and unique constraints reflecting entity requirements

-- Roles
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255)
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    status VARCHAR(50),
    created_at DATETIME,
    updated_at DATETIME
);

-- Users <-> Roles (Many-to-Many)
CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id)
);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- Address
CREATE TABLE IF NOT EXISTS addresses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    street VARCHAR(255),
    city VARCHAR(255),
    state VARCHAR(255),
    country VARCHAR(255),
    postal_code VARCHAR(50),
    latitude DOUBLE,
    longitude DOUBLE,
    created_at DATETIME,
    updated_at DATETIME
);

-- Stores
CREATE TABLE IF NOT EXISTS stores (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address_id BIGINT,
    manager_id BIGINT,
    status VARCHAR(50),
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT fk_store_address FOREIGN KEY (address_id) REFERENCES addresses(id),
    CONSTRAINT fk_store_manager FOREIGN KEY (manager_id) REFERENCES users(id)
);
CREATE INDEX idx_stores_manager ON stores(manager_id);
CREATE INDEX idx_stores_address ON stores(address_id);

-- Store Staff
CREATE TABLE IF NOT EXISTS store_staff (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role VARCHAR(50),
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT fk_store_staff_store FOREIGN KEY (store_id) REFERENCES stores(id),
    CONSTRAINT fk_store_staff_user FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_store_staff_store ON store_staff(store_id);
CREATE INDEX idx_store_staff_user ON store_staff(user_id);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    created_at DATETIME,
    updated_at DATETIME,
    UNIQUE KEY uk_categories_name (name)
);

-- Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(18,2) NOT NULL,
    category_id BIGINT,
    status VARCHAR(50),
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT fk_menu_item_category FOREIGN KEY (category_id) REFERENCES categories(id)
);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_status ON menu_items(status);

-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    menu_item_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    status VARCHAR(50),
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT fk_inventory_menu_item FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
    UNIQUE KEY uk_inventory_menu_item (menu_item_id)
);
CREATE INDEX idx_inventory_status ON inventory(status);

-- Inventory Transactions
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    menu_item_id BIGINT NOT NULL,
    change_amount INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    actor_id BIGINT,
    note VARCHAR(255),
    created_at DATETIME,
    CONSTRAINT fk_inv_tx_menu_item FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
    CONSTRAINT fk_inv_tx_actor FOREIGN KEY (actor_id) REFERENCES users(id)
);
CREATE INDEX idx_inv_tx_menu_item ON inventory_transactions(menu_item_id);
CREATE INDEX idx_inv_tx_actor ON inventory_transactions(actor_id);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_code VARCHAR(100) NOT NULL UNIQUE,
    customer_id BIGINT,
    store_id BIGINT,
    address_id BIGINT,
    status VARCHAR(50) NOT NULL,
    total_price DECIMAL(18,2) NOT NULL,
    payment_status VARCHAR(50),
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES users(id),
    CONSTRAINT fk_orders_store FOREIGN KEY (store_id) REFERENCES stores(id),
    CONSTRAINT fk_orders_address FOREIGN KEY (address_id) REFERENCES addresses(id)
);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_address ON orders(address_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    menu_item_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(18,2) NOT NULL,
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT fk_order_item_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_order_item_menu_item FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item ON order_items(menu_item_id);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    method VARCHAR(50),
    status VARCHAR(50),
    provider_tx_id VARCHAR(255),
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES orders(id)
);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Drones
CREATE TABLE IF NOT EXISTS drones (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    serial VARCHAR(100) NOT NULL UNIQUE,
    model VARCHAR(100),
    status VARCHAR(50),
    battery_level INT,
    created_at DATETIME,
    updated_at DATETIME
);
CREATE INDEX idx_drones_status ON drones(status);

-- Deliveries
CREATE TABLE IF NOT EXISTS deliveries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    drone_id BIGINT,
    pickup_address_id BIGINT,
    dropoff_address_id BIGINT,
    status VARCHAR(50),
    scheduled_time DATETIME,
    started_time DATETIME,
    completed_time DATETIME,
    -- Waypoints & simulation fields
    w0_lat DOUBLE,
    w0_lng DOUBLE,
    w1_lat DOUBLE,
    w1_lng DOUBLE,
    w2_lat DOUBLE,
    w2_lng DOUBLE,
    w3_lat DOUBLE,
    w3_lng DOUBLE,
    current_segment VARCHAR(50),
    segment_start_time DATETIME,
    eta_seconds INT,
    dwell_ticks_remaining INT,
    start_lat DOUBLE,
    start_lng DOUBLE,
    dest_lat DOUBLE,
    dest_lng DOUBLE,
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT fk_delivery_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_delivery_drone FOREIGN KEY (drone_id) REFERENCES drones(id),
    CONSTRAINT fk_delivery_pickup FOREIGN KEY (pickup_address_id) REFERENCES addresses(id),
    CONSTRAINT fk_delivery_dropoff FOREIGN KEY (dropoff_address_id) REFERENCES addresses(id),
    UNIQUE KEY uk_delivery_order (order_id)
);
CREATE INDEX idx_deliveries_drone ON deliveries(drone_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);

-- Delivery Events
CREATE TABLE IF NOT EXISTS delivery_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    delivery_id BIGINT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    nonce VARCHAR(100) NOT NULL,
    ts DATETIME NOT NULL,
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT fk_delivery_event_delivery FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
    UNIQUE KEY uk_delivery_event_nonce (delivery_id, nonce)
);
CREATE INDEX idx_delivery_events_delivery_ts ON delivery_events(delivery_id, ts);

-- Order Activity (status transitions, actions)
CREATE TABLE IF NOT EXISTS order_activity (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    actor_id BIGINT,
    action VARCHAR(100) NOT NULL,
    note VARCHAR(255),
    ts DATETIME NOT NULL,
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT fk_order_activity_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_order_activity_actor FOREIGN KEY (actor_id) REFERENCES users(id)
);
CREATE INDEX idx_order_activity_order_ts ON order_activity(order_id, ts);

-- Drone Assignments
CREATE TABLE IF NOT EXISTS drone_assignments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    delivery_id BIGINT,
    drone_id BIGINT NOT NULL,
    assigned_at DATETIME,
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT fk_drone_assign_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_drone_assign_delivery FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
    CONSTRAINT fk_drone_assign_drone FOREIGN KEY (drone_id) REFERENCES drones(id),
    UNIQUE KEY uk_drone_assignment_delivery (delivery_id)
);
CREATE INDEX idx_drone_assign_order ON drone_assignments(order_id);
CREATE INDEX idx_drone_assign_drone ON drone_assignments(drone_id);

-- Feedback (if exists in entities)
CREATE TABLE IF NOT EXISTS feedback (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT,
    user_id BIGINT,
    rating INT,
    comment TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT fk_feedback_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_feedback_order ON feedback(order_id);
CREATE INDEX idx_feedback_user ON feedback(user_id);

-- Basic seed values (optional)
-- INSERT INTO roles(name, description) VALUES ('ADMIN', 'Administrator'), ('STAFF', 'Store Staff'), ('CUSTOMER', 'Customer');