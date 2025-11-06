const { verifyToken } = require('../utils/jwt');
const LocationService = require('../services/locationService');
const FraudService = require('../services/fraudService');


/**
 * Socket.IO handler for real-time location tracking
 * 
 * Events:
 * - 'auth': Authenticate socket connection
 * - 'location:update': Rider sends location update
 * - 'location:subscribe': Client subscribes to rider's location
 * - 'location:unsubscribe': Client unsubscribes
 */

function setupSocketHandlers(io) {
  
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);
    
    // Store user info on socket
    socket.userData = null;

    /**
     * Authentication
     * Client sends: { token, device_id }
     */
    socket.on('auth', async (data) => {
      try {
        const { token, device_id } = data;

        if (!token) {
          socket.emit('error', { message: 'Token required' });
          return;
        }

        // Verify JWT token
        const decoded = verifyToken(token);
        
        if (!decoded) {
          socket.emit('error', { message: 'Invalid or expired token' });
          socket.disconnect();
          return;
        }

        // Store user data on socket
        socket.userData = {
          user_id: decoded.id,
          role: decoded.role,
          device_id: device_id || socket.id
        };

        // Join user-specific room
        socket.join(`user:${decoded.id}`);

        // If rider, join rider room
        if (decoded.role === 'rider') {
          socket.join(`rider:${decoded.id}`);
        }

        console.log(`✅ Authenticated: ${decoded.role} ${decoded.id}`);
        
        socket.emit('auth:success', { 
          message: 'Authenticated successfully',
          user_id: decoded.id,
          role: decoded.role
        });

      } catch (error) {
        console.error('Auth error:', error);
        socket.emit('error', { message: 'Authentication failed' });
      }
    });

    /**
     * Location update from rider
     * Client sends: { lat, lng, speed, accuracy, timestamp }
     */
    socket.on('location:update', async (data) => {
      try {
        if (!socket.userData || socket.userData.role !== 'rider') {
          socket.emit('error', { message: 'Only riders can send location updates' });
          return;
        }

        const { lat, lng, speed, accuracy, timestamp } = data;
        const riderId = socket.userData.user_id;

        // Validate data
        if (!lat || !lng) {
          socket.emit('error', { message: 'Latitude and longitude required' });
          return;
        }

        // Update location in Redis and DB
        await LocationService.updateLocation(riderId, {
          lat, lng, speed, accuracy, timestamp
        });

        // Run fraud check (teleportation detection)
        const fraudCheck = await FraudService.checkTeleportation(riderId);
        
        if (fraudCheck.suspicious) {
          console.log(`🚨 Fraud detected for rider ${riderId}`);
          
          // Notify admin
          io.to('admin').emit('fraud:alert', {
            rider_id: riderId,
            type: 'teleportation',
            details: fraudCheck,
            timestamp: new Date().toISOString()
          });
        }

        // Broadcast to subscribers (customers tracking this rider)
        io.to(`rider:${riderId}`).emit('location:updated', {
          rider_id: riderId,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          speed: parseFloat(speed) || 0,
          accuracy: parseFloat(accuracy) || 0,
          timestamp: timestamp || new Date().toISOString()
        });

        // Acknowledge to rider
        socket.emit('location:ack', { 
          success: true,
          fraud_check: fraudCheck.suspicious ? 'warning' : 'ok'
        });

      } catch (error) {
        console.error('Location update error:', error);
        socket.emit('error', { message: 'Failed to update location' });
      }
    });

    /**
     * Subscribe to rider's location updates
     * Client sends: { rider_id }
     */
    socket.on('location:subscribe', (data) => {
      try {
        const { rider_id } = data;

        if (!rider_id) {
          socket.emit('error', { message: 'Rider ID required' });
          return;
        }

        // Join rider's room to receive location updates
        socket.join(`rider:${rider_id}`);

        console.log(`👀 User ${socket.userData?.user_id} subscribed to rider ${rider_id}`);

        socket.emit('location:subscribed', { 
          rider_id,
          message: 'Subscribed to location updates'
        });

        // Send current location immediately
        LocationService.getCurrentLocation(rider_id)
          .then(location => {
            if (location) {
              socket.emit('location:current', {
                rider_id,
                ...location
              });
            }
          })
          .catch(err => console.error('Error getting current location:', err));

      } catch (error) {
        console.error('Subscribe error:', error);
        socket.emit('error', { message: 'Failed to subscribe' });
      }
    });

    /**
     * Unsubscribe from rider's location updates
     * Client sends: { rider_id }
     */
    socket.on('location:unsubscribe', (data) => {
      try {
        const { rider_id } = data;

        if (!rider_id) {
          socket.emit('error', { message: 'Rider ID required' });
          return;
        }

        socket.leave(`rider:${rider_id}`);

        console.log(`👋 User ${socket.userData?.user_id} unsubscribed from rider ${rider_id}`);

        socket.emit('location:unsubscribed', { 
          rider_id,
          message: 'Unsubscribed from location updates'
        });

      } catch (error) {
        console.error('Unsubscribe error:', error);
        socket.emit('error', { message: 'Failed to unsubscribe' });
      }
    });

    /**
     * Get rider's current location (one-time request)
     * Client sends: { rider_id }
     */
    socket.on('location:get', async (data) => {
      try {
        const { rider_id } = data;

        if (!rider_id) {
          socket.emit('error', { message: 'Rider ID required' });
          return;
        }

        const location = await LocationService.getCurrentLocation(rider_id);

        if (!location) {
          socket.emit('error', { message: 'Location not available' });
          return;
        }

        socket.emit('location:current', {
          rider_id,
          ...location
        });

      } catch (error) {
        console.error('Get location error:', error);
        socket.emit('error', { message: 'Failed to get location' });
      }
    });

    /**
     * Disconnect handler
     */
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
      
      if (socket.userData) {
        console.log(`User ${socket.userData.user_id} (${socket.userData.role}) disconnected`);
      }
    });

    /**
     * Error handler
     */
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('✅ Socket.IO handlers registered');
}

module.exports = setupSocketHandlers;