require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const riderRoutes = require('./src/routes/riderRoutes');
const dispatchRoutes = require('./src/routes/dispatchRoutes');
const assignmentRoutes = require('./src/routes/assignmentRoutes');
const fraudRoutes = require('./src/routes/fraudRoutes');

// Import socket handler
const setupSocketHandlers = require('./src/sockets/socketHandler');

// Import jobs
const FraudJob = require('./src/jobs/fraudJob');

// Test database connection
const { pool } = require('./src/config/database');
const redisClient = require('./src/config/redis');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? 'https://your-frontend-domain.com' 
      : '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check PostgreSQL
    await pool.query('SELECT 1');
    
    // Check Redis
    await redisClient.ping();

    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        postgres: 'connected',
        redis: 'connected',
        websocket: 'running'
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message 
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/riders', riderRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/fraud', fraudRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Food Delivery Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      orders: '/api/orders',
      riders: '/api/riders',
      dispatch: '/api/dispatch',
      assignments: '/api/assignments',
      fraud: '/api/fraud'
    },
    websocket: {
      url: `ws://localhost:${PORT}`,
      events: ['auth', 'location:update', 'location:subscribe']
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Setup Socket.IO handlers
setupSocketHandlers(io);

// Start background jobs
FraudJob.start();
FraudJob.startCleanupJob();

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server running`);
  console.log(`🔗 API: http://localhost:${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`🔗 WebSocket: ws://localhost:${PORT}`);
  console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  
  server.close(async () => {
    console.log('HTTP server closed');
    
    // Close database connections
    await pool.end();
    await redisClient.quit();
    
    process.exit(0);
  });
});