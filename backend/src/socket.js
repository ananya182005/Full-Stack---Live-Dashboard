// Import the Socket.IO server class
const { Server } = require('socket.io');

// Store the Socket.IO server instance
let io;

// Attach Socket.IO to the HTTP server
function attachSocket(server) {
  // Initialize Socket.IO with CORS configuration and WebSocket transport
  io = new Server(server, { cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173' }, transports: ['websocket'] });

  // Handle new client connections
  io.on('connection', socket => {
    // Broadcast the current number of connected users
    io.emit('users:count', io.engine.clientsCount);

    // Update the connected user count when a client disconnects
    socket.on('disconnect', () => io.emit('users:count', io.engine.clientsCount));
  });

  // Return the Socket.IO server instance
  return io;
}

// Broadcast an event and its payload to all connected clients
function emit(event, payload) {
  // Emit the event only if Socket.IO has been initialized
  if (io) io.emit(event, payload);
}

// Export the Socket.IO initialization and event emission functions
module.exports = { attachSocket, emit };