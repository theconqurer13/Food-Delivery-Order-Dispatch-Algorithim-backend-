-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Optional: Enable PostGIS for geographical queries
-- Uncomment if you want to use PostGIS
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'rider', 'admin')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index on phone for fast lookups
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- TABLE: riders (extended profile for riders)
-- ============================================
CREATE TABLE riders (
    rider_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    rating_avg NUMERIC(3, 2) DEFAULT 0 CHECK (rating_avg >= 0 AND rating_avg <= 5),
    total_deliveries INTEGER DEFAULT 0,
    vehicle_type VARCHAR(50) DEFAULT 'bike',
    experience_years INTEGER DEFAULT 0,
    available BOOLEAN DEFAULT true,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_riders_available ON riders(available);
CREATE INDEX idx_riders_rating ON riders(rating_avg DESC);

-- ============================================
-- TABLE: devices (for tracking multiple logins)
-- ============================================
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    device_info JSONB,
    ip_address VARCHAR(50),
    last_seen TIMESTAMP DEFAULT NOW(),
    logged_out BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE INDEX idx_devices_device_id ON devices(device_id);

-- ============================================
-- TABLE: rider_locations (location history)
-- ============================================
-- Option 1: WITHOUT PostGIS (simple lat/lng)
CREATE TABLE rider_locations (
    id BIGSERIAL PRIMARY KEY,
    rider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lat NUMERIC(10, 8) NOT NULL,
    lng NUMERIC(11, 8) NOT NULL,
    speed_kmph NUMERIC(6, 2) DEFAULT 0,
    accuracy_m NUMERIC(8, 2) DEFAULT 0,
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Option 2: WITH PostGIS (uncomment if PostGIS enabled)
-- CREATE TABLE rider_locations (
--     id BIGSERIAL PRIMARY KEY,
--     rider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--     location GEOGRAPHY(Point, 4326) NOT NULL,
--     speed_kmph NUMERIC(6, 2) DEFAULT 0,
--     accuracy_m NUMERIC(8, 2) DEFAULT 0,
--     recorded_at TIMESTAMP DEFAULT NOW()
-- );
-- CREATE INDEX idx_rider_locations_location ON rider_locations USING GIST(location);

CREATE INDEX idx_rider_locations_rider_time ON rider_locations(rider_id, recorded_at DESC);
CREATE INDEX idx_rider_locations_time ON rider_locations(recorded_at DESC);

-- ============================================
-- TABLE: orders
-- ============================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pickup_address TEXT NOT NULL,
    pickup_lat NUMERIC(10, 8) NOT NULL,
    pickup_lng NUMERIC(11, 8) NOT NULL,
    drop_address TEXT NOT NULL,
    drop_lat NUMERIC(10, 8) NOT NULL,
    drop_lng NUMERIC(11, 8) NOT NULL,
    delivery_otp VARCHAR(6),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'picked', 'delivered', 'cancelled')),
    created_at TIMESTAMP DEFAULT NOW(),
    assigned_at TIMESTAMP,
    picked_at TIMESTAMP,
    delivered_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- ============================================
-- TABLE: order_assignments
-- ============================================
CREATE TABLE order_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    rider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score NUMERIC(5, 4),
    status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'rejected', 'completed', 'cancelled')),
    assigned_at TIMESTAMP DEFAULT NOW(),
    accepted_at TIMESTAMP,
    completed_at TIMESTAMP,
    UNIQUE(order_id, rider_id)
);

CREATE INDEX idx_assignments_order ON order_assignments(order_id);
CREATE INDEX idx_assignments_rider ON order_assignments(rider_id);
CREATE INDEX idx_assignments_status ON order_assignments(status);

-- ============================================
-- TABLE: ratings
-- ============================================
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    rider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(order_id)
);

CREATE INDEX idx_ratings_rider ON ratings(rider_id);
CREATE INDEX idx_ratings_customer ON ratings(customer_id);

-- ============================================
-- TABLE: fraud_events
-- ============================================
CREATE TABLE fraud_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('teleportation', 'fake_delivery', 'multiple_login', 'other')),
    details JSONB NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fraud_rider ON fraud_events(rider_id);
CREATE INDEX idx_fraud_type ON fraud_events(event_type);
CREATE INDEX idx_fraud_severity ON fraud_events(severity);
CREATE INDEX idx_fraud_resolved ON fraud_events(resolved);
CREATE INDEX idx_fraud_created ON fraud_events(created_at DESC);

-- ============================================
-- Add updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_riders_updated_at BEFORE UPDATE ON riders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Database schema created successfully!';
END $$;