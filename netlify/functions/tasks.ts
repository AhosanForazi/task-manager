import type { Config } from "@netlify/functions";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { tasks } from "../../db/schema.js";

const statuses = new Set(["pending", "in_progress", "done"]);

type TaskPayload = {
  title?: unknown;
  description?: unknown;
  status?: unknown;
};

function json(body: unknown, init: ResponseInit = {}) {
  return Response.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init.headers || {}),
    },
  });
}

function validationError(details: string[]) {
  return json({ error: "ValidationError", details }, { status: 400 });
}

function serializeTask(task: typeof tasks.$inferSelect) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };
}

function parseId(pathname: string) {
  const match = pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function readPayload(req: Request): Promise<TaskPayload> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function validateCreate(payload: TaskPayload) {
  const details: string[] = [];
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const description =
    typeof payload.description === "string" ? payload.description : payload.description === null ? null : undefined;
  const status = typeof payload.status === "string" ? payload.status : "pending";

  if (!title) details.push('"title" is required');
  if (title.length > 255) details.push('"title" length must be less than or equal to 255 characters long');
  if (typeof description === "string" && description.length > 2000) {
    details.push('"description" length must be less than or equal to 2000 characters long');
  }
  if (!statuses.has(status)) details.push('"status" must be one of [pending, in_progress, done]');

  return { details, value: { title, description: description ?? null, status } };
}

function validateUpdate(payload: TaskPayload) {
  const details: string[] = [];
  const patch: { title?: string; description?: string | null; status?: string; updatedAt: string } = {
    updatedAt: new Date().toISOString(),
  };

  if ("title" in payload) {
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    if (!title) details.push('"title" is not allowed to be empty');
    if (title.length > 255) details.push('"title" length must be less than or equal to 255 characters long');
    patch.title = title;
  }

  if ("description" in payload) {
    if (payload.description !== null && typeof payload.description !== "string") {
      details.push('"description" must be a string');
    } else if (typeof payload.description === "string" && payload.description.length > 2000) {
      details.push('"description" length must be less than or equal to 2000 characters long');
    } else {
      patch.description = payload.description ?? null;
    }
  }

  if ("status" in payload) {
    const status = typeof payload.status === "string" ? payload.status : "";
    if (!statuses.has(status)) details.push('"status" must be one of [pending, in_progress, done]');
    patch.status = status;
  }

  if (!("title" in payload) && !("description" in payload) && !("status" in payload)) {
    details.push("At least one field must be provided");
  }

  return { details, value: patch };
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const isCollection = url.pathname === "/api/tasks";
  const id = parseId(url.pathname);

  try {
    if (req.method === "GET" && isCollection) {
      const allTasks = await db.select().from(tasks).orderBy(desc(tasks.createdAt));
      return json({ data: allTasks.map(serializeTask), count: allTasks.length });
    }

    if (req.method === "GET" && id) {
      const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
      if (!task) return json({ error: "TaskNotFound", message: `Task ${id} not found` }, { status: 404 });
      return json({ data: serializeTask(task) });
    }

    if (req.method === "POST" && isCollection) {
      const payload = await readPayload(req);
      const { details, value } = validateCreate(payload);
      if (details.length) return validationError(details);

      const [task] = await db.insert(tasks).values(value).returning();
      return json({ data: serializeTask(task) }, { status: 201 });
    }

    if (req.method === "PUT" && id) {
      const payload = await readPayload(req);
      const { details, value } = validateUpdate(payload);
      if (details.length) return validationError(details);

      const [task] = await db.update(tasks).set(value).where(eq(tasks.id, id)).returning();
      if (!task) return json({ error: "TaskNotFound", message: `Task ${id} not found` }, { status: 404 });
      return json({ data: serializeTask(task) });
    }

    if (req.method === "DELETE" && id) {
      const [task] = await db.delete(tasks).where(eq(tasks.id, id)).returning({ id: tasks.id });
      if (!task) return json({ error: "TaskNotFound", message: `Task ${id} not found` }, { status: 404 });
      return new Response(null, { status: 204 });
    }

    return json({ error: "NotFound", message: `Route ${req.method} ${url.pathname} not found` }, { status: 404 });
  } catch (error) {
    console.error(error);
    return json({ error: "InternalServerError", message: "Unexpected server error" }, { status: 500 });
  }
}

export const config: Config = {
  path: "/api/tasks*",
};
