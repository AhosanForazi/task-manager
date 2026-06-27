# Task Management API

A small but complete **CRUD task manager** with a static frontend, Netlify Functions API, and Netlify Database persistence.

## Tech stack

| Layer       | Choice                                                |
|-------------|--------------------------------------------------------|
| Hosting     | Netlify static deploy from `public/`                   |
| API         | Netlify Functions                                      |
| Database    | Netlify Database, backed by managed Postgres           |
| ORM / Query | Drizzle ORM                                            |
| Validation  | Function-level request validation                      |

## Project layout

```
.
├── knexfile.js
├── netlify.toml
├── package.json
├── seed.js
├── README.md
├── db
│   ├── index.ts                   # Netlify Database Drizzle client
│   └── schema.ts                  # Drizzle table definitions
├── netlify
│   ├── database/migrations        # migrations applied by Netlify
│   └── functions/tasks.ts         # /api/tasks serverless API
├── public/                        # static UI published by Netlify
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── src
    ├── app.js                     # legacy local Express app
    ├── controllers
    │   ├── taskController.js
    │   └── taskValidator.js       # Joi schemas
    ├── models
    │   └── taskModel.js           # Knex queries
    ├── routes
    │   └── taskRoutes.js
    └── db
        ├── knex.js                # legacy local Knex instance
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
```

Netlify applies the SQL files in `netlify/database/migrations/` during deploy. The database is provisioned automatically on first connection.

## Run locally with Netlify

```bash
/opt/buildhome/node-deps/node_modules/.bin/netlify dev --port 8889
```

The static site and `/api/tasks` function are both available through the Netlify dev server.

## Web UI

A polished single-page UI ships in `public/`. On Netlify, `public/` is the published directory and the UI calls `/api/tasks`.

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

Every example below assumes the Netlify dev server is running on `http://localhost:8889`.

### 1. List all tasks — `GET /api/tasks`

```bash
curl -X GET http://localhost:8889/api/tasks
```

### 2. Get a single task — `GET /api/tasks/:id`

```bash
curl -X GET http://localhost:8889/api/tasks/1
```

### 3. Create a task — `POST /api/tasks`

`title` is required. `description` is optional. `status` is optional and defaults to `pending`; valid values are `pending`, `in_progress`, `done`.

```bash
curl -X POST http://localhost:8889/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Write integration tests",
    "description": "Cover happy path + validation errors with supertest.",
    "status": "in_progress"
  }'
```

Minimal valid body (only `title`):

```bash
curl -X POST http://localhost:8889/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Quick note"}'
```

### 4. Update a task — `PUT /api/tasks/:id`

Send only the fields you want to change. At least one field is required.

```bash
curl -X PUT http://localhost:8889/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'
```

```bash
curl -X PUT http://localhost:8889/api/tasks/2 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Design tasks table schema (v2)",
    "description": "Added an index on status."
  }'
```

### 5. Delete a task — `DELETE /api/tasks/:id`

```bash
curl -X DELETE http://localhost:8889/api/tasks/3
# HTTP/1.1 204 No Content
```

### 6. Validation failure example

```bash
curl -X POST http://localhost:8889/api/tasks \
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
curl -X GET http://localhost:8889/api/tasks/999
```

```json
{ "error": "TaskNotFound", "message": "Task 999 not found" }
```

## npm scripts

| Script              | What it does                                       |
|---------------------|----------------------------------------------------|
| `npm start`         | Start the legacy local Express API on `PORT`       |
| `npm run dev`       | Same as `start` (legacy local Express API)         |
| `npm run migrate`   | Apply legacy Knex migrations                       |
| `npm run rollback`  | Roll back legacy Knex migrations                   |
| `npm run seed`      | Reset the legacy SQLite `tasks` table              |

## Notes & assumptions

- **No auth.** This is a CRUD reference. Adding JWT/session auth is a natural next step.
- **`PUT` semantics.** This implementation treats `PUT` as a partial update (any subset of fields), which is the most useful behavior for the curl-driven testing flow the spec asks for. To enforce full-replacement semantics, tighten `updateTaskSchema` to require all fields.
- **SQLite file location.** `tasks.db` lives in the project root. Delete it (and rerun `npm run migrate`) to start clean.
- **Seeding is destructive.** `node seed.js` clears the `tasks` table before inserting. For a non-destructive variant, switch it to `insert(SAMPLE_TASKS).onConflict('id').ignore()`.
