const express = require('express');
const router = express.Router();
const FraudController = require('../controllers/fraudControllers');
const { authenticate, authorize } = require('../middleware/authmiddleware');

// Admin-only fraud management routes
router.get('/events', 
  authenticate, 
  authorize('admin'), 
  FraudController.getAllEvents
);

router.get('/events/unresolved', 
  authenticate, 
  authorize('admin'), 
  FraudController.getUnresolved
);

router.post('/events/:id/resolve', 
  authenticate, 
  authorize('admin'), 
  FraudController.resolve
);

router.post('/checks/:rider_id', 
  authenticate, 
  authorize('admin'), 
  FraudController.runChecks
);

router.get('/score/:rider_id', 
  authenticate, 
  authorize('admin'), 
  FraudController.getFraudScore
);

router.get('/stats', 
  authenticate, 
  authorize('admin'), 
  FraudController.getStats
);

router.get('/top-fraudsters', 
  authenticate, 
  authorize('admin'), 
  FraudController.getTopFraudsters
);

// Rider can view their own fraud events
router.get('/rider/:rider_id', 
  authenticate, 
  FraudController.getRiderEvents
);

module.exports = router;