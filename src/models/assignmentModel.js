const { pool } = require('../config/database');

class AssignmentModel {

  /**
   * Create new order assignment
   */
  static async create(orderId, riderId, score) {
    try {
      const query = `
        INSERT INTO order_assignments (order_id, rider_id, score, status)
        VALUES ($1, $2, $3, 'assigned')
        RETURNING *
      `;
      const result = await pool.query(query, [orderId, riderId, score]);
      return result.rows[0];
    } catch (error) {
      // Handle duplicate assignment
      if (error.code === '23505') {
        throw new Error('Order already assigned to this rider');
      }
      throw error;
    }
  }

  /**
   * Accept assignment (rider accepts the order)
   */
  static async accept(assignmentId, riderId) {
    const query = `
      UPDATE order_assignments 
      SET status = 'accepted', accepted_at = NOW()
      WHERE id = $1 AND rider_id = $2 AND status = 'assigned'
      RETURNING *
    `;
    const result = await pool.query(query, [assignmentId, riderId]);
    return result.rows[0];
  }

  /**
   * Reject assignment
   */
  static async reject(assignmentId, riderId) {
    const query = `
      UPDATE order_assignments 
      SET status = 'rejected'
      WHERE id = $1 AND rider_id = $2 AND status = 'assigned'
      RETURNING *
    `;
    const result = await pool.query(query, [assignmentId, riderId]);
    return result.rows[0];
  }

  /**
   * Complete assignment (order delivered)
   */
  static async complete(assignmentId, riderId) {
    const query = `
      UPDATE order_assignments 
      SET status = 'completed', completed_at = NOW()
      WHERE id = $1 AND rider_id = $2 AND status = 'accepted'
      RETURNING *
    `;
    const result = await pool.query(query, [assignmentId, riderId]);
    return result.rows[0];
  }

  /**
   * Get assignment by ID
   */
  static async getById(assignmentId) {
    const query = `
      SELECT 
        oa.*,
        u.name as rider_name,
        u.phone as rider_phone,
        o.pickup_address,
        o.drop_address,
        o.status as order_status
      FROM order_assignments oa
      JOIN users u ON oa.rider_id = u.id
      JOIN orders o ON oa.order_id = o.id
      WHERE oa.id = $1
    `;
    const result = await pool.query(query, [assignmentId]);
    return result.rows[0];
  }

  /**
   * Get assignments by order ID
   */
  static async getByOrderId(orderId) {
    const query = `
      SELECT 
        oa.*,
        u.name as rider_name,
        u.phone as rider_phone,
        r.rating_avg as rider_rating,
        r.vehicle_type
      FROM order_assignments oa
      JOIN users u ON oa.rider_id = u.id
      LEFT JOIN riders r ON r.rider_id = u.id
      WHERE oa.order_id = $1
      ORDER BY oa.assigned_at DESC
    `;
    const result = await pool.query(query, [orderId]);
    return result.rows;
  }

  /**
   * Get assignments by rider ID
   */
  static async getByRiderId(riderId, limit = 20) {
    const query = `
      SELECT 
        oa.*,
        o.pickup_address,
        o.drop_address,
        o.status as order_status,
        o.created_at as order_created_at,
        u.name as customer_name
      FROM order_assignments oa
      JOIN orders o ON oa.order_id = o.id
      JOIN users u ON o.customer_id = u.id
      WHERE oa.rider_id = $1
      ORDER BY oa.assigned_at DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [riderId, limit]);
    return result.rows;
  }

  /**
   * Get active assignment for rider
   */
  static async getActiveForRider(riderId) {
    const query = `
      SELECT 
        oa.*,
        o.*,
        u.name as customer_name,
        u.phone as customer_phone
      FROM order_assignments oa
      JOIN orders o ON oa.order_id = o.id
      JOIN users u ON o.customer_id = u.id
      WHERE oa.rider_id = $1 
        AND oa.status = 'accepted'
        AND o.status IN ('assigned', 'picked')
      LIMIT 1
    `;
    const result = await pool.query(query, [riderId]);
    return result.rows[0];
  }

  /**
   * Cancel all pending assignments for an order
   */
  static async cancelPendingForOrder(orderId) {
    const query = `
      UPDATE order_assignments 
      SET status = 'cancelled'
      WHERE order_id = $1 AND status = 'assigned'
      RETURNING *
    `;
    const result = await pool.query(query, [orderId]);
    return result.rows;
  }

  /**
   * Get assignment statistics
   */
  static async getStats(riderId = null) {
    let query = `
      SELECT 
        COUNT(*) as total_assignments,
        COUNT(CASE WHEN status = 'assigned' THEN 1 END) as pending_assignments,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_assignments,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_assignments,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_assignments,
        AVG(score) as avg_score
      FROM order_assignments
    `;
    
    const params = [];
    
    if (riderId) {
      query += ` WHERE rider_id = $1`;
      params.push(riderId);
    }
    
    const result = await pool.query(query, params);
    return result.rows[0];
  }
}

module.exports = AssignmentModel;