const { pool } = require('../config/database');
const redisClient = require('../config/redis');

class LocationService {

  /**
   * Update rider location
   * - Store in Redis for fast real-time access (TTL 30s)
   * - Periodically save to Postgres for history
   */
  static async updateLocation(riderId, locationData) {
    try {
      const { lat, lng, speed, accuracy, timestamp } = locationData;

      // Validate coordinates
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error('Invalid coordinates');
      }

      // Store in Redis with TTL
      const key = `rider:live:${riderId}`;
      const value = JSON.stringify({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        speed: parseFloat(speed) || 0,
        accuracy: parseFloat(accuracy) || 0,
        timestamp: timestamp || new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const ttl = parseInt(process.env.LOCATION_TTL_SECONDS) || 30;
      await redisClient.setEx(key, ttl, value);

      // Save to database for history
      await this.saveLocationToDb(riderId, lat, lng, speed, accuracy);

      return { 
        success: true, 
        riderId, 
        lat: parseFloat(lat), 
        lng: parseFloat(lng),
        stored_in: ['redis', 'postgres']
      };
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  }

  /**
   * Save location to PostgreSQL for history
   */
  static async saveLocationToDb(riderId, lat, lng, speed, accuracy) {
    try {
      const query = `
        INSERT INTO rider_locations (rider_id, lat, lng, speed_kmph, accuracy_m, recorded_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `;
      await pool.query(query, [
        riderId, 
        parseFloat(lat), 
        parseFloat(lng), 
        parseFloat(speed) || 0, 
        parseFloat(accuracy) || 0
      ]);
    } catch (error) {
      console.error('Error saving location to DB:', error);
      // Don't throw - we still have Redis data
    }
  }

  /**
   * Get rider's current location from Redis
   */
  static async getCurrentLocation(riderId) {
    try {
      const key = `rider:live:${riderId}`;
      const data = await redisClient.get(key);
      
      if (data) {
        return JSON.parse(data);
      }

      // Fallback to last DB location
      console.log(`Redis miss for ${riderId}, falling back to DB`);
      return await this.getLastDbLocation(riderId);
    } catch (error) {
      console.error('Error getting current location:', error);
      // Fallback to DB
      return await this.getLastDbLocation(riderId);
    }
  }

  /**
   * Get last location from database
   */
  static async getLastDbLocation(riderId) {
    try {
      const query = `
        SELECT 
          lat, 
          lng, 
          speed_kmph as speed, 
          accuracy_m as accuracy, 
          recorded_at as timestamp
        FROM rider_locations
        WHERE rider_id = $1
        ORDER BY recorded_at DESC
        LIMIT 1
      `;
      const result = await pool.query(query, [riderId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting last DB location:', error);
      return null;
    }
  }

  /**
   * Get location history for a rider
   */
  static async getLocationHistory(riderId, limit = 50) {
    try {
      const query = `
        SELECT 
          lat, 
          lng, 
          speed_kmph as speed,
          accuracy_m as accuracy,
          recorded_at as timestamp
        FROM rider_locations
        WHERE rider_id = $1
        ORDER BY recorded_at DESC
        LIMIT $2
      `;
      const result = await pool.query(query, [riderId, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error getting location history:', error);
      throw error;
    }
  }

  /**
   * Get recent locations for fraud detection
   */
  static async getRecentLocations(riderId, count = 2) {
    try {
      const query = `
        SELECT lat, lng, speed_kmph, accuracy_m, recorded_at
        FROM rider_locations
        WHERE rider_id = $1
        ORDER BY recorded_at DESC
        LIMIT $2
      `;
      const result = await pool.query(query, [riderId, count]);
      return result.rows;
    } catch (error) {
      console.error('Error getting recent locations:', error);
      throw error;
    }
  }

  /**
   * Delete old location records (cleanup job)
   */
  static async cleanupOldLocations(daysToKeep = 30) {
    try {
      const query = `
        DELETE FROM rider_locations
        WHERE recorded_at < NOW() - INTERVAL '${daysToKeep} days'
      `;
      const result = await pool.query(query);
      console.log(`Cleaned up ${result.rowCount} old location records`);
      return result.rowCount;
    } catch (error) {
      console.error('Error cleaning up old locations:', error);
      throw error;
    }
  }

  /**
   * Get all active riders with their last known locations
   */
  static async getActiveRidersLocations() {
    try {
      const query = `
        SELECT 
          r.rider_id,
          u.name,
          u.phone,
          r.available,
          rl.lat,
          rl.lng,
          rl.recorded_at as last_seen
        FROM riders r
        JOIN users u ON r.rider_id = u.id
        LEFT JOIN LATERAL (
          SELECT lat, lng, recorded_at
          FROM rider_locations
          WHERE rider_id = r.rider_id
          ORDER BY recorded_at DESC
          LIMIT 1
        ) rl ON true
        WHERE r.active = true
          AND rl.recorded_at > NOW() - INTERVAL '5 minutes'
        ORDER BY rl.recorded_at DESC
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting active riders locations:', error);
      throw error;
    }
  }

  /**
   * Batch update multiple locations (for testing/simulation)
   */
  static async batchUpdateLocations(updates) {
    try {
      const promises = updates.map(update => 
        this.updateLocation(update.riderId, update.location)
      );
      const results = await Promise.all(promises);
      return results;
    } catch (error) {
      console.error('Error in batch update:', error);
      throw error;
    }
  }
}

module.exports = LocationService;