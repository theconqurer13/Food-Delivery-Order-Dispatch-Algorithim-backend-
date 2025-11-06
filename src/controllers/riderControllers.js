const LocationService = require('../services/locationService');
const RiderModel = require('../models/riderModel');
const OrderModel = require('../models/orderModel');

class RiderController {

  /**
   * Update rider location (HTTP endpoint for testing)
   */
  static async updateLocation(req, res) {
    try {
      const { id } = req.params;
      const { lat, lng, speed, accuracy, timestamp } = req.body;

      const result = await LocationService.updateLocation(id, {
        lat, lng, speed, accuracy, timestamp
      });

      res.json({
        message: 'Location updated successfully',
        ...result
      });

    } catch (error) {
      console.error('Update location error:', error);
      res.status(500).json({ 
        error: 'Failed to update location',
        details: error.message 
      });
    }
  }

  /**
   * Get rider's current location
   */
  static async getLocation(req, res) {
    try {
      const { id } = req.params;
      
      const location = await LocationService.getCurrentLocation(id);
      
      if (!location) {
        return res.status(404).json({ error: 'Location not found' });
      }

      res.json({ location });

    } catch (error) {
      console.error('Get location error:', error);
      res.status(500).json({ error: 'Failed to fetch location' });
    }
  }

  /**
   * Get rider's location history
   */
  static async getLocationHistory(req, res) {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      
      const history = await LocationService.getLocationHistory(id, limit);
      
      res.json({ 
        count: history.length,
        history 
      });

    } catch (error) {
      console.error('Get location history error:', error);
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  }

  /**
   * Get rider's active orders
   */
  static async getActiveOrders(req, res) {
    try {
      const { id } = req.params;
      
      const orders = await OrderModel.getRiderActiveOrders(id);
      
      res.json({ 
        count: orders.length,
        orders 
      });

    } catch (error) {
      console.error('Get active orders error:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }

  /**
   * Get rider profile
   */
  static async getProfile(req, res) {
    try {
      const { id } = req.params;
      
      const rider = await RiderModel.getById(id);
      
      if (!rider) {
        return res.status(404).json({ error: 'Rider not found' });
      }

      res.json({ rider });

    } catch (error) {
      console.error('Get rider profile error:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }

  /**
   * Update rider availability
   */
  static async updateAvailability(req, res) {
    try {
      const { id } = req.params;
      const { available } = req.body;

      if (typeof available !== 'boolean') {
        return res.status(400).json({ error: 'Available must be boolean' });
      }

      const rider = await RiderModel.updateAvailability(id, available);

      if (!rider) {
        return res.status(404).json({ error: 'Rider not found' });
      }

      res.json({
        message: `Rider ${available ? 'available' : 'unavailable'}`,
        rider
      });

    } catch (error) {
      console.error('Update availability error:', error);
      res.status(500).json({ error: 'Failed to update availability' });
    }
  }

  /**
   * Get all riders (admin)
   */
  static async getAll(req, res) {
    try {
      const filters = {
        available: req.query.available === 'true' ? true : req.query.available === 'false' ? false : undefined,
        active: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined
      };
      
      const riders = await RiderModel.getAll(filters);
      
      res.json({ 
        count: riders.length,
        riders 
      });

    } catch (error) {
      console.error('Get all riders error:', error);
      res.status(500).json({ error: 'Failed to fetch riders' });
    }
  }
}

module.exports = RiderController;