// Import the useState hook to manage form input values
import { useState } from 'react';

// Define the TaskForm component with task creation and saving props
export default function TaskForm({ onCreate, saving }) {
  // Store the task title entered by the user
  const [title, setTitle] = useState('');

  // Store the optional task description
  const [description, setDescription] = useState('');

  // Handle form submission asynchronously
  async function submit(event) {
    // Prevent the default form submission behavior
    event.preventDefault();

    // Stop submission if the title is empty or contains only spaces
    if (!title.trim()) return;

    // Call the task creation function with the title and description
    const ok = await onCreate({ title: title.trim(), description });

    // Clear the form fields after successful task creation
    if (ok) { setTitle(''); setDescription(''); }
  }

  // Render the task creation form
  return (
    <form onSubmit={submit} className="task-form">
      {/* Display the form heading */}
      <h2>Add a task</h2>

      {/* Input field for the task title */}
      <label>
        Title
        <input maxLength="200" required value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to get done?" />
      </label>

      {/* Textarea for the optional task description */}
      <label>
        Description
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional details" rows="3" />
      </label>

      {/* Submit button disabled while saving or when the title is empty */}
      <button disabled={saving || !title.trim()}>
        {saving ? 'Saving…' : '+ Add task'}
      </button>
    </form>
  );
}