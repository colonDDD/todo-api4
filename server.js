const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;
const FILE_PATH = path.resolve(__dirname, 'tasks.json');

app.use(express.json());
console.log("SERVER DIR:", __dirname);

// --- Funkcje pomocnicze ---
async function readTasks() {
  try {
    const data = await fs.readFile(FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeTasks(tasks) {
  await fs.writeFile(FILE_PATH, JSON.stringify(tasks, null, 2));
}

// --- ROUTES API ---

// 1. GET /health
app.get('/health', (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString()
  });
});

// 2. GET /tasks
app.get('/tasks', async (req, res) => {
  const tasks = await readTasks();
  res.json(tasks);
});

// 3. POST /tasks
app.post('/tasks', async (req, res) => {
  const { title, description } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: "Title and description are required" });
  }

  const tasks = await readTasks();
  const newTask = {
    id: tasks.length ? tasks[tasks.length - 1].id + 1 : 1,
    title,
    description,
    completed: false,
    createdAt: new Date().toISOString()
  };

  tasks.push(newTask);
  await writeTasks(tasks);

  res.status(201).json(newTask);
});

// 4. PUT /tasks/:id
app.put('/tasks/:id', async (req, res) => {
  const taskId = parseInt(req.params.id);
  const { title, description, completed } = req.body;

  const tasks = await readTasks();
  const taskIndex = tasks.findIndex(t => t.id === taskId);

  if (taskIndex === -1) {
    return res.status(404).json({ error: "Task not found", id: taskId });
  }

  const task = tasks[taskIndex];
  tasks[taskIndex] = {
    ...task,
    title: title ?? task.title,
    description: description ?? task.description,
    completed: completed ?? task.completed,
    updatedAt: new Date().toISOString()
  };

  await writeTasks(tasks);
  res.json(tasks[taskIndex]);
});

// 5. DELETE /tasks/:id
app.delete('/tasks/:id', async (req, res) => {
  const taskId = parseInt(req.params.id);
  let tasks = await readTasks();
  const taskIndex = tasks.findIndex(t => t.id === taskId);

  if (taskIndex === -1) {
    return res.status(404).json({ error: "Task not found", id: taskId });
  }

  const deletedTask = tasks.splice(taskIndex, 1)[0];
  await writeTasks(tasks);

  res.json({ message: "Task deleted", task: deletedTask });
});

// --- STATIC FILES ---
app.use(express.static(path.resolve(__dirname, 'public')));

// --- FRONTEND ROUTE ---
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

// --- ERROR HANDLER (zawsze jako ostatni!) ---
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// --- START SERWERA TYLKO JEŚLI PLIK JEST URUCHAMIANY BEZPOŚREDNIO ---
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

// --- EXPORT APP DO TESTÓW ---
module.exports = app;
