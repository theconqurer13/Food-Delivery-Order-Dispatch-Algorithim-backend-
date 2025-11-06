const FraudModel = require('../models/fraudModel');
const FraudService = require('../services/fraudService');

class FraudController {

  /**
   * Get all fraud events
   * GET /api/admin/fraud-events
   */
  static async getAllEvents(req, res) {
    try {
      const filters = {
        rider_id: req.query.rider_id,
        event_type: req.query.event_type,
        severity: req.query.severity,
        resolved: req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined
      };
      const limit = parseInt(req.query.limit) || 50;

      const events = await FraudModel.getAll(filters, limit);

      res.json({
        count: events.length,
        events
      });

    } catch (error) {
      console.error('Get fraud events error:', error);
      res.status(500).json({ error: 'Failed to fetch fraud events' });
    }
  }

  /**
   * Get unresolved fraud events
   * GET /api/admin/fraud-events/unresolved
   */
  static async getUnresolved(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const events = await FraudModel.getUnresolved(limit);

      res.json({
        count: events.length,
        events
      });

    } catch (error) {
      console.error('Get unresolved events error:', error);
      res.status(500).json({ error: 'Failed to fetch unresolved events' });
    }
  }

  /**
   * Resolve fraud event
   * POST /api/admin/fraud-events/:id/resolve
   */
  static async resolve(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const event = await FraudModel.resolve(id, notes);

      if (!event) {
        return res.status(404).json({ error: 'Fraud event not found' });
      }

      res.json({
        message: 'Fraud event resolved',
        event
      });

    } catch (error) {
      console.error('Resolve fraud event error:', error);
      res.status(500).json({ error: 'Failed to resolve event' });
    }
  }

  /**
   * Run fraud checks on rider
   * POST /api/admin/fraud-checks/:rider_id
   */
  static async runChecks(req, res) {
    try {
      const { rider_id } = req.params;
      const { order_id } = req.body;

      const results = await FraudService.runAllChecks(rider_id, order_id);

      res.json({
        message: 'Fraud checks completed',
        results
      });

    } catch (error) {
      console.error('Run fraud checks error:', error);
      res.status(500).json({ error: 'Failed to run fraud checks' });
    }
  }

  /**
   * Get rider's fraud score
   * GET /api/admin/fraud-score/:rider_id
   */
  static async getFraudScore(req, res) {
    try {
      const { rider_id } = req.params;

      const score = await FraudService.getRiderFraudScore(rider_id);

      res.json(score);

    } catch (error) {
      console.error('Get fraud score error:', error);
      res.status(500).json({ error: 'Failed to calculate fraud score' });
    }
  }

  /**
   * Get fraud statistics
   * GET /api/admin/fraud-stats
   */
  static async getStats(req, res) {
    try {
      const timeframe = req.query.timeframe || '24 hours';
      const stats = await FraudModel.getStats(timeframe);

      res.json({ stats });

    } catch (error) {
      console.error('Get fraud stats error:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }

  /**
   * Get top fraudsters
   * GET /api/admin/fraud-events/top-fraudsters
   */
  static async getTopFraudsters(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const fraudsters = await FraudModel.getTopFraudsters(limit);

      res.json({
        count: fraudsters.length,
        fraudsters
      });

    } catch (error) {
      console.error('Get top fraudsters error:', error);
      res.status(500).json({ error: 'Failed to fetch top fraudsters' });
    }
  }

  /**
   * Get rider's fraud events
   * GET /api/fraud-events/rider/:rider_id
   */
  static async getRiderEvents(req, res) {
    try {
      const { rider_id } = req.params;
      const limit = parseInt(req.query.limit) || 10;

      const events = await FraudModel.getRiderEvents(rider_id, limit);

      res.json({
        count: events.length,
        events
      });

    } catch (error) {
      console.error('Get rider fraud events error:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  }
}

module.exports = FraudController;