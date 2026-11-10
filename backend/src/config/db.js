// Load environment variables from the .env file
require('dotenv').config();

// Import the PostgreSQL connection pool
const { Pool } = require('pg');

// Create a database connection pool using the DATABASE_URL environment variable
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Export the connection pool for use in other files
module.exports = pool;