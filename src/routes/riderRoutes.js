const express = require('express');
const router = express.Router();
const RiderController = require('../controllers/riderControllers');
const { authenticate, authorize } = require('../middleware/authmiddleware');
const { validate, schemas } = require('../utils/validators');

// Update location (HTTP endpoint for testing)
router.post('/:id/location', 
  authenticate, 
  authorize('rider'), 
  validate(schemas.location), 
  RiderController.updateLocation
);

// Get current location
router.get('/:id/location', authenticate, RiderController.getLocation);

// Get location history
router.get('/:id/location/history', authenticate, RiderController.getLocationHistory);

// Get rider profile
router.get('/:id/profile', authenticate, RiderController.getProfile);

// Get active orders
router.get('/:id/orders/active', authenticate, authorize('rider'), RiderController.getActiveOrders);

// Update availability
router.put('/:id/availability', authenticate, authorize('rider'), RiderController.updateAvailability);

// Get all riders (admin only)
router.get('/', authenticate, authorize('admin'), RiderController.getAll);

module.exports = router;