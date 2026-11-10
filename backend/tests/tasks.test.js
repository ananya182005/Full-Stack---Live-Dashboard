// Import Supertest for testing HTTP API endpoints
const request = require('supertest');

// Import the Socket.IO client for testing real-time events
const { io: clientSocket } = require('socket.io-client');

// Import the Express application, database, Redis utilities, and HTTP server
const app = require('../src/app');
const db = require('../src/config/db');
const { client, connectRedis } = require('../src/config/redis');
const server = require('../src/server');

// Store the server URL and WebSocket client instance
let baseURL, socket;

// Track created task IDs for cleanup after testing
const created = [];

// Set up database, Redis, and HTTP server before running tests
beforeAll(async () => {
  // Verify the PostgreSQL database connection
  await db.query('SELECT 1');

  // Establish the Redis connection if available
  await connectRedis();

  // Start the HTTP server on an automatically assigned available port
  await new Promise(resolve => server.listen(0, resolve));

  // Store the server URL for WebSocket testing
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

// Clean up resources after all tests are completed
afterAll(async () => {
  // Disconnect the WebSocket client if connected
  if (socket) socket.disconnect();

  // Delete tasks created during testing
  for (const id of created) await db.query('DELETE FROM tasks WHERE id=$1', [id]);

  // Close the HTTP server
  await new Promise(resolve => server.close(resolve));

  // Close the Redis connection if it is open
  if (client.isOpen) await client.quit();

  // Close the PostgreSQL connection pool
  await db.end();
});

// Test whether the health check endpoint returns a successful response
test('health check returns 200', async () => {
  // Send a GET request to the health check endpoint
  const res = await request(app).get('/api/health');

  // Verify HTTP status 200 and active database connectivity
  expect(res.status).toBe(200); expect(res.body.db).toBe('up');
});

// Test task creation and title validation
test('POST validates title and creates a task', async () => {
  // Verify that creating a task without a title returns HTTP 400
  expect((await request(app).post('/api/tasks').send({ description: 'no title' })).status).toBe(400);

  // Create a task with a valid title
  const res = await request(app).post('/api/tasks').send({ title: 'Test task' });

  // Verify successful creation and store the task ID for cleanup
  expect(res.status).toBe(201); created.push(res.body.id);
});

// Test task retrieval and Redis caching behavior
test('GET list returns an array and second call is cached', async () => {
  // Fetch the task list from the API
  const first = await request(app).get('/api/tasks');

  // Verify successful response and array format
  expect(first.status).toBe(200); expect(Array.isArray(first.body)).toBe(true);

  // Fetch the task list again to check caching
  const second = await request(app).get('/api/tasks');

  // Verify a cache hit when Redis is available
  if (client.isReady) expect(second.headers['x-cache']).toBe('HIT');
});

// Test task status validation and updating
test('PUT validates status and updates task', async () => {
  // Retrieve the ID of the previously created task
  const id = created[0];

  // Verify that an invalid task status returns HTTP 400
  expect((await request(app).put(`/api/tasks/${id}`).send({ status: 'banana' })).status).toBe(400);

  // Update the task status to done
  const res = await request(app).put(`/api/tasks/${id}`).send({ status: 'done' });

  // Verify successful update and the updated task status
  expect(res.status).toBe(200); expect(res.body.status).toBe('done');
});

// Test task deletion
test('DELETE removes a task', async () => {
  // Create a task specifically for deletion testing
  const res = await request(app).post('/api/tasks').send({ title: 'Delete me' });

  // Store the ID of the task to delete
  const id = res.body.id;

  // Verify that deleting the task returns HTTP 200
  expect((await request(app).delete(`/api/tasks/${id}`)).status).toBe(200);

  // Verify that the deleted task can no longer be retrieved
  expect((await request(app).get(`/api/tasks/${id}`)).status).toBe(404);
});

// Test real-time task creation notifications through WebSocket
test('WebSocket broadcasts task:created', async () => {
  // Connect to the Socket.IO server using WebSocket transport
  socket = clientSocket(baseURL, { transports: ['websocket'], reconnection: false });

  // Wait for the WebSocket connection or reject if a connection error occurs
  await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });

  // Create a promise to listen for the task:created event
  const event = new Promise((resolve, reject) => {
    // Reject the promise if the event is not received within 5 seconds
    const timer = setTimeout(() => reject(new Error('No task:created event')), 5000);

    // Resolve the promise when the task:created event is received
    socket.once('task:created', task => { clearTimeout(timer); resolve(task); });
  });

  // Create a new task to trigger the WebSocket event
  const res = await request(app).post('/api/tasks').send({ title: 'Socket test' });

  // Store the created task ID for cleanup
  created.push(res.body.id);

  // Verify that the broadcast event contains the newly created task ID
  expect((await event).id).toBe(res.body.id);
});