const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection pool configuration
// Prioritize DATABASE_URL if provided (for production/cloud deployments like Render)
const isProduction = process.env.NODE_ENV === 'production';
const hasDatabaseUrl = !!process.env.DATABASE_URL;

let poolConfig = {
  max: 20, // Maximum number of connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased timeout for cloud databases
};

if (hasDatabaseUrl) {
  // Use connection string (for Render, Heroku, etc.)
  poolConfig.connectionString = process.env.DATABASE_URL;
  
  // Enable SSL for production databases (required for Render, Heroku, etc.)
  if (isProduction) {
    poolConfig.ssl = {
      rejectUnauthorized: false, // Render databases use self-signed certificates
    };
  }
} else {
  // Use individual connection parameters (for local development)
  poolConfig.host = process.env.DB_HOST || 'localhost';
  poolConfig.port = process.env.DB_PORT || 5432;
  poolConfig.database = process.env.DB_NAME || 'food_delivery';
  poolConfig.user = process.env.DB_USER || 'postgres';
  poolConfig.password = process.env.DB_PASSWORD || 'postgres';
}

const pool = new Pool(poolConfig);

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

// Handle errors
pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle PostgreSQL client', err);
  // Don't exit the process - let the app continue and retry connections
  // The connection pool will attempt to reconnect automatically
});

// Helper function to execute queries with error handling
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

module.exports = {
  pool,
  query
};