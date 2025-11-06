const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

class UserModel {
  
  /**
   * Create new user with hashed password
   */
  static async create({ name, phone, email, password, role }) {
    try {
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      const query = `
        INSERT INTO users (name, phone, email, password_hash, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, phone, email, role, created_at
      `;
      
      const result = await pool.query(query, [name, phone, email, passwordHash, role]);
      return result.rows[0];
    } catch (error) {
      // Handle duplicate phone/email
      if (error.code === '23505') {
        if (error.constraint === 'users_phone_key') {
          throw new Error('Phone number already registered');
        }
        if (error.constraint === 'users_email_key') {
          throw new Error('Email already registered');
        }
      }
      throw error;
    }
  }

  /**
   * Find user by phone number
   */
  static async findByPhone(phone) {
    const query = `SELECT * FROM users WHERE phone = $1`;
    const result = await pool.query(query, [phone]);
    return result.rows[0];
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const query = `
      SELECT id, name, phone, email, role, created_at, updated_at 
      FROM users 
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const query = `SELECT * FROM users WHERE email = $1`;
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  /**
   * Verify password
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Update user profile
   */
  static async update(id, updateData) {
    const { name, email } = updateData;
    
    const query = `
      UPDATE users 
      SET name = COALESCE($1, name),
          email = COALESCE($2, email),
          updated_at = NOW()
      WHERE id = $3
      RETURNING id, name, phone, email, role, updated_at
    `;
    
    const result = await pool.query(query, [name, email, id]);
    return result.rows[0];
  }

  /**
   * Get all users with optional role filter
   */
  static async getAll(role = null) {
    let query = `
      SELECT id, name, phone, email, role, created_at 
      FROM users
    `;
    
    const params = [];
    
    if (role) {
      query += ` WHERE role = $1`;
      params.push(role);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Delete user (soft delete could be implemented)
   */
  static async delete(id) {
    const query = `DELETE FROM users WHERE id = $1 RETURNING id`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = UserModel;