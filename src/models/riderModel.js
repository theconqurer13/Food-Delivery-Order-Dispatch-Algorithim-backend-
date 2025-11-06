const { pool } = require('../config/database');
const { haversineDistance, getBoundingBox } = require('../utils/haversine');

class RiderModel {

  /**
   * Create rider profile (called after user creation)
   */
  static async create(riderId, data = {}) {
    try {
      const query = `
        INSERT INTO riders (rider_id, vehicle_type, experience_years, rating_avg, total_deliveries, available, active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const result = await pool.query(query, [
        riderId,
        data.vehicle_type || 'bike',
        data.experience_years || 0,
        data.rating_avg || 0,
        data.total_deliveries || 0,
        data.available !== undefined ? data.available : true,
        data.active !== undefined ? data.active : true
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating rider profile:', error);
      throw error;
    }
  }

  /**
   * Get nearby available riders WITHOUT PostGIS
   * Uses bounding box optimization + Haversine filtering
   */
  static async getNearbyRiders(lat, lng, radiusKm = 5) {
    try {
      // First, get bounding box to limit SQL search
      const bbox = getBoundingBox(lat, lng, radiusKm);
      
      const query = `
        SELECT 
          u.id, u.name, u.phone,
          r.rating_avg, r.total_deliveries, r.experience_years, r.vehicle_type,
          rl.lat, rl.lng, rl.recorded_at as last_location_time
        FROM riders r
        JOIN users u ON r.rider_id = u.id
        LEFT JOIN LATERAL (
          SELECT lat, lng, recorded_at 
          FROM rider_locations 
          WHERE rider_id = r.rider_id 
          ORDER BY recorded_at DESC 
          LIMIT 1
        ) rl ON true
        WHERE r.available = true 
          AND r.active = true
          AND rl.lat IS NOT NULL
          AND rl.lat BETWEEN $1 AND $2
          AND rl.lng BETWEEN $3 AND $4
      `;
      
      const result = await pool.query(query, [
        bbox.minLat, bbox.maxLat, bbox.minLng, bbox.maxLng
      ]);

      // Filter by actual distance using Haversine
      const riders = result.rows.filter(rider => {
        const distance = haversineDistance(lat, lng, rider.lat, rider.lng);
        rider.distance_km = distance;
        return distance <= radiusKm;
      });

      return riders;
    } catch (error) {
      console.error('Error getting nearby riders:', error);
      throw error;
    }
  }

  /**
   * Get nearby riders WITH PostGIS (if PostGIS is enabled)
   * Uncomment and use this if you have PostGIS extension
   */
  static async getNearbyRidersPostGIS(lat, lng, radiusKm = 5) {
    try {
      const query = `
        SELECT 
          u.id, u.name, u.phone,
          r.rating_avg, r.total_deliveries, r.experience_years, r.vehicle_type,
          ST_Y(rl.location::geometry) as lat,
          ST_X(rl.location::geometry) as lng,
          ST_DistanceSphere(
            rl.location, 
            ST_MakePoint($2, $1)::geography
          ) / 1000 as distance_km,
          rl.recorded_at as last_location_time
        FROM riders r
        JOIN users u ON r.rider_id = u.id
        LEFT JOIN LATERAL (
          SELECT location, recorded_at 
          FROM rider_locations 
          WHERE rider_id = r.rider_id 
          ORDER BY recorded_at DESC 
          LIMIT 1
        ) rl ON true
        WHERE r.available = true 
          AND r.active = true
          AND rl.location IS NOT NULL
          AND ST_DWithin(
            rl.location,
            ST_MakePoint($2, $1)::geography,
            $3
          )
        ORDER BY distance_km ASC
      `;
      
      const result = await pool.query(query, [lat, lng, radiusKm * 1000]); // radius in meters
      return result.rows;
    } catch (error) {
      console.error('Error getting nearby riders (PostGIS):', error);
      throw error;
    }
  }

  /**
   * Update rider availability status
   */
  static async updateAvailability(riderId, available) {
    const query = `
      UPDATE riders 
      SET available = $1, updated_at = NOW() 
      WHERE rider_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [available, riderId]);
    return result.rows[0];
  }

  /**
   * Get rider details by ID
   */
  static async getById(riderId) {
    const query = `
      SELECT 
        u.id, u.name, u.phone, u.email, u.role,
        r.rating_avg, r.total_deliveries, r.vehicle_type,
        r.experience_years, r.available, r.active,
        r.created_at
      FROM users u
      JOIN riders r ON u.id = r.rider_id
      WHERE u.id = $1
    `;
    const result = await pool.query(query, [riderId]);
    return result.rows[0];
  }

  /**
   * Update rider rating (after delivery)
   */
  static async updateRating(riderId) {
    const query = `
      UPDATE riders
      SET rating_avg = (
        SELECT AVG(rating) FROM ratings WHERE rider_id = $1
      ),
      total_deliveries = total_deliveries + 1
      WHERE rider_id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [riderId]);
    return result.rows[0];
  }

  /**
   * Get all riders with filters
   */
  static async getAll(filters = {}) {
    let query = `
      SELECT 
        u.id, u.name, u.phone,
        r.rating_avg, r.total_deliveries, r.vehicle_type,
        r.experience_years, r.available, r.active
      FROM riders r
      JOIN users u ON r.rider_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (filters.available !== undefined) {
      query += ` AND r.available = $${paramCount}`;
      params.push(filters.available);
      paramCount++;
    }
    
    if (filters.active !== undefined) {
      query += ` AND r.active = $${paramCount}`;
      params.push(filters.active);
      paramCount++;
    }
    
    query += ` ORDER BY r.rating_avg DESC, r.total_deliveries DESC`;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Deactivate rider
   */
  static async deactivate(riderId) {
    const query = `
      UPDATE riders 
      SET active = false, available = false 
      WHERE rider_id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [riderId]);
    return result.rows[0];
  }
}

module.exports = RiderModel;