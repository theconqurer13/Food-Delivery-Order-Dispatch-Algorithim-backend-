const { pool } = require('../config/database');

class OrderModel {

  /**
   * Create new order
   */
  static async create(orderData) {
    try {
      const query = `
        INSERT INTO orders (
          customer_id, pickup_address, pickup_lat, pickup_lng,
          drop_address, drop_lat, drop_lng, delivery_otp, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      // Generate random 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      const result = await pool.query(query, [
        orderData.customer_id,
        orderData.pickup_address,
        orderData.pickup_lat,
        orderData.pickup_lng,
        orderData.drop_address,
        orderData.drop_lat,
        orderData.drop_lng,
        otp,
        'pending'
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  static async getById(orderId) {
    const query = `
      SELECT 
        o.*,
        u.name as customer_name,
        u.phone as customer_phone
      FROM orders o
      LEFT JOIN users u ON o.customer_id = u.id
      WHERE o.id = $1
    `;
    const result = await pool.query(query, [orderId]);
    return result.rows[0];
  }

  /**
   * Update order status
   */
  static async updateStatus(orderId, status) {
    // Determine which timestamp field to update based on status
    const statusField = status === 'assigned' ? 'assigned_at' :
                       status === 'picked' ? 'picked_at' :
                       status === 'delivered' ? 'delivered_at' : null;
    
    let query = `UPDATE orders SET status = $1`;
    const params = [status, orderId];
    
    if (statusField) {
      query += `, ${statusField} = NOW()`;
    }
    
    query += ` WHERE id = $2 RETURNING *`;
    
    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * Get customer's orders
   */
  static async getCustomerOrders(customerId, limit = 20) {
    const query = `
      SELECT 
        o.*,
        (
          SELECT json_build_object(
            'id', u.id,
            'name', u.name,
            'phone', u.phone,
            'rating', r.rating_avg
          )
          FROM order_assignments oa
          JOIN users u ON oa.rider_id = u.id
          JOIN riders r ON r.rider_id = u.id
          WHERE oa.order_id = o.id AND oa.status = 'accepted'
          LIMIT 1
        ) as rider_info
      FROM orders o
      WHERE o.customer_id = $1 
      ORDER BY o.created_at DESC 
      LIMIT $2
    `;
    const result = await pool.query(query, [customerId, limit]);
    return result.rows;
  }

  /**
   * Get rider's active orders
   */
  static async getRiderActiveOrders(riderId) {
    const query = `
      SELECT 
        o.*,
        oa.assigned_at,
        oa.accepted_at,
        oa.status as assignment_status,
        u.name as customer_name,
        u.phone as customer_phone
      FROM orders o
      JOIN order_assignments oa ON o.id = oa.order_id
      JOIN users u ON o.customer_id = u.id
      WHERE oa.rider_id = $1 
        AND o.status IN ('assigned', 'picked')
        AND oa.status = 'accepted'
      ORDER BY oa.assigned_at DESC
    `;
    const result = await pool.query(query, [riderId]);
    return result.rows;
  }

  /**
   * Get all orders with filters
   */
  static async getAll(filters = {}, limit = 50) {
    let query = `
      SELECT 
        o.*,
        u.name as customer_name,
        u.phone as customer_phone
      FROM orders o
      LEFT JOIN users u ON o.customer_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (filters.status) {
      query += ` AND o.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }
    
    if (filters.customer_id) {
      query += ` AND o.customer_id = $${paramCount}`;
      params.push(filters.customer_id);
      paramCount++;
    }
    
    query += ` ORDER BY o.created_at DESC LIMIT $${paramCount}`;
    params.push(limit);
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Cancel order
   */
  static async cancel(orderId, reason = null) {
    const query = `
      UPDATE orders 
      SET status = 'cancelled'
      WHERE id = $1 AND status = 'pending'
      RETURNING *
    `;
    const result = await pool.query(query, [orderId]);
    return result.rows[0];
  }

  /**
   * Get order statistics
   */
  static async getStats(customerId = null) {
    let query = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned_orders,
        COUNT(CASE WHEN status = 'picked' THEN 1 END) as picked_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
      FROM orders
    `;
    
    const params = [];
    
    if (customerId) {
      query += ` WHERE customer_id = $1`;
      params.push(customerId);
    }
    
    const result = await pool.query(query, params);
    return result.rows[0];
  }
}

module.exports = OrderModel;