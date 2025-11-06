const AssignmentModel = require('../models/assignmentModel');
const OrderModel = require('../models/orderModel');
const FraudService = require('../services/fraudService');
const RiderModel = require('../models/riderModel');

class AssignmentController {

  /**
   * Accept order assignment
   * POST /api/assignments/:id/accept
   */
  static async accept(req, res) {
    try {
      const { id } = req.params;
      const { rider_id } = req.body;

      // Verify rider_id matches authenticated user
      if (req.user.role !== 'rider' && req.user.id !== rider_id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const assignment = await AssignmentModel.accept(id, rider_id);

      if (!assignment) {
        return res.status(404).json({ 
          error: 'Assignment not found or already processed' 
        });
      }

      // Update order status
      await OrderModel.updateStatus(assignment.order_id, 'assigned');

      res.json({
        message: 'Assignment accepted',
        assignment
      });

    } catch (error) {
      console.error('Accept assignment error:', error);
      res.status(500).json({ error: 'Failed to accept assignment' });
    }
  }

  /**
   * Reject order assignment
   * POST /api/assignments/:id/reject
   */
  static async reject(req, res) {
    try {
      const { id } = req.params;
      const { rider_id } = req.body;

      const assignment = await AssignmentModel.reject(id, rider_id);

      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      // Make rider available again
      await RiderModel.updateAvailability(rider_id, true);

      res.json({
        message: 'Assignment rejected',
        assignment,
        note: 'Order needs to be reassigned'
      });

    } catch (error) {
      console.error('Reject assignment error:', error);
      res.status(500).json({ error: 'Failed to reject assignment' });
    }
  }

  /**
   * Complete order delivery
   * POST /api/assignments/:id/complete
   */
  static async complete(req, res) {
    try {
      const { id } = req.params;
      const { rider_id, otp } = req.body;

      // Get assignment details
      const assignment = await AssignmentModel.getById(id);
      
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      if (assignment.rider_id !== rider_id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Get order details
      const order = await OrderModel.getById(assignment.order_id);

      // Verify OTP if provided
      if (otp && order.delivery_otp !== otp) {
        return res.status(400).json({ error: 'Invalid OTP' });
      }

      // FRAUD CHECK: Verify rider is at delivery location
      const fraudCheck = await FraudService.checkFakeDelivery(
        assignment.order_id, 
        rider_id
      );

      if (!fraudCheck.valid) {
        return res.status(400).json({
          error: 'Delivery location verification failed',
          details: fraudCheck.reason,
          distance_km: fraudCheck.distance_km,
          required_distance_km: fraudCheck.required_distance_km,
          message: 'You must be within 50 meters of drop location to complete delivery'
        });
      }

      // Complete assignment
      const completedAssignment = await AssignmentModel.complete(id, rider_id);

      // Update order status
      await OrderModel.updateStatus(assignment.order_id, 'delivered');

      // Update rider stats and availability
      await RiderModel.updateRating(rider_id);
      await RiderModel.updateAvailability(rider_id, true);

      res.json({
        message: 'Delivery completed successfully',
        assignment: completedAssignment,
        fraud_check: fraudCheck
      });

    } catch (error) {
      console.error('Complete assignment error:', error);
      res.status(500).json({ 
        error: 'Failed to complete delivery',
        details: error.message 
      });
    }
  }

  /**
   * Get assignment by ID
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const assignment = await AssignmentModel.getById(id);

      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      res.json({ assignment });

    } catch (error) {
      console.error('Get assignment error:', error);
      res.status(500).json({ error: 'Failed to fetch assignment' });
    }
  }

  /**
   * Get rider's assignments
   */
  static async getRiderAssignments(req, res) {
    try {
      const { rider_id } = req.params;
      const { status } = req.query;

      const assignments = await AssignmentModel.getByRiderId(rider_id, status);

      res.json({
        count: assignments.length,
        assignments
      });

    } catch (error) {
      console.error('Get rider assignments error:', error);
      res.status(500).json({ error: 'Failed to fetch assignments' });
    }
  }

  /**
   * Get order's assignments
   */
  static async getOrderAssignments(req, res) {
    try {
      const { order_id } = req.params;

      const assignments = await AssignmentModel.getByOrderId(order_id);

      res.json({
        count: assignments.length,
        assignments
      });

    } catch (error) {
      console.error('Get order assignments error:', error);
      res.status(500).json({ error: 'Failed to fetch assignments' });
    }
  }
}

module.exports = AssignmentController;