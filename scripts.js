// Get references to DOM elements
const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');
const clearAllBtn = document.getElementById('clear-all-btn');

// Load tasks from local storage on page load
document.addEventListener('DOMContentLoaded', loadTasks);

// Add a new task when the button is clicked or Enter is pressed
addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});

// Event listener for handling clicks on task items (using event delegation)
taskList.addEventListener('click', handleTaskActions);

// Event listener for the "Clear All" button
clearAllBtn.addEventListener('click', clearAllTasks);

// Drag-and-drop event listeners
let draggedItem = null;
taskList.addEventListener('dragstart', (e) => {
    draggedItem = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
});

taskList.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(taskList, e.clientY);
    const currentItem = document.querySelector('.dragging');
    if (afterElement == null) {
        taskList.appendChild(currentItem);
    } else {
        taskList.insertBefore(currentItem, afterElement);
    }
});

taskList.addEventListener('dragend', () => {
    draggedItem.classList.remove('dragging');
    draggedItem = null;
    // After reordering, save the new order to local storage
    saveTaskOrder();
});

// Helper function to find where to drop the dragged element
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Function to save the new order of tasks
function saveTaskOrder() {
    const taskItems = document.querySelectorAll('.task-item');
    const newOrder = Array.from(taskItems).map(item => {
        const taskId = parseInt(item.dataset.id);
        const tasks = getTasksFromStorage();
        return tasks.find(task => task.id === taskId);
    });
    saveTasksToStorage(newOrder.filter(Boolean)); // Filter out any nulls just in case
}

// Function to add a new task
function addTask() {
    const taskText = taskInput.value.trim();
    if (taskText === '') {
        return; // Do nothing if input is empty
    }

    // Create a new task object
    const task = {
        id: Date.now(),
        text: taskText,
        completed: false,
        dueDate: null,
        dueTime: null
    };

    // Save the task and update the UI
    saveTask(task);
    renderTask(task);

    // Clear the input field
    taskInput.value = '';
}

// Function to handle task actions (complete, edit, delete, date/time)
function handleTaskActions(e) {
    const target = e.target;
    const taskItem = target.closest('.task-item');
    if (!taskItem) return;

    const taskId = parseInt(taskItem.dataset.id);

    if (target.classList.contains('fa-check-circle') || target.closest('.complete-btn')) {
        // Mark task as complete/incomplete
        toggleTaskComplete(taskId);
    } else if (target.classList.contains('fa-edit') || target.closest('.edit-btn')) {
        // Edit task
        editTask(taskItem, taskId);
    } else if (target.classList.contains('fa-trash') || target.closest('.delete-btn')) {
        // Delete task
        deleteTask(taskId);
    } 
}

// Toggles a task's completed status
function toggleTaskComplete(id) {
    const tasks = getTasksFromStorage();
    const updatedTasks = tasks.map(task => {
        if (task.id === id) {
            task.completed = !task.completed;
        }
        return task;
    });
    saveTasksToStorage(updatedTasks);
    renderTasks(updatedTasks);
}

// Edits a task
function editTask(taskItem, id) {
    const taskTextElement = taskItem.querySelector('.task-text');
    const originalText = taskTextElement.textContent;

    // Replace the text with an input field
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.value = originalText;
    editInput.className = 'edit-input';
    taskTextElement.innerHTML = '';
    taskTextElement.appendChild(editInput);
    editInput.focus();

    // Handle saving the edited task
    editInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const newText = editInput.value.trim();
            if (newText !== '') {
                updateTaskText(id, newText);
            } else {
                // If input is empty, revert to original text
                updateTaskText(id, originalText);
            }
            editInput.blur();
        }
    });

    // Revert to text if the input loses focus
    editInput.addEventListener('blur', () => {
        const newText = editInput.value.trim();
        if (newText !== '') {
            updateTaskText(id, newText);
        } else {
            updateTaskText(id, originalText);
        }
    });
}

// Updates a task's text
function updateTaskText(id, newText) {
    const tasks = getTasksFromStorage();
    const updatedTasks = tasks.map(task => {
        if (task.id === id) {
            task.text = newText;
        }
        return task;
    });
    saveTasksToStorage(updatedTasks);
    renderTasks(updatedTasks);
}

// Deletes a task
function deleteTask(id) {
    // This is a custom confirm dialog to replace the native browser one.
    confirm('Are you sure you want to delete this task?').then(result => {
        if (!result) return;
        const tasks = getTasksFromStorage();
        const updatedTasks = tasks.filter(task => task.id !== id);
        saveTasksToStorage(updatedTasks);
        renderTasks(updatedTasks);
    });
}

// Function to clear all tasks
function clearAllTasks() {
    confirm('Are you sure you want to clear all tasks?').then(result => {
        if (!result) return;
        saveTasksToStorage([]);
        renderTasks([]);
    });
}
    
// Updates a task's due date
function updateTaskDueDate(id, dueDate) {
    const tasks = getTasksFromStorage();
    const updatedTasks = tasks.map(task => {
        if (task.id === id) {
            task.dueDate = dueDate;
        }
        return task;
    });
    saveTasksToStorage(updatedTasks);
    // Re-render to show the updated date
    renderTasks(updatedTasks);
}

// Updates a task's due time
function updateTaskDueTime(id, dueTime) {
    const tasks = getTasksFromStorage();
    const updatedTasks = tasks.map(task => {
        if (task.id === id) {
            task.dueTime = dueTime;
        }
        return task;
    });
    saveTasksToStorage(updatedTasks);
    // Re-render to show the updated time
    renderTasks(updatedTasks);
}

// Renders a single task item to the list
function renderTask(task) {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.dataset.id = task.id;
    li.setAttribute('draggable', 'true');

    // Create the task text span
    const taskTextSpan = document.createElement('span');
    taskTextSpan.className = 'task-text';
    taskTextSpan.textContent = task.text;

    // Create the task controls div
    const taskControlsDiv = document.createElement('div');
    taskControlsDiv.className = 'task-controls';

    // Create the date input
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.value = task.dueDate || '';
    dateInput.addEventListener('change', (e) => {
        updateTaskDueDate(task.id, e.target.value);
    });

    // Create the time input
    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.value = task.dueTime || '';
    timeInput.addEventListener('change', (e) => {
        updateTaskDueTime(task.id, e.target.value);
    });

    // Create the buttons
    const completeBtn = document.createElement('button');
    completeBtn.className = 'complete-btn';
    completeBtn.innerHTML = '<i class="fas fa-check-circle"></i>';

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.innerHTML = '<i class="fas fa-edit"></i>';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';

    // Append elements to the controls div
    taskControlsDiv.appendChild(dateInput);
    taskControlsDiv.appendChild(timeInput);
    taskControlsDiv.appendChild(completeBtn);
    taskControlsDiv.appendChild(editBtn);
    taskControlsDiv.appendChild(deleteBtn);

    // Append everything to the list item
    li.appendChild(taskTextSpan);
    li.appendChild(taskControlsDiv);
    
    taskList.appendChild(li);
}

// Renders all tasks from an array
function renderTasks(tasks) {
    taskList.innerHTML = ''; // Clear the current list
    tasks.forEach(task => renderTask(task));
}

// Saves a single task to local storage
function saveTask(task) {
    const tasks = getTasksFromStorage();
    tasks.push(task);
    saveTasksToStorage(tasks);
}
    
// Gets tasks from local storage
function getTasksFromStorage() {
    const tasksJson = localStorage.getItem('tasks');
    return tasksJson ? JSON.parse(tasksJson) : [];
}

// Saves tasks array to local storage
function saveTasksToStorage(tasks) {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Loads tasks from local storage and renders them
function loadTasks() {
    const tasks = getTasksFromStorage();
    renderTasks(tasks);
}

// Simple custom confirmation dialog to replace browser's native confirm
function confirm(message) {
    return new Promise(resolve => {
        const dialog = document.createElement('div');
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.backgroundColor = '#1e1e1e';
        dialog.style.color = '#e0e0e0';
        dialog.style.padding = '20px';
        dialog.style.borderRadius = '10px';
        dialog.style.boxShadow = '0 5px 15px rgba(0,0,0,0.5)';
        dialog.style.zIndex = '1000';
        dialog.style.border = '1px solid #333';
        dialog.innerHTML = `
            <p>${message}</p>
            <div style="text-align: center; margin-top: 15px;">
                <button id="okBtn" style="background-color: #F87171; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-right: 10px;">OK</button>
                <button id="cancelBtn" style="background-color: #333; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Cancel</button>
            </div>
        `;
        document.body.appendChild(dialog);

        document.getElementById('okBtn').addEventListener('click', () => {
            dialog.remove();
            resolve(true);
        });
        document.getElementById('cancelBtn').addEventListener('click', () => {
            dialog.remove();
            resolve(false);
        });
    });
}
