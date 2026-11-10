// Load environment variables from the .env file
require('dotenv').config();

// Import required modules
const fs = require('fs');
const path = require('path');

// Import the database connection
const db = require('../src/config/db');

// Execute an asynchronous function to initialize the database
(async () => {
  try {
    // Read and execute the SQL schema file to create database tables
    await db.query(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
    console.log('Database initialized');
  }
  catch (err) {
    // Handle database initialization errors
    console.error('Database initialization failed:', err.message);
    process.exitCode = 1;
  }
  finally {
    // Close the database connection
    await db.end();
  }
})();