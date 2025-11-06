const DispatchService = require('../services/dispatchServices');
const OrderModel = require('../models/orderModel');

class DispatchController {

  /**
   * Assign order to best available rider
   * POST /api/dispatch/assign/:order_id
   */
  static async assignOrder(req, res) {
    try {
      const { order_id } = req.params;

      // Check if order exists
      const order = await OrderModel.getById(order_id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Run dispatch algorithm
      const result = await DispatchService.assignOrder(order_id);

      res.json({
        message: 'Order assigned successfully',
        assignment: result.assignment,
        selected_rider: {
          id: result.rider.id,
          name: result.rider.name,
          phone: result.rider.phone,
          distance_km: result.rider.distance_km,
          final_score: result.rider.final_score
        },
        all_candidates: result.allCandidates.map(r => ({
          id: r.id,
          name: r.name,
          distance_km: r.distance_km,
          rating: r.rating_avg,
          total_deliveries: r.total_deliveries,
          final_score: r.final_score
        }))
      });

    } catch (error) {
      console.error('Assign order error:', error);
      res.status(500).json({ 
        error: 'Failed to assign order',
        details: error.message 
      });
    }
  }

  /**
   * Get candidate riders with scores (preview)
   * GET /api/dispatch/candidates/:order_id
   */
  static async getCandidates(req, res) {
    try {
      const { order_id } = req.params;

      const order = await OrderModel.getById(order_id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const candidates = await DispatchService.getCandidates(order_id);

      if (candidates.length === 0) {
        return res.json({
          message: 'No riders available nearby',
          candidates: []
        });
      }

      res.json({
        order_id,
        pickup_location: {
          lat: order.pickup_lat,
          lng: order.pickup_lng
        },
        candidate_count: candidates.length,
        candidates: candidates.map(r => ({
          rider_id: r.id,
          name: r.name,
          phone: r.phone,
          distance_km: r.distance_km,
          rating: r.rating_avg,
          total_deliveries: r.total_deliveries,
          final_score: r.final_score,
          score_breakdown: r.score_breakdown
        }))
      });

    } catch (error) {
      console.error('Get candidates error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch candidates',
        details: error.message 
      });
    }
  }

  /**
   * Reassign order if rider rejects
   * POST /api/dispatch/reassign/:order_id
   */
  static async reassignOrder(req, res) {
    try {
      const { order_id } = req.params;

      const result = await DispatchService.reassignOrder(order_id);

      res.json({
        message: 'Order reassigned successfully',
        assignment: result.assignment,
        new_rider: result.rider
      });

    } catch (error) {
      console.error('Reassign order error:', error);
      res.status(500).json({ 
        error: 'Failed to reassign order',
        details: error.message 
      });
    }
  }
}

module.exports = DispatchController;