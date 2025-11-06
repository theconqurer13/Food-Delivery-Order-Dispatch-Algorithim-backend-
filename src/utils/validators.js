const Joi = require('joi');

/**
 * Validation schemas for different request types
 */

// User registration validation
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).max(100).required(),
  role: Joi.string().valid('customer', 'rider', 'admin').required()
});

// Login validation
const loginSchema = Joi.object({
  phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
  password: Joi.string().required()
});

// Order creation validation
const orderSchema = Joi.object({
  customer_id: Joi.string().uuid().required(),
  pickup_address: Joi.string().min(5).max(500).required(),
  pickup_lat: Joi.number().min(-90).max(90).required(),
  pickup_lng: Joi.number().min(-180).max(180).required(),
  drop_address: Joi.string().min(5).max(500).required(),
  drop_lat: Joi.number().min(-90).max(90).required(),
  drop_lng: Joi.number().min(-180).max(180).required()
});

// Location update validation
const locationSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  speed: Joi.number().min(0).max(500).optional(),
  accuracy: Joi.number().min(0).max(10000).optional(),
  timestamp: Joi.string().isoDate().optional()
});

// Assignment validation
const assignmentAcceptSchema = Joi.object({
  rider_id: Joi.string().uuid().required()
});

const assignmentCompleteSchema = Joi.object({
  rider_id: Joi.string().uuid().required(),
  otp: Joi.string().length(6).optional()
});

/**
 * Validate request data against schema
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace req.body with validated value
    req.body = value;
    next();
  };
}

module.exports = {
  validate,
  schemas: {
    register: registerSchema,
    login: loginSchema,
    order: orderSchema,
    location: locationSchema,
    assignmentAccept: assignmentAcceptSchema,
    assignmentComplete: assignmentCompleteSchema
  }
};