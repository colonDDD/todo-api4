require('dotenv').config();
console.log("ENV DATABASE_URL:", process.env.DATABASE_URL);

const express = require('express');
const path = require('path');

const authMiddleware = require('./middleware/authMiddleware');
const adminMiddleware = require('./middleware/adminMiddleware');
const authRoutes = require('./routes/auth');
const db = require('./db');

const app = express();

// --- GLOBAL MIDDLEWARE ---
app.use(express.json());
console.log("SERVER DIR:", __dirname);

// --- ROUTES ---
app.use('/auth', authRoutes);

const PORT = 3000;

// --- TEST POŁĄCZENIA Z BAZĄ ---
db.query('SELECT NOW()')
  .then(res => console.log('DB OK:', res.rows[0]))
  .catch(err => console.error('DB ERROR:', err));


// --- API ROUTES ---

// 1. GET /health
app.get('/health', (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString()
  });
});

app.get('/admin/tasks', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, title, description, completed, created_at, updated_at, user_id
       FROM tasks
       ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /admin/tasks error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 2. GET /tasks (SQL + protected)
app.get('/tasks', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, title, description, completed, created_at, updated_at
       FROM tasks
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /tasks error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 3. POST /tasks (SQL + protected)
app.post('/tasks', authMiddleware, async (req, res) => {
  const title = req.body.title;
  const description = req.body.description ?? ""; // <-- NAJWAŻNIEJSZA POPRAWKA

  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  try {
    const result = await db.query(
      `INSERT INTO tasks (user_id, title, description)
       VALUES ($1, $2, $3)
       RETURNING id, title, description, completed, created_at`,
      [req.user.id, title, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /tasks error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 4. PUT /tasks/:id (SQL + protected)
app.put('/tasks/:id', authMiddleware, async (req, res) => {
  const { title, description, completed } = req.body;
  const taskId = req.params.id;

  try {
    const result = await db.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           completed = COALESCE($3, completed),
           updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [title, description, completed, taskId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /tasks error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete('/tasks/:id', authMiddleware, async (req, res) => {
  const taskId = req.params.id;

  try {
    let result;

    if (req.user.role === "admin") {
      // ADMIN MOŻE USUNĄĆ KAŻDY TASK
      result = await db.query(
        `DELETE FROM tasks
         WHERE id = $1
         RETURNING *`,
        [taskId]
      );
    } else {
      // ZWYKŁY USER TYLKO SWOJE
      result = await db.query(
        `DELETE FROM tasks
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [taskId, req.user.id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ message: "Task deleted", task: result.rows[0] });

  } catch (err) {
    console.error("DELETE /tasks error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



// --- STATIC FILES ---
app.use(express.static(path.resolve(__dirname, 'public')));

// --- FRONTEND ROUTE ---
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

// --- ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

// --- 404 HANDLER ---
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// --- START SERVER ---
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
