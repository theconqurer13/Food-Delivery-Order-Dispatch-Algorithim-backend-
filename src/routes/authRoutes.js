const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authControllers');
const { authenticate } = require('../middleware/authmiddleware');
const { validate, schemas } = require('../utils/validators');

// Public routes
router.post('/register', validate(schemas.register), AuthController.register);
router.post('/login', validate(schemas.login), AuthController.login);

// Protected routes
router.post('/logout', authenticate, AuthController.logout);
router.get('/profile', authenticate, AuthController.getProfile);
router.put('/profile', authenticate, AuthController.updateProfile);

module.exports = router;