const express = require('express');
const router = express.Router();
const DispatchController = require('../controllers/dispatchControllers');
const { authenticate, authorize } = require('../middleware/authmiddleware');

// Assign order to rider
router.post('/assign/:order_id', 
  authenticate, 
  authorize('admin'), 
  DispatchController.assignOrder
);

// Get candidate riders with scores
router.get('/candidates/:order_id', 
  authenticate, 
  DispatchController.getCandidates
);

// Reassign order
router.post('/reassign/:order_id', 
  authenticate, 
  authorize('admin'), 
  DispatchController.reassignOrder
);

module.exports = router;