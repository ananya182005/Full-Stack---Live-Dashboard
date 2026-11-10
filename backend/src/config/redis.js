// Load environment variables from the .env file
require('dotenv').config();

// Import the Redis client
const { createClient } = require('redis');

// Create a Redis client with a fallback URL and reconnection strategy
const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379', socket: { reconnectStrategy: retries => Math.min(retries * 200, 3000) } });

// Handle Redis connection errors
client.on('error', err => { if (!client.isOpen) console.warn('Redis unavailable:', err.message); });

// Track the ongoing Redis connection attempt
let connecting;

// Connect to Redis and handle connection failures
async function connectRedis() {
  // Skip connection if Redis is already connected
  if (client.isOpen) return;

  // Prevent multiple simultaneous connection attempts
  if (!connecting) connecting = client.connect().catch(err => console.warn('Redis unavailable; using PostgreSQL:', err.message)).finally(() => { connecting = null; });
  await connecting;
}

// Retrieve a cached value from Redis
async function cacheGet(key) {
  // Return null if Redis is not ready
  if (!client.isReady) return null;

  // Fetch the cached value and handle read errors
  try { return await client.get(key); } catch (err) { console.warn('Redis read failed:', err.message); return null; }
}

// Store a value in Redis with a 60-second expiration
async function cacheSet(key, value) {
  // Skip caching if Redis is not ready
  if (!client.isReady) return;

  // Save the value and handle write errors
  try { await client.set(key, value, { EX: 60 }); } catch (err) { console.warn('Redis write failed:', err.message); }
}

// Delete a cached value from Redis
async function cacheDelete(key) {
  // Skip deletion if Redis is not ready
  if (!client.isReady) return;

  // Remove the cached value and handle deletion errors
  try { await client.del(key); } catch (err) { console.warn('Redis invalidate failed:', err.message); }
}

// Export the Redis client and cache utility functions
module.exports = { client, connectRedis, cacheGet, cacheSet, cacheDelete };