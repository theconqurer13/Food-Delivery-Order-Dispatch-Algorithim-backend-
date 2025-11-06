const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/orderControllers');
const { authenticate, authorize } = require('../middleware/authmiddleware');
const { validate, schemas } = require('../utils/validators');

// Create order (customer only)
router.post('/', 
  authenticate, 
  authorize('customer'), 
  validate(schemas.order), 
  OrderController.create
);

// Get order by ID
router.get('/:id', authenticate, OrderController.getById);

// Get customer's orders
router.get('/customer/:customerId', authenticate, OrderController.getCustomerOrders);

// Get all orders (admin only)
router.get('/', authenticate, authorize('admin'), OrderController.getAll);

// Cancel order
router.post('/:id/cancel', authenticate, OrderController.cancel);

// Get order statistics (admin only)
router.get('/stats/overview', authenticate, authorize('admin'), OrderController.getStats);

module.exports = router;