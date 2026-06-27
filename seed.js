// seed.js — Populate the local SQLite DB with 5 sample tasks.
// Idempotent: clears the table first, then inserts a known set.

const db = require('./src/db/knex');

const SAMPLE_TASKS = [
  {
    title: 'Set up project repository',
    description: 'Create the GitHub repo, init npm, install express + knex + sqlite3 + joi.',
    status: 'done',
  },
  {
    title: 'Design tasks table schema',
    description: 'Columns: id, title, description, status, created_at, updated_at.',
    status: 'done',
  },
  {
    title: 'Implement CRUD endpoints',
    description: 'GET (all + by id), POST, PUT, DELETE on /api/tasks with Joi validation.',
    status: 'in_progress',
  },
  {
    title: 'Write README with curl examples',
    description: 'Document install, migrate, seed, run, and one curl call per endpoint.',
    status: 'pending',
  },
  {
    title: 'Add automated tests',
    description: 'Use Jest + Supertest to cover happy path and validation errors.',
    status: 'pending',
  },
];

async function seed() {
  try {
    await db('tasks').del();
    await db('tasks').insert(SAMPLE_TASKS);
    const rows = await db('tasks').select('*').orderBy('id', 'asc');
    console.log(`Seeded ${rows.length} tasks:`);
    console.table(rows);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

seed();
