const { haversineDistance } = require('../utils/haversine');
const FraudModel = require('../models/fraudModel');
const LocationService = require('./locationService');
const { pool } = require('../config/database');

class FraudService {

  /**
   * FRAUD DETECTION METHODS
   * 
   * 1. Teleportation: Impossible speed between location updates
   * 2. Fake Delivery: Completing order without being at drop location
   * 3. Multiple Logins: Same rider, different devices, different locations
   */

  /**
   * Check for fake GPS (teleportation)
   * If speed > MAX_SPEED_KMPH, flag it
   */
  static async checkTeleportation(riderId) {
    try {
      // Get last 2 locations
      const locations = await LocationService.getRecentLocations(riderId, 2);
      
      if (locations.length < 2) {
        return { suspicious: false, reason: 'Not enough location data' };
      }

      const [current, previous] = locations;

      // Calculate distance between points
      const distance = haversineDistance(
        previous.lat, previous.lng,
        current.lat, current.lng
      );

      // Calculate time difference in seconds
      const timeDiff = (new Date(current.recorded_at) - new Date(previous.recorded_at)) / 1000;

      if (timeDiff === 0 || timeDiff < 0) {
        return { suspicious: false, reason: 'Invalid time difference' };
      }

      // Calculate speed in km/h
      const hours = timeDiff / 3600;
      const calculatedSpeed = distance / hours;

      const MAX_SPEED = parseFloat(process.env.MAX_SPEED_KMPH) || 120;

      if (calculatedSpeed > MAX_SPEED) {
        // Determine severity based on speed
        let severity = 'medium';
        if (calculatedSpeed > 200) severity = 'critical';
        else if (calculatedSpeed > 150) severity = 'high';

        // Flag fraud event
        await FraudModel.create({
          rider_id: riderId,
          event_type: 'teleportation',
          details: {
            from: { 
              lat: previous.lat, 
              lng: previous.lng, 
              time: previous.recorded_at 
            },
            to: { 
              lat: current.lat, 
              lng: current.lng, 
              time: current.recorded_at 
            },
            distance_km: parseFloat(distance.toFixed(2)),
            time_seconds: parseFloat(timeDiff.toFixed(2)),
            calculated_speed_kmph: parseFloat(calculatedSpeed.toFixed(2)),
            max_allowed_speed: MAX_SPEED
          },
          severity
        });

        console.log(`🚨 Teleportation detected for rider ${riderId}: ${calculatedSpeed.toFixed(2)} km/h`);

        return { 
          suspicious: true, 
          reason: 'teleportation', 
          speed: parseFloat(calculatedSpeed.toFixed(2)),
          severity
        };
      }

      return { suspicious: false };
    } catch (error) {
      console.error('Error checking teleportation:', error);
      return { suspicious: false, error: error.message };
    }
  }

  /**
   * Check fake delivery completion
   * Rider must be within geofence of drop location
   */
  static async checkFakeDelivery(orderId, riderId) {
    try {
      // Get order drop location
      const orderQuery = `SELECT drop_lat, drop_lng FROM orders WHERE id = $1`;
      const orderResult = await pool.query(orderQuery, [orderId]);
      
      if (orderResult.rows.length === 0) {
        return { valid: false, reason: 'Order not found' };
      }

      const { drop_lat, drop_lng } = orderResult.rows[0];

      // Get rider's current location
      const riderLocation = await LocationService.getCurrentLocation(riderId);

      if (!riderLocation) {
        return { valid: false, reason: 'Rider location unknown' };
      }

      // Calculate distance from drop location
      const distance = haversineDistance(
        drop_lat, drop_lng,
        riderLocation.lat, riderLocation.lng
      );

      const MAX_DISTANCE_KM = (parseFloat(process.env.MIN_DELIVERY_GEOFENCE_METERS) || 50) / 1000;

      if (distance > MAX_DISTANCE_KM) {
        // Flag fraud
        await FraudModel.create({
          rider_id: riderId,
          order_id: orderId,
          event_type: 'fake_delivery',
          details: {
            drop_location: { lat: drop_lat, lng: drop_lng },
            rider_location: { 
              lat: riderLocation.lat, 
              lng: riderLocation.lng,
              timestamp: riderLocation.timestamp
            },
            distance_km: parseFloat(distance.toFixed(2)),
            max_allowed_km: MAX_DISTANCE_KM,
            distance_meters: parseFloat((distance * 1000).toFixed(2))
          },
          severity: 'high'
        });

        console.log(`🚨 Fake delivery detected for order ${orderId}: rider is ${distance.toFixed(2)} km away`);

        return { 
          valid: false, 
          reason: 'fake_delivery', 
          distance_km: parseFloat(distance.toFixed(2)),
          required_distance_km: MAX_DISTANCE_KM
        };
      }

      return { valid: true };
    } catch (error) {
      console.error('Error checking fake delivery:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Check multiple simultaneous logins
   * Same rider, different devices, different geolocations
   */
  static async checkMultipleLogins(riderId) {
    try {
      const query = `
        SELECT d.device_id, d.ip_address, d.last_seen, d.device_info
        FROM devices d
        WHERE d.user_id = $1 
          AND d.logged_out = false
          AND d.last_seen > NOW() - INTERVAL '5 minutes'
      `;
      
      const result = await pool.query(query, [riderId]);

      if (result.rows.length > 1) {
        // Multiple active sessions detected
        const severity = result.rows.length > 2 ? 'high' : 'medium';

        await FraudModel.create({
          rider_id: riderId,
          event_type: 'multiple_login',
          details: {
            devices: result.rows.map(d => ({
              device_id: d.device_id,
              ip_address: d.ip_address,
              last_seen: d.last_seen
            })),
            device_count: result.rows.length
          },
          severity
        });

        console.log(`🚨 Multiple logins detected for rider ${riderId}: ${result.rows.length} devices`);

        return { 
          suspicious: true, 
          reason: 'multiple_login', 
          device_count: result.rows.length,
          devices: result.rows
        };
      }

      return { suspicious: false };
    } catch (error) {
      console.error('Error checking multiple logins:', error);
      return { suspicious: false, error: error.message };
    }
  }

  /**
   * Run all fraud checks for a rider
   */
  static async runAllChecks(riderId, orderId = null) {
    try {
      const results = {
        rider_id: riderId,
        timestamp: new Date().toISOString(),
        checks: {}
      };

      // Check teleportation
      results.checks.teleportation = await this.checkTeleportation(riderId);

      // Check multiple logins
      results.checks.multipleLogin = await this.checkMultipleLogins(riderId);
      
      // Check fake delivery if order provided
      if (orderId) {
        results.checks.fakeDelivery = await this.checkFakeDelivery(orderId, riderId);
      }

      // Determine overall suspicion level
      const isSuspicious = 
        results.checks.teleportation.suspicious ||
        results.checks.multipleLogin.suspicious ||
        (results.checks.fakeDelivery && !results.checks.fakeDelivery.valid);

      results.is_suspicious = isSuspicious;

      return results;
    } catch (error) {
      console.error('Error running fraud checks:', error);
      throw error;
    }
  }

  /**
   * Get fraud risk score for rider (0-100)
   */
  static async getRiderFraudScore(riderId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_frauds,
          COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
          COUNT(*) FILTER (WHERE severity = 'high') as high_count,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as recent_frauds
        FROM fraud_events
        WHERE rider_id = $1
      `;
      
      const result = await pool.query(query, [riderId]);
      const stats = result.rows[0];

      // Calculate risk score (0-100)
      let score = 0;
      score += parseInt(stats.critical_count) * 25;
      score += parseInt(stats.high_count) * 15;
      score += parseInt(stats.recent_frauds) * 10;
      score = Math.min(100, score); // Cap at 100

      return {
        rider_id: riderId,
        fraud_score: score,
        risk_level: score > 70 ? 'high' : score > 40 ? 'medium' : 'low',
        stats
      };
    } catch (error) {
      console.error('Error getting rider fraud score :', error);
      throw error;
    }
  }

  /**
   * Check if rider should be blocked
   */
  static async shouldBlockRider(riderId) {
    try {
      const fraudScore = await this.getRiderFraudScore(riderId);
      return fraudScore.fraud_score > 70; // Block if score > 70
    } catch (error) {
      console.error('Error checking if rider should be blocked:', error);
      return false;
    }
  }
}

module.exports = FraudService;