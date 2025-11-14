-- Demo Scripts for FastFood Drone Delivery
-- Use these scripts to simulate the order flow during demonstration

-- ===========================================
-- PHASE 1: ORDER PROCESSING SIMULATION
-- ===========================================

-- 1.1 Move order from CONFIRMED to PREPARING (Kitchen starts cooking)
-- UPDATE orders SET status = 'PREPARING', updated_at = NOW() WHERE id = 1;

-- 1.2 Move order from PREPARING to READY_FOR_DELIVERY (Food is ready)
-- UPDATE orders SET status = 'READY_FOR_DELIVERY', updated_at = NOW() WHERE id = 1;

-- 1.3 Create delivery record when order is ready
-- INSERT INTO deliveries (order_id, status, w1_lat, w1_lng, w2_lat, w2_lng, w3_lat, w3_lng, created_at, updated_at) 
-- VALUES (1, 'PENDING', 10.7769, 106.7009, 10.7691, 106.7072, 10.7769, 106.7009, NOW(), NOW());

-- ===========================================
-- PHASE 2: DRONE ASSIGNMENT SIMULATION
-- ===========================================

-- 2.1 Assign drone to order (use API endpoint /api/assignments/auto?orderId=1)
-- Or manually update:
-- UPDATE orders SET status = 'ASSIGNED', updated_at = NOW() WHERE id = 1;
-- UPDATE drones SET status = 'ASSIGNED', last_assigned_at = NOW() WHERE id = 1;
-- INSERT INTO drone_assignments (order_id, drone_id, assignment_mode, assigned_by, assigned_at) 
-- VALUES (1, 1, 'AUTO', 'SYSTEM', NOW());

-- ===========================================
-- PHASE 3: DELIVERY SIMULATION
-- ===========================================

-- 3.1 Start delivery simulation (Drone starts moving to store)
-- UPDATE orders SET status = 'OUT_FOR_DELIVERY', updated_at = NOW() WHERE id = 1;
-- UPDATE drones SET status = 'EN_ROUTE_TO_STORE', current_lat = 10.7769, current_lng = 106.7009 WHERE id = 1;
-- UPDATE deliveries SET status = 'IN_PROGRESS', current_segment = 'W0_W1', segment_start_time = NOW(), eta_seconds = 300 WHERE order_id = 1;

-- 3.2 Drone arrives at store (Pickup)
-- UPDATE drones SET status = 'AT_STORE', current_lat = 10.7769, current_lng = 106.7009 WHERE id = 1;
-- UPDATE deliveries SET current_segment = 'PICKUP', dwell_ticks_remaining = 3 WHERE order_id = 1;

-- 3.3 Drone leaves store (En route to customer)
-- UPDATE drones SET status = 'EN_ROUTE_TO_CUSTOMER' WHERE id = 1;
-- UPDATE deliveries SET current_segment = 'W1_W2', segment_start_time = NOW(), eta_seconds = 420 WHERE order_id = 1;

-- 3.4 Drone arrives at customer (Delivery completed)
-- UPDATE orders SET status = 'DELIVERED', updated_at = NOW() WHERE id = 1;
-- UPDATE drones SET status = 'RETURN_TO_BASE', current_lat = 10.7691, current_lng = 106.7072 WHERE id = 1;
-- UPDATE deliveries SET status = 'COMPLETED', current_segment = 'W2_W3', updated_at = NOW() WHERE order_id = 1;
-- UPDATE drone_assignments SET completed_at = NOW() WHERE order_id = 1;

-- 3.5 Drone returns to base
-- UPDATE drones SET status = 'IDLE', current_lat = 10.7769, current_lng = 106.7009, battery_pct = battery_pct - 15 WHERE id = 1;

-- ===========================================
-- QUICK DEMO RESET COMMANDS
-- ===========================================

-- Reset Order 1 to CONFIRMED state for new demo
-- UPDATE orders SET status = 'CONFIRMED', updated_at = NOW() WHERE id = 1;
-- DELETE FROM deliveries WHERE order_id = 1;
-- DELETE FROM drone_assignments WHERE order_id = 1;
-- UPDATE drones SET status = 'IDLE', current_lat = home_lat, current_lng = home_lng WHERE id = 1;

-- Reset Order 3 to READY_FOR_DELIVERY for drone assignment demo
-- UPDATE orders SET status = 'READY_FOR_DELIVERY', updated_at = NOW() WHERE id = 3;
-- UPDATE deliveries SET status = 'PENDING' WHERE order_id = 3;
-- DELETE FROM drone_assignments WHERE order_id = 3;
-- UPDATE drones SET status = 'IDLE' WHERE id IN (1,2);

-- ===========================================
-- PAYMENT SIMULATION
-- ===========================================

-- Simulate successful payment
-- UPDATE orders SET payment_status = 'PAID', updated_at = NOW() WHERE id = 1;

-- Simulate failed payment
-- UPDATE orders SET payment_status = 'FAILED', updated_at = NOW() WHERE id = 1;

-- ===========================================
-- EMERGENCY SCENARIOS
-- ===========================================

-- Simulate drone failure during delivery
-- UPDATE orders SET status = 'FAILED', updated_at = NOW() WHERE id = 1;
-- UPDATE drones SET status = 'OFFLINE', battery_pct = 5 WHERE id = 1;
-- UPDATE deliveries SET status = 'FAILED' WHERE order_id = 1;

-- Simulate order cancellation
-- UPDATE orders SET status = 'CANCELLED', updated_at = NOW() WHERE id = 1;
-- DELETE FROM deliveries WHERE order_id = 1;
-- DELETE FROM drone_assignments WHERE order_id = 1;
-- UPDATE drones SET status = 'IDLE' WHERE id = 1;