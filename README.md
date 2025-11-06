# 🍕 Food Delivery Backend

Complete backend system for food delivery with real-time rider tracking, order dispatch algorithm, and fraud detection.

## 🎯 Features

1. **Real-time Location Tracking**
   - WebSocket-based live location updates
   - Redis for fast location caching
   - PostgreSQL for location history
   - Rider location broadcast to customers

2. **Smart Order Dispatch Algorithm**
   - Multi-factor scoring system (distance, rating, experience)
   - Automatic rider assignment
   - Configurable weights
   - Fallback reassignment

3. **Fraud Detection System**
   - Teleportation detection (impossible speeds)
   - Fake delivery prevention (geofencing)
   - Multiple login detection
   - Background jobs for continuous monitoring

4. **Complete API Suite**
   - Authentication (JWT)
   - Order management
   - Rider management
   - Assignment handling
   - Admin dashboard endpoints

---

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- PostgreSQL 13+ (with optional PostGIS)
- Redis 6+

### Installation
```bash
# Clone repository
git clone <repo-url>
cd food-delivery-backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials

# Start PostgreSQL and Redis
# Option 1: Using Docker Compose (recommended)
docker-compose up -d

# Option 2: Manual setup
# Start PostgreSQL and Redis services manually

# Run migrations
npm run migrate

# Seed test data
npm run seed

# Start server
npm run dev
```

### Using Docker Compose (Easiest)
```bash
# Start all services (PostgreSQL, Redis, App)
docker-compose up

# Stop services
docker-compose down
```

---

## 📁 Project Structure
```
food-delivery-backend/
├── src/
│   ├── config/           # Database & Redis config
│   ├── controllers/      # Request handlers
│   ├── models/          # Database queries
│   ├── services/        # Business logic
│   ├── routes/          # Route definitions
│   ├── middleware/      # Auth & validation
│   ├── utils/           # Helpers (haversine, JWT)
│   ├── sockets/         # WebSocket handlers
│   ├── jobs/            # Background jobs
│   └── server.js        # Entry point
├── migrations/          # SQL schema & seeds
├── postman/            # Postman collection
├── .env.example        # Environment template
├── docker-compose.yml  # Docker setup
└── package.json
```

---

## 🗄️ Database Schema

### Core Tables

1. **users** - All users (customers, riders, admin)
2. **riders** - Extended rider profiles
3. **orders** - Order details
4. **order_assignments** - Rider-order mappings
5. **rider_locations** - Location history
6. **ratings** - Customer ratings
7. **fraud_events** - Suspicious activities
8. **devices** - Multiple login tracking

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register     # Register new user
POST   /api/auth/login        # Login
POST   /api/auth/logout       # Logout
GET    /api/auth/profile      # Get profile
PUT    /api/auth/profile      # Update profile
```

### Orders
```
POST   /api/orders            # Create order
GET    /api/orders/:id        # Get order details
GET    /api/orders/customer/:customerId  # Customer's orders
POST   /api/orders/:id/cancel # Cancel order
GET    /api/orders/stats/overview        # Order statistics (admin)
```

### Riders
```
POST   /api/riders/:id/location           # Update location (HTTP)
GET    /api/riders/:id/location           # Get current location
GET    /api/riders/:id/location/history   # Location history
GET    /api/riders/:id/profile            # Rider profile
PUT    /api/riders/:id/availability       # Toggle availability
GET    /api/riders/:id/orders/active      # Active orders
GET    /api/riders                        # All riders (admin)
```

### Dispatch
```
POST   /api/dispatch/assign/:order_id     # Auto-assign rider
GET    /api/dispatch/candidates/:order_id # Get candidate riders
POST   /api/dispatch/reassign/:order_id   # Reassign order
```

### Assignments
```
POST   /api/assignments/:id/accept        # Accept order
POST   /api/assignments/:id/reject        # Reject order
POST   /api/assignments/:id/complete      # Complete delivery
GET    /api/assignments/:id               # Assignment details
GET    /api/assignments/rider/:rider_id   # Rider's assignments
GET    /api/assignments/order/:order_id   # Order's assignments
```

### Fraud Detection (Admin)
```
GET    /api/fraud/events                  # All fraud events
GET    /api/fraud/events/unresolved       # Unresolved events
POST   /api/fraud/events/:id/resolve      # Resolve event
POST   /api/fraud/checks/:rider_id        # Run fraud checks
GET    /api/fraud/score/:rider_id         # Rider fraud score
GET    /api/fraud/stats                   # Fraud statistics
GET    /api/fraud/top-fraudsters          # Top fraudsters list
```

---

## 🔥 WebSocket Events

### Client → Server
```javascript
// Authentication
socket.emit('auth', { token, device_id });

// Update location (rider only)
socket.emit('location:update', { 
  lat, lng, speed, accuracy, timestamp 
});

// Subscribe to rider's location
socket.emit('location:subscribe', { rider_id });

// Unsubscribe
socket.emit('location:unsubscribe', { rider_id });

// Get current location (one-time)
socket.emit('location:get', { rider_id });
```

### Server → Client
```javascript
// Authentication success
socket.on('auth:success', (data) => { ... });

// Location updated
socket.on('location:updated', (data) => { ... });

// Location acknowledgment
socket.on('location:ack', (data) => { ... });

// Current location
socket.on('location:current', (data) => { ... });

// Fraud alert (admin)
socket.on('fraud:alert', (data) => { ... });

// Errors
socket.on('error', (data) => { ... });
```

---

## 🧮 Dispatch Algorithm

### Scoring Formula
```
final_score = (w1 × distance_score) + 
              (w2 × rating_score) + 
              (w3 × experience_score) + 
              (w4 × availability_score)
```

### Default Weights
- **Distance**: 0.5 (50%) - Most important
- **Rating**: 0.25 (25%)
- **Experience**: 0.15 (15%)
- **Availability**: 0.10 (10%)

### Score Components

1. **Distance Score**: `1 / (1 + distance_km)`
2. **Rating Score**: `rating_avg / 5`
3. **Experience Score**: `min(1, log(deliveries+1) / log(1000))`
4. **Availability Score**: `1` (binary: available or not)

---

## 🕵️ Fraud Detection

### 1. Teleportation Detection
- **Trigger**: Speed > 120 km/h between location updates
- **Severity**: 
  - Critical: > 200 km/h
  - High: > 150 km/h
  - Medium: > 120 km/h

### 2. Fake Delivery Detection
- **Requirement**: Rider must be within 50 meters of drop location
- **Verification**: OTP + Geofencing
- **Action**: Block delivery completion if outside geofence

### 3. Multiple Login Detection
- **Trigger**: Same rider, different devices, simultaneous activity
- **Severity**:
  - High: > 2 devices
  - Medium: 2 devices

### Background Jobs
- **Fraud check job**: Runs every minute
- **Location cleanup**: Runs daily at 2 AM (removes records > 30 days)

---

## 🧪 Testing with Postman

### Setup Environment Variables
```
BASE_URL = http://localhost:3000
TOKEN = <paste JWT token after login>
RIDER_ID = <rider UUID>
ORDER_ID = <order UUID>
CUSTOMER_ID = <customer UUID>
```

### Test Flow

#### 1. Register & Login
```bash
# Register customer
POST {{BASE_URL}}/api/auth/register
{
  "name": "Test Customer",
  "phone": "9999988888",
  "email": "test@example.com",
  "password": "password123",
  "role": "customer"
}

# Register rider
POST {{BASE_URL}}/api/auth/register
{
  "name": "Test Rider",
  "phone": "8888877777",
  "email": "rider@example.com",
  "password": "password123",
  "role": "rider"
}

# Login as customer
POST {{BASE_URL}}/api/auth/login
{
  "phone": "9999988888",
  "password": "password123"
}
# Save token to environment variable
```

#### 2. Create Order
```bash
POST {{BASE_URL}}/api/orders
Headers: Authorization: Bearer {{TOKEN}}
{
  "customer_id": "{{CUSTOMER_ID}}",
  "pickup_address": "Park Street, Kolkata",
  "pickup_lat": 22.5543,
  "pickup_lng": 88.3526,
  "drop_address": "Salt Lake, Kolkata",
  "drop_lat": 22.5726,
  "drop_lng": 88.4335
}
# Save order_id from response
```

#### 3. Assign Rider
```bash
# Get candidates first (preview)
GET {{BASE_URL}}/api/dispatch/candidates/{{ORDER_ID}}
Headers: Authorization: Bearer {{TOKEN}}

# Assign order
POST {{BASE_URL}}/api/dispatch/assign/{{ORDER_ID}}
Headers: Authorization: Bearer {{TOKEN}}
```

#### 4. Rider Accepts Order
```bash
# Login as rider first
POST {{BASE_URL}}/api/auth/login
{
  "phone": "8888877777",
  "password": "password123"
}

# Accept assignment
POST {{BASE_URL}}/api/assignments/{{ASSIGNMENT_ID}}/accept
Headers: Authorization: Bearer {{TOKEN}}
{
  "rider_id": "{{RIDER_ID}}"
}
```

#### 5. Simulate Rider Movement
```bash
# Update location multiple times
POST {{BASE_URL}}/api/riders/{{RIDER_ID}}/location
Headers: Authorization: Bearer {{TOKEN}}
{
  "lat": 22.5543,
  "lng": 88.3526,
  "speed": 25.5,
  "accuracy": 10,
  "timestamp": "2025-01-15T10:00:00Z"
}

# Update again (moving closer to drop location)
POST {{BASE_URL}}/api/riders/{{RIDER_ID}}/location
{
  "lat": 22.5600,
  "lng": 88.3600,
  "speed": 30.0,
  "accuracy": 8,
  "timestamp": "2025-01-15T10:02:00Z"
}
```

#### 6. Complete Delivery
```bash
# Move to drop location first
POST {{BASE_URL}}/api/riders/{{RIDER_ID}}/location
{
  "lat": 22.5726,
  "lng": 88.4335,
  "speed": 0,
  "accuracy": 5
}

# Complete delivery
POST {{BASE_URL}}/api/assignments/{{ASSIGNMENT_ID}}/complete
{
  "rider_id": "{{RIDER_ID}}",
  "otp": "123456"
}
```

#### 7. Test Fraud Detection

**Teleportation Test:**
```bash
# Location 1
POST {{BASE_URL}}/api/riders/{{RIDER_ID}}/location
{
  "lat": 22.5543,
  "lng": 88.3526,
  "speed": 25,
  "timestamp": "2025-01-15T10:00:00Z"
}

# Location 2 (10 km away, 1 second later - impossible!)
POST {{BASE_URL}}/api/riders/{{RIDER_ID}}/location
{
  "lat": 22.6543,
  "lng": 88.4526,
  "speed": 25,
  "timestamp": "2025-01-15T10:00:01Z"
}

# Check fraud events
GET {{BASE_URL}}/api/fraud/events/unresolved
```

**Fake Delivery Test:**
```bash
# Try to complete delivery from far location
POST {{BASE_URL}}/api/riders/{{RIDER_ID}}/location
{
  "lat": 22.5000,
  "lng": 88.3000,
  "speed": 0
}

# Try to complete (should fail)
POST {{BASE_URL}}/api/assignments/{{ASSIGNMENT_ID}}/complete
{
  "rider_id": "{{RIDER_ID}}",
  "otp": "123456"
}
# Expected: Error - not within geofence
```

---

## 🧪 Testing WebSocket

### Using `wscat` (Terminal)
```bash
# Install wscat
npm install -g wscat

# Connect
wscat -c ws://localhost:3000

# Authenticate
> {"event": "auth", "data": {"token": "YOUR_JWT_TOKEN", "device_id": "test-device"}}

# Subscribe to rider location
> {"event": "location:subscribe", "data": {"rider_id": "RIDER_UUID"}}

# Update location (as rider)
> {"event": "location:update", "data": {"lat": 22.5543, "lng": 88.3526, "speed": 25, "accuracy": 10}}
```

### Using Postman WebSocket (if supported)

1. Create new WebSocket request
2. URL: `ws://localhost:3000`
3. Send auth message first
4. Then send location updates or subscribe messages

---

## ⚙️ Configuration

### Environment Variables
```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=food_delivery
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_secret_key_min_32_chars
JWT_EXPIRES_IN=7d

# Dispatch Algorithm
WEIGHT_DISTANCE=0.5
WEIGHT_RATING=0.25
WEIGHT_EXPERIENCE=0.15
WEIGHT_AVAILABILITY=0.1

# Fraud Detection
MAX_SPEED_KMPH=120
MIN_DELIVERY_GEOFENCE_METERS=50
MIN_DELIVERY_TIME_SECONDS=30

# Redis TTL
LOCATION_TTL_SECONDS=30
```

---

## 📊 Database Queries for Verification
```sql
-- Check registered users
SELECT id, name, phone, role FROM users;

-- Check riders with stats
SELECT u.name, r.rating_avg, r.total_deliveries, r.available 
FROM riders r 
JOIN users u ON r.rider_id = u.id;

-- Check recent orders
SELECT id, customer_id, status, pickup_address, drop_address, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- Check assignments
SELECT oa.id, o.id as order_id, u.name as rider_name, oa.score, oa.status
FROM order_assignments oa
JOIN orders o ON oa.order_id = o.id
JOIN users u ON oa.rider_id = u.id
ORDER BY oa.assigned_at DESC;

-- Check fraud events
SELECT fe.id, u.name as rider_name, fe.event_type, fe.severity, fe.resolved, fe.created_at
FROM fraud_events fe
JOIN users u ON fe.rider_id = u.id
ORDER BY fe.created_at DESC;

-- Check rider locations
SELECT u.name, rl.lat, rl.lng, rl.speed_kmph, rl.recorded_at
FROM rider_locations rl
JOIN users u ON rl.rider_id = u.id
ORDER BY rl.recorded_at DESC
LIMIT 20;
```

---

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps  # if using Docker
# or
pg_isready -h localhost -p 5432

# Test connection
psql -h localhost -U postgres -d food_delivery
```

### Redis Connection Issues
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Check Redis data
redis-cli
> KEYS rider:live:*
> GET rider:live:SOME_UUID
```

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change PORT in .env
```

### Migration Errors
```bash
# Reset database completely
npm run reset-db

# Or manually
psql -U postgres -c "DROP DATABASE food_delivery;"
psql -U postgres -c "CREATE DATABASE food_delivery;"
npm run migrate
npm run seed
```

---

## 📝 Assignment Checklist

### Features Implemented ✅

- [x] User authentication (JWT)
- [x] Customer registration & login
- [x] Rider registration & login
- [x] Order creation
- [x] Real-time location tracking (WebSocket)
- [x] Location storage (Redis + PostgreSQL)
- [x] Order dispatch algorithm
- [x] Multi-factor rider scoring
- [x] Automatic rider assignment
- [x] Order acceptance/rejection
- [x] Delivery completion
- [x] Fraud detection - Teleportation
- [x] Fraud detection - Fake delivery
- [x] Fraud detection - Multiple logins
- [x] Background fraud monitoring jobs
- [x] Admin fraud dashboard endpoints
- [x] Rider ratings system
- [x] Location history tracking
- [x] Order statistics
- [x] Geofencing for delivery verification
- [x] OTP verification for delivery

### Demo Screenshots Required 📸

1. **Postman - User Registration**
2. **Postman - User Login (with JWT token)**
3. **Postman - Create Order**
4. **Postman - Get Candidate Riders (with scores)**
5. **Postman - Assign Order**
6. **Postman - Update Rider Location**
7. **Postman - Complete Delivery**
8. **Postman - Fraud Detection (teleportation)**
9. **Database - Orders Table**
10. **Database - Order Assignments Table**
11. **Database - Fraud Events Table**
12. **Redis - Live Location Data**

### How to Demo 🎬

1. **Setup**: Show docker-compose up and migrations
2. **Registration**: Register customer and rider
3. **Order Creation**: Create new order via Postman
4. **Dispatch**: Show candidate riders with scores, then assign
5. **Tracking**: Update rider