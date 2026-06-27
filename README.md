# Task Management API

A small but complete **CRUD REST API** for a Task Management System, built with **Node.js + Express + SQLite + Knex**, with **Joi** input validation.

## Tech stack

| Layer       | Choice                                                |
|-------------|--------------------------------------------------------|
| Runtime     | Node.js (CommonJS)                                     |
| HTTP        | Express 5                                              |
| Database    | SQLite (file-based, `tasks.db` in project root)        |
| ORM / Query | Knex 3                                                 |
| Validation  | Joi                                                    |

## Project layout

```
.
├── knexfile.js
├── package.json
├── seed.js
├── tasks.db                       # created on first migrate
├── README.md
├── public/                        # static UI served by Express at /
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── src
    ├── app.js                     # Express app entry point (also serves /public)
    ├── controllers
    │   ├── taskController.js
    │   └── taskValidator.js       # Joi schemas
    ├── models
    │   └── taskModel.js           # Knex queries
    ├── routes
    │   └── taskRoutes.js
    └── db
        ├── knex.js                # shared Knex instance
        └── migrations
            └── 20260101000000_create_tasks_table.js
```

## Data model

`tasks`

| Column        | Type     | Notes                                                   |
|---------------|----------|---------------------------------------------------------|
| `id`          | integer  | PK, autoincrement                                      |
| `title`       | string   | required, 1–255 chars                                   |
| `description` | text     | optional, up to 2000 chars                             |
| `status`      | string   | one of `pending`, `in_progress`, `done` (default `pending`) |
| `created_at`  | timestamp | set on insert                                          |
| `updated_at`  | timestamp | set on insert, updated on every `PUT`                   |

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Run migrations (creates tasks.db + the tasks table)
npm run migrate

# 3. Seed five sample tasks
npm run seed
```

## Run the server

```bash
npm start
# Task Management API listening on http://localhost:3000
```

You can also use `npm run dev` — it's the same command.

## Web UI

A polished single-page UI ships in `public/`. Once the server is running, open
**http://localhost:3000/** in a browser.

Features:

- Card-grid task list with live search + status filters
- Create / edit tasks via a modal form (validates against the same Joi rules as the API)
- Inline status pills and “done” strikethrough on the cards
- Confirm dialog before delete
- Toast notifications for create / update / delete / errors
- Light + dark theme (auto-detects system preference, manual toggle in the header)
- Fully responsive — works on phone, tablet, desktop
- Honors `prefers-reduced-motion`

## API

All task endpoints are mounted under **`/api/tasks`**.

| Method | Path             | Description                  |
|--------|------------------|------------------------------|
| GET    | `/api/tasks`     | List all tasks               |
| GET    | `/api/tasks/:id` | Get a single task by id      |
| POST   | `/api/tasks`     | Create a new task            |
| PUT    | `/api/tasks/:id` | Update an existing task      |
| DELETE | `/api/tasks/:id` | Delete a task                |

Response envelope on success:

```json
{ "data": { ...task... }, "count": 5 }
```

Error envelope:

```json
{ "error": "ValidationError", "details": ["\"title\" is required"] }
```

Status codes used: `200`, `201`, `204`, `400`, `404`, `500`.

## Curl examples

Every example below assumes the server is running on `http://localhost:3000`.

### 1. List all tasks — `GET /api/tasks`

```bash
curl -X GET http://localhost:3000/api/tasks
```

### 2. Get a single task — `GET /api/tasks/:id`

```bash
curl -X GET http://localhost:3000/api/tasks/1
```

### 3. Create a task — `POST /api/tasks`

`title` is required. `description` is optional. `status` is optional and defaults to `pending`; valid values are `pending`, `in_progress`, `done`.

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Write integration tests",
    "description": "Cover happy path + validation errors with supertest.",
    "status": "in_progress"
  }'
```

Minimal valid body (only `title`):

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Quick note"}'
```

### 4. Update a task — `PUT /api/tasks/:id`

Send only the fields you want to change. At least one field is required.

```bash
curl -X PUT http://localhost:3000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'
```

```bash
curl -X PUT http://localhost:3000/api/tasks/2 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Design tasks table schema (v2)",
    "description": "Added an index on status."
  }'
```

### 5. Delete a task — `DELETE /api/tasks/:id`

```bash
curl -X DELETE http://localhost:3000/api/tasks/3
# HTTP/1.1 204 No Content
```

### 6. Validation failure example

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{}'
```

```json
{
  "error": "ValidationError",
  "details": ["\"title\" is required"]
}
```

### 7. Not-found example

```bash
curl -X GET http://localhost:3000/api/tasks/999
```

```json
{ "error": "TaskNotFound", "message": "Task 999 not found" }
```

## npm scripts

| Script              | What it does                                       |
|---------------------|----------------------------------------------------|
| `npm start`         | Start the API on `PORT` (default `3000`)           |
| `npm run dev`       | Same as `start` (alias)                            |
| `npm run migrate`   | Apply pending Knex migrations                      |
| `npm run rollback`  | Roll back the most recent migration batch          |
| `npm run seed`      | Reset the `tasks` table and insert 5 sample rows   |

## Notes & assumptions

- **No auth.** This is a CRUD reference. Adding JWT/session auth is a natural next step.
- **`PUT` semantics.** This implementation treats `PUT` as a partial update (any subset of fields), which is the most useful behavior for the curl-driven testing flow the spec asks for. To enforce full-replacement semantics, tighten `updateTaskSchema` to require all fields.
- **SQLite file location.** `tasks.db` lives in the project root. Delete it (and rerun `npm run migrate`) to start clean.
- **Seeding is destructive.** `node seed.js` clears the `tasks` table before inserting. For a non-destructive variant, switch it to `insert(SAMPLE_TASKS).onConflict('id').ignore()`.
