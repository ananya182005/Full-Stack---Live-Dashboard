// Import React hooks for managing state, side effects, and memoized functions
import { useCallback, useEffect, useState } from 'react';

// Import the API client and Socket.IO connection
import { api } from './api';
import { socket } from './socket';

// Import components for task creation, task listing, and connection status
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import ConnectionStatus from './components/ConnectionStatus';

// Sort tasks by creation date (newest first), using task ID as a fallback
const sortTasks = tasks => [...tasks].sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id);

// Add or update a task in the list while preventing duplicates
const upsert = (tasks, task) => sortTasks([task, ...tasks.filter(item => item.id !== task.id)]);

// Define the main application component
export default function App() {
  // Store the list of tasks
  const [tasks, setTasks] = useState([]);

  // Track whether tasks are being loaded
  const [loading, setLoading] = useState(true);

  // Track whether a new task is being saved
  const [saving, setSaving] = useState(false);

  // Store error messages for display
  const [error, setError] = useState('');

  // Track the WebSocket connection status
  const [connected, setConnected] = useState(socket.connected);

  // Store the number of connected users
  const [users, setUsers] = useState(0);

  // Fetch the latest tasks from the backend
  const refresh = useCallback(async () => {
    // Retrieve tasks, sort them, and clear previous errors
    try { const { data } = await api.get('/api/tasks'); setTasks(sortTasks(data)); setError(''); }

    // Display an error if tasks cannot be loaded
    catch { setError('Could not load tasks. Check the backend connection.'); }

    // Stop displaying the loading state
    finally { setLoading(false); }
  }, []);

  // Set up WebSocket event listeners and synchronize tasks
  useEffect(() => {
    // Connect first; fetch on connection to resync after network interruptions.

    // Handle successful WebSocket connections and refresh tasks
    const onConnect = () => { setConnected(true); refresh(); };

    // Handle disconnections and reset the connected user count
    const onDisconnect = () => { setConnected(false); setUsers(0); };

    // Add newly created tasks received through WebSocket
    const onCreated = task => setTasks(old => upsert(old, task));

    // Update existing tasks received through WebSocket
    const onUpdated = task => setTasks(old => upsert(old, task));

    // Remove deleted tasks received through WebSocket
    const onDeleted = id => setTasks(old => old.filter(task => task.id !== id));

    // Update the number of connected users
    const onCount = count => setUsers(count);

    // Register connection and disconnection event listeners
    socket.on('connect', onConnect); socket.on('disconnect', onDisconnect);

    // Register task creation and update event listeners
    socket.on('task:created', onCreated); socket.on('task:updated', onUpdated);

    // Register task deletion and connected user count event listeners
    socket.on('task:deleted', onDeleted); socket.on('users:count', onCount);

    // Establish the WebSocket connection and load initial tasks
    socket.connect(); refresh();

    // Remove event listeners and disconnect the socket during cleanup
    return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); socket.off('task:created', onCreated); socket.off('task:updated', onUpdated); socket.off('task:deleted', onDeleted); socket.off('users:count', onCount); socket.disconnect(); };
  }, [refresh]);

  // Create a new task through the backend API
  async function createTask(task) {
    // Enable the saving state and clear previous errors
    setSaving(true); setError('');

    // Send the new task to the API and update the task list
    try { const { data } = await api.post('/api/tasks', task); setTasks(old => upsert(old, data)); return true; }

    // Handle task creation errors
    catch (err) { setError(err.response?.data?.error || 'Could not create task'); return false; }

    // Reset the saving state after the request
    finally { setSaving(false); }
  }

  // Update an existing task through the backend API
  async function updateTask(id, changes) {
    // Clear previous error messages
    setError('');

    // Send task changes to the API and update the local task list
    try { const { data } = await api.put(`/api/tasks/${id}`, changes); setTasks(old => upsert(old, data)); return true; }

    // Handle task update errors
    catch (err) { setError(err.response?.data?.error || 'Could not update task'); return false; }
  }

  // Delete a task through the backend API
  async function deleteTask(id) {
    // Clear previous error messages
    setError('');

    // Delete the task from the backend and remove it from local state
    try { await api.delete(`/api/tasks/${id}`); setTasks(old => old.filter(task => task.id !== id)); return true; }

    // Handle task deletion errors
    catch (err) { setError(err.response?.data?.error || 'Could not delete task'); return false; }
  }

  // Render the main application interface
  return (
    <div className="app">
      {/* Display the application header */}
      <header className="topbar">
        {/* Display the application logo, title, and tagline */}
        <div className="brand">
          <span className="brand-mark">✓</span>
          <div>
            <h1>Live Task Board</h1>
            <p>Stay organized, together.</p>
          </div>
        </div>

        {/* Display WebSocket connection status and connected user count */}
        <ConnectionStatus connected={connected} users={users} />
      </header>

      {/* Main content area */}
      <main>
        {/* Display the workspace introduction and total task count */}
        <div className="intro">
          <div>
            <span className="eyebrow">YOUR WORKSPACE</span>
            <h2>Make progress, one task at a time.</h2>
            <p>Changes sync instantly across every open board.</p>
          </div>

          {/* Display the total number of tasks */}
          <div className="total">
            <strong>{tasks.length}</strong>
            <span>Total tasks</span>
          </div>
        </div>

        {/* Display error messages with an option to retry loading tasks */}
        {error && <div role="alert" className="error">{error} <button onClick={refresh}>Retry</button></div>}

        {/* Render the form for creating new tasks */}
        <TaskForm onCreate={createTask} saving={saving} />

        {/* Show a loading message or render the task list */}
        {loading ? <p className="loading">Loading tasks…</p> : <TaskList tasks={tasks} onUpdate={updateTask} onDelete={deleteTask} />}
      </main>

      {/* Display the technologies used in the application */}
      <footer>Built with React · Express · PostgreSQL · Redis · Socket.IO</footer>
    </div>
  );
}