// Import the Node.js HTTP module
const http = require('http');

// Import the Express application
const app = require('./app');

// Import the function to attach Socket.IO to the HTTP server
const { attachSocket } = require('./socket');

// Import the Redis connection function
const { connectRedis } = require('./config/redis');

// Create an HTTP server using the Express application
const server = http.createServer(app);

// Attach Socket.IO to enable real-time communication
attachSocket(server);

// Start the server only when this file is executed directly
if (require.main === module) {
  // Connect to Redis (optional: PostgreSQL remains available if Redis is down)
  connectRedis(); // Redis is optional: API reads still use PostgreSQL if it is down.

  // Start listening on the configured port or default to port 4000
  server.listen(Number(process.env.PORT || 4000), () => console.log(`Server running on http://localhost:${process.env.PORT || 4000}`));
}

// Export the HTTP server for use in other modules or tests
module.exports = server;