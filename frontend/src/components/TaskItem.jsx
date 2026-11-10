// Import the useState hook to manage component state
import { useState } from 'react';

// Define the TaskItem component with task data and update/delete functions
export default function TaskItem({ task, onUpdate, onDelete }) {
  // Track whether the task is currently being edited
  const [editing, setEditing] = useState(false);

  // Store the editable task title
  const [title, setTitle] = useState(task.title);

  // Store the editable task description
  const [description, setDescription] = useState(task.description || '');

  // Track whether an update or delete operation is in progress
  const [busy, setBusy] = useState(false);

  // Handle saving changes to the task
  async function save(event) {
    // Prevent default form submission and enable the busy state
    event.preventDefault(); setBusy(true);

    // Update the task and exit editing mode if successful
    try { if (await onUpdate(task.id, { title, description })) setEditing(false); } finally { setBusy(false); }
  }

  // Handle changes to the task status
  async function changeStatus(event) {
    // Disable actions while updating the task status
    setBusy(true);

    // Update the task status and reset the busy state
    try { await onUpdate(task.id, { status: event.target.value }); } finally { setBusy(false); }
  }

  // Handle task deletion
  async function remove() {
    // Ask for confirmation before deleting the task
    if (!window.confirm('Delete this task?')) return;

    // Enable the busy state during deletion
    setBusy(true);

    // Delete the task and reset the busy state
    try { await onDelete(task.id); } finally { setBusy(false); }
  }

  // Render the task card with editing and viewing modes
  return (
    <article className="task-card">
      {/* Display the edit form when editing is enabled */}
      {editing ? (
        <form onSubmit={save} className="edit-form">
          {/* Input field for editing the task title */}
          <input aria-label="Edit title" required maxLength="200" value={title} onChange={e => setTitle(e.target.value)} />

          {/* Textarea for editing the task description */}
          <textarea aria-label="Edit description" value={description} onChange={e => setDescription(e.target.value)} />

          {/* Buttons for saving or canceling task edits */}
          <div className="actions">
            {/* Save changes while preventing duplicate submissions */}
            <button disabled={busy}>Save</button>

            {/* Cancel editing and restore the original task values */}
            <button type="button" className="secondary" onClick={() => { setEditing(false); setTitle(task.title); setDescription(task.description || ''); }}>Cancel</button>
          </div>
        </form>
      ) : (
        <>
          {/* Display the task title and unique task ID */}
          <div className="task-heading">
            <h3>{task.title}</h3>
            <span className="task-id">#{task.id}</span>
          </div>

          {/* Display the task description only when available */}
          {task.description && <p>{task.description}</p>}

          {/* Display task status and action buttons */}
          <div className="task-bottom">
            {/* Dropdown for changing the task status */}
            <select aria-label={`Status for ${task.title}`} disabled={busy} value={task.status} onChange={changeStatus}>
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>

            {/* Buttons for editing and deleting the task */}
            <div className="actions">
              {/* Enable task editing */}
              <button className="secondary" disabled={busy} onClick={() => setEditing(true)}>Edit</button>

              {/* Delete the task after user confirmation */}
              <button className="danger" disabled={busy} onClick={remove}>Delete</button>
            </div>
          </div>
        </>
      )}
    </article>
  );
}