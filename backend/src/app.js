// Load environment variables from the .env file
require('dotenv').config();

// Import required modules
const express = require('express');
const cors = require('cors');

// Import database connection, Redis client, and task routes
const db = require('./config/db');
const { client } = require('./config/redis');
const tasks = require('./routes/tasks');

// Create an Express application
const app = express();

// Enable CORS for the specified frontend URL and expose the X-Cache header
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', exposedHeaders: ['X-Cache'] }));

// Middleware to parse incoming JSON request bodies
app.use(express.json());

// Health check endpoint to monitor application, database, and Redis status
app.get('/api/health', async (req, res) => {
  // Set the default database status to down
  let dbStatus = 'down';

  // Check database connectivity
  try { await db.query('SELECT 1'); dbStatus = 'up'; } catch (_) {}

  // Return application, database, and Redis connection statuses
  res.json({ status: 'ok', db: dbStatus, redis: client.isReady ? 'up' : 'down' });
});

// Register task-related API routes
app.use('/api/tasks', tasks);

// Handle requests to undefined routes with a 404 response
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error-handling middleware
app.use((err, req, res, next) => {
  // Handle invalid JSON request bodies
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) return res.status(400).json({ error: 'Invalid JSON' });

  // Log unexpected errors and return a generic server error response
  console.error(err); res.status(500).json({ error: 'Internal server error' });
});

// Export the Express application for use in the server
module.exports = app;