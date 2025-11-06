const { pool } = require('../config/database');

class FraudModel {

  /**
   * Create fraud event
   */
  static async create(fraudData) {
    try {
      const query = `
        INSERT INTO fraud_events (rider_id, order_id, event_type, details, severity, resolved)
        VALUES ($1, $2, $3, $4, $5, false)
        RETURNING *
      `;
      const result = await pool.query(query, [
        fraudData.rider_id,
        fraudData.order_id || null,
        fraudData.event_type,
        JSON.stringify(fraudData.details),
        fraudData.severity || 'medium'
      ]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating fraud event:', error);
      throw error;
    }
  }

  /**
   * Get unresolved fraud events
   */
  static async getUnresolved(limit = 50) {
    const query = `
      SELECT 
        fe.*,
        u.name as rider_name, 
        u.phone as rider_phone,
        ri.rating_avg,
        ri.total_deliveries
      FROM fraud_events fe
      JOIN users u ON fe.rider_id = u.id
      LEFT JOIN riders ri ON u.id = ri.rider_id
      WHERE fe.resolved = false
      ORDER BY fe.created_at DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  /**
   * Get all fraud events with filters
   */
  static async getAll(filters = {}, limit = 50) {
    let query = `
      SELECT 
        fe.*,
        u.name as rider_name,
        u.phone as rider_phone
      FROM fraud_events fe
      JOIN users u ON fe.rider_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (filters.rider_id) {
      query += ` AND fe.rider_id = $${paramCount}`;
      params.push(filters.rider_id);
      paramCount++;
    }
    
    if (filters.event_type) {
      query += ` AND fe.event_type = $${paramCount}`;
      params.push(filters.event_type);
      paramCount++;
    }
    
    if (filters.severity) {
      query += ` AND fe.severity = $${paramCount}`;
      params.push(filters.severity);
      paramCount++;
    }
    
    if (filters.resolved !== undefined) {
      query += ` AND fe.resolved = $${paramCount}`;
      params.push(filters.resolved);
      paramCount++;
    }
    
    query += ` ORDER BY fe.created_at DESC LIMIT $${paramCount}`;
    params.push(limit);
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Resolve fraud event
   */
  static async resolve(eventId, notes = null) {
    const query = `
      UPDATE fraud_events 
      SET resolved = true, 
          details = jsonb_set(details, '{resolution_notes}', to_jsonb($2::text), true),
          details = jsonb_set(details, '{resolved_at}', to_jsonb(NOW()::text), true)
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [eventId, notes]);
    return result.rows[0];
  }

  /**
   * Get rider's fraud events
   */
  static async getRiderEvents(riderId, limit = 10) {
    const query = `
      SELECT * FROM fraud_events 
      WHERE rider_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    const result = await pool.query(query, [riderId, limit]);
    return result.rows;
  }

  /**
   * Get fraud event by ID
   */
  static async getById(eventId) {
    const query = `
      SELECT 
        fe.*,
        u.name as rider_name,
        u.phone as rider_phone,
        o.pickup_address,
        o.drop_address
      FROM fraud_events fe
      JOIN users u ON fe.rider_id = u.id
      LEFT JOIN orders o ON fe.order_id = o.id
      WHERE fe.id = $1
    `;
    const result = await pool.query(query, [eventId]);
    return result.rows[0];
  }

  /**
   * Get fraud statistics
   */
  static async getStats(timeframe = '24 hours') {
    const query = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE event_type = 'teleportation') as teleportation_count,
        COUNT(*) FILTER (WHERE event_type = 'fake_delivery') as fake_delivery_count,
        COUNT(*) FILTER (WHERE event_type = 'multiple_login') as multiple_login_count,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
        COUNT(*) FILTER (WHERE severity = 'high') as high_count,
        COUNT(*) FILTER (WHERE severity = 'medium') as medium_count,
        COUNT(*) FILTER (WHERE severity = 'low') as low_count,
        COUNT(*) FILTER (WHERE resolved = true) as resolved_count,
        COUNT(*) FILTER (WHERE resolved = false) as unresolved_count
      FROM fraud_events
      WHERE created_at > NOW() - INTERVAL '${timeframe}'
    `;
    const result = await pool.query(query);
    return result.rows[0];
  }

  /**
   * Check if rider has recent fraud events
   */
  static async hasRecentFraud(riderId, hours = 24) {
    const query = `
      SELECT COUNT(*) as fraud_count
      FROM fraud_events
      WHERE rider_id = $1
        AND created_at > NOW() - INTERVAL '${hours} hours'
        AND severity IN ('high', 'critical')
    `;
    const result = await pool.query(query, [riderId]);
    return parseInt(result.rows[0].fraud_count) > 0;
  }

  /**
   * Get riders with most fraud events
   */
  static async getTopFraudsters(limit = 10) {
    const query = `
      SELECT 
        fe.rider_id,
        u.name as rider_name,
        u.phone as rider_phone,
        COUNT(*) as fraud_count,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
        MAX(fe.created_at) as last_fraud_at
      FROM fraud_events fe
      JOIN users u ON fe.rider_id = u.id
      WHERE fe.created_at > NOW() - INTERVAL '30 days'
      GROUP BY fe.rider_id, u.name, u.phone
      ORDER BY fraud_count DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }
}

module.exports = FraudModel;