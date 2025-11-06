const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection pool configuration
// Prioritize DATABASE_URL if provided (for production/cloud deployments like Render)
const isProduction = process.env.NODE_ENV === 'production';

// Get DATABASE_URL - check multiple possible sources
// Render sets DATABASE_URL automatically, but we should also check if it exists
let databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_CONNECTION_STRING || '';
databaseUrl = databaseUrl.trim();

// Check if we're in a cloud environment (Render, Heroku, etc.)
// In cloud environments, DATABASE_URL should always be present
const isCloudEnvironment = process.env.RENDER || process.env.HEROKU || process.env.RAILWAY_ENVIRONMENT || isProduction;
const hasDatabaseUrl = databaseUrl.length > 0;

// Log configuration for debugging (without sensitive data)
console.log('🔧 Database Configuration:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   Cloud environment detected: ${isCloudEnvironment}`);
console.log(`   DATABASE_URL present: ${hasDatabaseUrl}`);

if (hasDatabaseUrl) {
  // Log first 20 chars and last 10 chars of URL for debugging
  const urlPreview = databaseUrl.substring(0, 20) + '...' + databaseUrl.substring(databaseUrl.length - 10);
  console.log(`   DATABASE_URL preview: ${urlPreview}`);
} else {
  if (isCloudEnvironment) {
    console.error('⚠️  WARNING: DATABASE_URL not found in cloud environment!');
    console.error('   This will cause connection errors. Please ensure DATABASE_URL is set.');
  }
  console.log(`   Using individual DB params: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);
}

let poolConfig;

// IMPORTANT: In cloud environments (Render, Heroku, etc.), we MUST use DATABASE_URL
// If we're in a cloud environment but DATABASE_URL is missing, throw an error
if (isCloudEnvironment && !hasDatabaseUrl) {
  throw new Error(
    'DATABASE_URL is required in cloud environments but was not found. ' +
    'Please ensure DATABASE_URL is set in your environment variables.'
  );
}

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
  // Only allow this if NOT in a cloud environment
  if (isCloudEnvironment) {
    throw new Error(
      'Cannot use individual DB connection parameters in cloud environment. ' +
      'DATABASE_URL must be provided.'
    );
  }
  
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
    
    if (result && result.rows && result.rows.length > 0 && result.rows[0]) {
      console.log('✅ Database connection test successful');
      const pgVersion = result.rows[0].pg_version;
      if (pgVersion) {
        const versionParts = pgVersion.split(' ');
        const versionString = versionParts.length >= 2 
          ? `${versionParts[0]} ${versionParts[1]}` 
          : pgVersion;
        console.log(`   PostgreSQL version: ${versionString}`);
      }
      console.log(`   Current time: ${result.rows[0].current_time}`);
    } else {
      console.log('✅ Database connection test successful (no version info available)');
    }
    client.release();
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    console.error('   Error code:', error.code);
    console.error('   Error stack:', error.stack);
    console.error('   Connection config:', {
      hasConnectionString: !!poolConfig.connectionString,
      hasHost: !!poolConfig.host,
      host: poolConfig.host || 'N/A',
      port: poolConfig.port || 'N/A',
      ssl: poolConfig.ssl ? 'enabled' : 'disabled',
      usingConnectionString: !!poolConfig.connectionString,
      isCloudEnvironment: isCloudEnvironment,
      hasDatabaseUrl: hasDatabaseUrl
    });
    
    // If we're in a cloud environment and using host-based config, this is a critical error
    if (isCloudEnvironment && poolConfig.host && !poolConfig.connectionString) {
      console.error('❌ CRITICAL: Using host-based connection in cloud environment!');
      console.error('   This should never happen. DATABASE_URL should be used instead.');
      console.error('   Please check your environment variables on Render.');
    }
    
    // Don't throw - let the app start and retry later
    // But log the error clearly for debugging
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