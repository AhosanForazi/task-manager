// src/app.js — Express app entry point. Listens on PORT (default 3000).

const path = require('path');
const express = require('express');
const taskRoutes = require('./routes/taskRoutes');

const app = express();

app.use(express.json());

// Lightweight request log so curl-driven testing shows what's happening.
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve the UI from /public at the root.
// Disable caching so users always see the latest HTML/CSS/JS without a hard refresh.
app.use(
  express.static(path.join(__dirname, '..', 'public'), {
    etag: false,
    lastModified: false,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    },
  })
);

// API discovery endpoint (the UI never hits this; it exists for curl/JSON clients).
app.get('/api', (_req, res) => {
  res.json({
    name: 'Task Management API',
    version: '1.0.0',
    endpoints: {
      list: 'GET    /api/tasks',
      read: 'GET    /api/tasks/:id',
      create: 'POST   /api/tasks',
      update: 'PUT    /api/tasks/:id',
      remove: 'DELETE /api/tasks/:id',
    },
  });
});

app.use('/api/tasks', taskRoutes);

// 404 for anything not matched above.
app.use((req, res) => {
  res.status(404).json({ error: 'NotFound', message: `Route ${req.method} ${req.url} not found` });
});

// Centralized error handler.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'InternalServerError', message: err.message });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});

module.exports = app;
