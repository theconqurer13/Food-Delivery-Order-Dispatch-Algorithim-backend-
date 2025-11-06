-- ============================================
-- SEED DATA FOR TESTING
-- ============================================

-- Clear existing data (optional, use with caution)
-- TRUNCATE TABLE fraud_events, ratings, order_assignments, orders, rider_locations, devices, riders, users CASCADE;

-- ============================================
-- Insert Users
-- ============================================

-- Admin user
INSERT INTO users (id, name, phone, email, password_hash, role) VALUES
('20000000-0000-0000-0000-000000000001', 'Admin User', '9999999999', 'admin@fooddelivery.com', '$2b$10$YourHashedPasswordHere', 'admin');

-- Customer users
INSERT INTO users (id, name, phone, email, password_hash, role) VALUES
('30000000-0000-0000-0000-000000000001', 'Rahul Kumar', '9876543210', 'rahul@example.com', '$2b$10$YourHashedPasswordHere', 'customer'),
('30000000-0000-0000-0000-000000000002', 'Priya Sharma', '9876543211', 'priya@example.com', '$2b$10$YourHashedPasswordHere', 'customer'),
('30000000-0000-0000-0000-000000000003', 'Amit Patel', '9876543212', 'amit@example.com', '$2b$10$YourHashedPasswordHere', 'customer');

-- Rider users
INSERT INTO users (id, name, phone, email, password_hash, role) VALUES
('10000000-0000-0000-0000-000000000001', 'Rajesh Singh', '9123456789', 'rajesh.rider@example.com', '$2b$10$YourHashedPasswordHere', 'rider'),
('10000000-0000-0000-0000-000000000002', 'Vijay Verma', '9123456790', 'vijay.rider@example.com', '$2b$10$YourHashedPasswordHere', 'rider'),
('10000000-0000-0000-0000-000000000003', 'Suresh Yadav', '9123456791', 'suresh.rider@example.com', '$2b$10$YourHashedPasswordHere', 'rider'),
('10000000-0000-0000-0000-000000000004', 'Manoj Kumar', '9123456792', 'manoj.rider@example.com', '$2b$10$YourHashedPasswordHere', 'rider'),
('10000000-0000-0000-0000-000000000005', 'Deepak Sharma', '9123456793', 'deepak.rider@example.com', '$2b$10$YourHashedPasswordHere', 'rider');

-- ============================================
-- Insert Rider Profiles
-- ============================================
INSERT INTO riders (rider_id, rating_avg, total_deliveries, vehicle_type, experience_years, available, active) VALUES
('10000000-0000-0000-0000-000000000001', 4.5, 150, 'bike', 2, true, true),
('10000000-0000-0000-0000-000000000002', 4.8, 250, 'bike', 3, true, true),
('10000000-0000-0000-0000-000000000003', 4.2, 80, 'scooter', 1, true, true),
('10000000-0000-0000-0000-000000000004', 4.9, 400, 'bike', 5, false, true),
('10000000-0000-0000-0000-000000000005', 3.8, 50, 'bike', 1, true, true);

-- ============================================
-- Insert Sample Locations (Kolkata coordinates)
-- ============================================
-- Rider 1: Near Park Street
INSERT INTO rider_locations (rider_id, lat, lng, speed_kmph, accuracy_m, recorded_at) VALUES
('10000000-0000-0000-0000-000000000001', 22.5543, 88.3526, 25.5, 10, NOW() - INTERVAL '5 minutes'),
('10000000-0000-0000-0000-000000000001', 22.5548, 88.3530, 30.0, 8, NOW() - INTERVAL '3 minutes'),
('10000000-0000-0000-0000-000000000001', 22.5555, 88.3535, 28.0, 12, NOW() - INTERVAL '1 minute');

-- Rider 2: Near Salt Lake
INSERT INTO rider_locations (rider_id, lat, lng, speed_kmph, accuracy_m, recorded_at) VALUES
('10000000-0000-0000-0000-000000000002', 22.5726, 88.4335, 20.0, 15, NOW() - INTERVAL '4 minutes'),
('10000000-0000-0000-0000-000000000002', 22.5730, 88.4340, 22.5, 10, NOW() - INTERVAL '2 minutes'),
('10000000-0000-0000-0000-000000000002', 22.5735, 88.4345, 25.0, 8, NOW());

-- Rider 3: Near Howrah
INSERT INTO rider_locations (rider_id, lat, lng, speed_kmph, accuracy_m, recorded_at) VALUES
('10000000-0000-0000-0000-000000000003', 22.5958, 88.2636, 18.5, 20, NOW() - INTERVAL '6 minutes'),
('10000000-0000-0000-0000-000000000003', 22.5962, 88.2640, 20.0, 15, NOW() - INTERVAL '3 minutes'),
('10000000-0000-0000-0000-000000000003', 22.5968, 88.2645, 22.0, 12, NOW());

-- Rider 5: Near New Market
INSERT INTO rider_locations (rider_id, lat, lng, speed_kmph, accuracy_m, recorded_at) VALUES
('10000000-0000-0000-0000-000000000005', 22.5619, 88.3513, 15.0, 25, NOW() - INTERVAL '10 minutes'),
('10000000-0000-0000-0000-000000000005', 22.5625, 88.3518, 18.0, 20, NOW() - INTERVAL '5 minutes'),
('10000000-0000-0000-0000-000000000005', 22.5630, 88.3522, 20.0, 15, NOW() - INTERVAL '1 minute');

-- ============================================
-- Insert Sample Orders
-- ============================================
-- Pending order
INSERT INTO orders (id, customer_id, pickup_address, pickup_lat, pickup_lng, drop_address, drop_lat, drop_lng, delivery_otp, status) VALUES
('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 
 'Park Street, Kolkata', 22.5543, 88.3526,
 'Salt Lake, Kolkata', 22.5726, 88.4335,
 '123456', 'pending');

-- Assigned order
INSERT INTO orders (id, customer_id, pickup_address, pickup_lat, pickup_lng, drop_address, drop_lat, drop_lng, delivery_otp, status, assigned_at) VALUES
('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002',
 'New Market, Kolkata', 22.5619, 88.3513,
 'Howrah Station', 22.5831, 88.3429,
 '234567', 'assigned', NOW() - INTERVAL '10 minutes');

-- Delivered order
INSERT INTO orders (id, customer_id, pickup_address, pickup_lat, pickup_lng, drop_address, drop_lat, drop_lng, delivery_otp, status, assigned_at, picked_at, delivered_at) VALUES
('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003',
 'Esplanade, Kolkata', 22.5697, 88.3467,
 'Park Street, Kolkata', 22.5543, 88.3526,
 '345678', 'delivered', 
 NOW() - INTERVAL '1 hour', 
 NOW() - INTERVAL '50 minutes', 
 NOW() - INTERVAL '20 minutes');

-- ============================================
-- Insert Order Assignments
-- ============================================
-- Assignment for order 2
INSERT INTO order_assignments (id, order_id, rider_id, score, status, assigned_at, accepted_at) VALUES
('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 
 '10000000-0000-0000-0000-000000000002', 0.8750, 'accepted', 
 NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '8 minutes');

-- Completed assignment for order 3
INSERT INTO order_assignments (id, order_id, rider_id, score, status, assigned_at, accepted_at, completed_at) VALUES
('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003',
 '10000000-0000-0000-0000-000000000001', 0.9250, 'completed',
 NOW() - INTERVAL '1 hour', 
 NOW() - INTERVAL '55 minutes', 
 NOW() - INTERVAL '20 minutes');

-- ============================================
-- Insert Sample Ratings
-- ============================================
INSERT INTO ratings (order_id, rider_id, customer_id, rating, comment) VALUES
('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 
 '30000000-0000-0000-0000-000000000003', 5, 'Excellent service! Very fast delivery.');

-- ============================================
-- Insert Sample Devices (for multiple login detection)
-- ============================================
INSERT INTO devices (user_id, device_id, device_info, ip_address, last_seen, logged_out) VALUES
('10000000-0000-0000-0000-000000000001', 'device-rajesh-001', '{"model": "Samsung Galaxy", "os": "Android"}', '192.168.1.100', NOW(), false),
('10000000-0000-0000-0000-000000000002', 'device-vijay-001', '{"model": "iPhone 12", "os": "iOS"}', '192.168.1.101', NOW(), false);

-- ============================================
-- Insert Sample Fraud Events (for testing)
-- ============================================
INSERT INTO fraud_events (rider_id, order_id, event_type, details, severity, resolved) VALUES
('10000000-0000-0000-0000-000000000005', NULL, 'teleportation',
 '{"from": {"lat": 22.5619, "lng": 88.3513, "time": "2025-01-15T10:00:00Z"}, 
   "to": {"lat": 22.8619, "lng": 88.6513, "time": "2025-01-15T10:01:00Z"},
   "distance_km": 35.5, "time_seconds": 60, "calculated_speed_kmph": 2130}',
 'critical', false);

-- ============================================
-- Create test passwords info
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Seed data inserted successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '📝 TEST CREDENTIALS (password for all: "password123")';
    RAISE NOTICE 'Admin: 9999999999';
    RAISE NOTICE 'Customer 1: 9876543210 (Rahul)';
    RAISE NOTICE 'Customer 2: 9876543211 (Priya)';
    RAISE NOTICE 'Rider 1: 9123456789 (Rajesh)';
    RAISE NOTICE 'Rider 2: 9123456790 (Vijay)';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Remember to hash passwords properly when creating users via API!';
END $$;