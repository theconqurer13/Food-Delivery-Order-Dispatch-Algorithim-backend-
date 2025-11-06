const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection pool configuration
// Prioritize DATABASE_URL if provided (for production/cloud deployments like Render)
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;
const hasDatabaseUrl = !!databaseUrl && databaseUrl.trim() !== '';

// Log configuration for debugging (without sensitive data)
console.log('🔧 Database Configuration:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   DATABASE_URL present: ${hasDatabaseUrl}`);
if (hasDatabaseUrl) {
  // Log first 20 chars and last 10 chars of URL for debugging
  const urlPreview = databaseUrl.substring(0, 20) + '...' + databaseUrl.substring(databaseUrl.length - 10);
  console.log(`   DATABASE_URL preview: ${urlPreview}`);
} else {
  console.log(`   Using individual DB params: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);
}

let poolConfig;

if (hasDatabaseUrl) {
  // Use connection string exclusively (for Render, Heroku, etc.)
  // IMPORTANT: When using connectionString, do NOT set host, port, database, user, password
  // Create a clean config object with ONLY connectionString and SSL if needed
  poolConfig = {
    connectionString: databaseUrl,
    max: 20, // Maximum number of connections in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Increased timeout for cloud databases
  };
  
  // Enable SSL for cloud databases (Render, Heroku, Railway, etc. all require SSL)
  // Check if URL indicates cloud provider or if in production
  const isCloudProvider = databaseUrl.includes('render.com') || 
                          databaseUrl.includes('herokuapp.com') ||
                          databaseUrl.includes('railway.app') ||
                          databaseUrl.includes('amazonaws.com') ||
                          databaseUrl.includes('azure.com') ||
                          databaseUrl.includes('supabase.co') ||
                          isProduction;
  
  if (isCloudProvider) {
    poolConfig.ssl = {
      rejectUnauthorized: false, // Cloud databases often use self-signed certificates
    };
    console.log('   SSL enabled for cloud database');
  }
} else {
  // Use individual connection parameters (for local development only)
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'food_delivery',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20, // Maximum number of connections in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
  console.log('   Using local database connection');
}

const pool = new Pool(poolConfig);

// Test connection on startup
pool.on('connect', (client) => {
  console.log('✅ New PostgreSQL client connected');
});

// Handle errors
pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle PostgreSQL client', err);
  console.error('   Error details:', {
    code: err.code,
    errno: err.errno,
    address: err.address,
    port: err.port
  });
  // Don't exit the process - let the app continue and retry connections
  // The connection pool will attempt to reconnect automatically
});

// Test database connection on startup
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database connection test successful');
    console.log(`   PostgreSQL version: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}`);
    client.release();
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    console.error('   Connection config:', {
      hasConnectionString: !!poolConfig.connectionString,
      hasHost: !!poolConfig.host,
      host: poolConfig.host || 'N/A',
      port: poolConfig.port || 'N/A',
      ssl: poolConfig.ssl || 'disabled'
    });
    // Don't throw - let the app start and retry later
  }
}

// Test connection after a short delay to ensure env vars are loaded
setTimeout(() => {
  testConnection();
}, 1000);

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