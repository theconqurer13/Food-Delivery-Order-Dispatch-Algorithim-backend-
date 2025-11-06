const OrderModel = require('../models/orderModel');

class OrderController {

  /**
   * Create new order
   */
  static async create(req, res) {
    try {
      const { 
        customer_id, 
        pickup_address, pickup_lat, pickup_lng,
        drop_address, drop_lat, drop_lng 
      } = req.body;

      // Create order
      const order = await OrderModel.create({
        customer_id,
        pickup_address, pickup_lat, pickup_lng,
        drop_address, drop_lat, drop_lng
      });

      res.status(201).json({
        message: 'Order created successfully',
        order
      });

    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ 
        error: 'Failed to create order',
        details: error.message 
      });
    }
  }

  /**
   * Get order details
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;
      
      const order = await OrderModel.getById(id);
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      res.json({ order });

    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({ error: 'Failed to fetch order' });
    }
  }

  /**
   * Get customer's orders
   */
  static async getCustomerOrders(req, res) {
    try {
      const { customerId } = req.params;
      const limit = parseInt(req.query.limit) || 20;
      
      const orders = await OrderModel.getCustomerOrders(customerId, limit);
      
      res.json({ 
        count: orders.length,
        orders 
      });

    } catch (error) {
      console.error('Get customer orders error:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }

  /**
   * Get all orders (admin)
   */
  static async getAll(req, res) {
    try {
      const filters = {
        status: req.query.status,
        customer_id: req.query.customer_id
      };
      const limit = parseInt(req.query.limit) || 50;
      
      const orders = await OrderModel.getAll(filters, limit);
      
      res.json({ 
        count: orders.length,
        orders 
      });

    } catch (error) {
      console.error('Get all orders error:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }

  /**
   * Cancel order
   */
  static async cancel(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const order = await OrderModel.cancel(id, reason);
      
      if (!order) {
        return res.status(404).json({ 
          error: 'Order not found or cannot be cancelled' 
        });
      }

      res.json({
        message: 'Order cancelled successfully',
        order
      });

    } catch (error) {
      console.error('Cancel order error:', error);
      res.status(500).json({ error: 'Failed to cancel order' });
    }
  }

  /**
   * Get order statistics
   */
  static async getStats(req, res) {
    try {
      const stats = await OrderModel.getStats();
      
      res.json({ stats });

    } catch (error) {
      console.error('Get order stats error:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }
}

module.exports = OrderController;