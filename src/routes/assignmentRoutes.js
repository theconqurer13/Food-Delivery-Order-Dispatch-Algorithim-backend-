const express = require('express');
const router = express.Router();
const AssignmentController = require('../controllers/assignmentController');
const { authenticate, authorize } = require('../middleware/authmiddleware');
const { validate, schemas } = require('../utils/validators');

// Accept assignment
router.post('/:id/accept', 
  authenticate, 
  authorize('rider'), 
  validate(schemas.assignmentAccept), 
  AssignmentController.accept
);

// Reject assignment
router.post('/:id/reject', 
  authenticate, 
  authorize('rider'), 
  AssignmentController.reject
);

// Complete delivery
router.post('/:id/complete', 
  authenticate, 
  authorize('rider'), 
  validate(schemas.assignmentComplete), 
  AssignmentController.complete
);

// Get assignment by ID
router.get('/:id', authenticate, AssignmentController.getById);

// Get rider's assignments
router.get('/rider/:rider_id', authenticate, AssignmentController.getRiderAssignments);

// Get order's assignments
router.get('/order/:order_id', authenticate, AssignmentController.getOrderAssignments);

module.exports = router;