const UserModel = require('../models/userModel');
const RiderModel = require('../models/riderModel');
const { generateToken } = require('../utils/jwt');

class AuthController {

  /**
   * Register new user
   */
  static async register(req, res) {
    try {
      const { name, phone, email, password, role } = req.body;

      // Create user
      const user = await UserModel.create({ name, phone, email, password, role });

      // If rider, create rider profile
      if (role === 'rider') {
        await RiderModel.create(user.id);
      }

      // Generate token
      const token = generateToken({ 
        id: user.id, 
        role: user.role 
      });

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role
        },
        token
      });

    } catch (error) {
      console.error('Register error:', error);
      
      if (error.message.includes('already registered')) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ 
        error: 'Registration failed',
        details: error.message 
      });
    }
  }

  /**
   * Login user
   */
  static async login(req, res) {
    try {
      const { phone, password } = req.body;

      // Find user
      const user = await UserModel.findByPhone(phone);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const isValid = await UserModel.verifyPassword(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate token
      const token = generateToken({ 
        id: user.id, 
        role: user.role 
      });

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role
        },
        token
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        error: 'Login failed',
        details: error.message 
      });
    }
  }

  /**
   * Logout user
   */
  static async logout(req, res) {
    try {
      // In production: Add token to blacklist in Redis
      // For now, just return success (client should delete token)
      
      res.json({ 
        message: 'Logged out successfully',
        note: 'Please delete token from client storage'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req, res) {
    try {
      const userId = req.user.id;
      
      const user = await UserModel.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // If rider, get rider details
      if (user.role === 'rider') {
        const riderDetails = await RiderModel.getById(userId);
        return res.json({ user, riderDetails });
      }

      res.json({ user });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { name, email } = req.body;

      const updatedUser = await UserModel.update(userId, { name, email });

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
}

module.exports = AuthController;