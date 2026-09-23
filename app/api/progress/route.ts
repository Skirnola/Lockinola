import { env } from "cloudflare:workers";
import { parseLearningData } from "@/lib/learning-data";
import { requireAccess, sameOrigin } from "@/lib/access-control";

export const runtime = "nodejs";

const WORKSPACE_ID = "primary";
const MAX_BODY_BYTES = 1_000_000;

type StoredWorkspace = {
  payload: string;
  updated_at: string;
  revision: number;
};

function json(body: Record<string, unknown>, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: { "Cache-Control": "no-store", ...init?.headers },
  });
}

function database() {
  return env.DB;
}

export async function GET(request: Request) {
  const denied = await requireAccess(request);
  if (denied) return denied;
  const db = database();
  if (!db) return json({ configured: false, data: null }, { status: 503 });

  const stored = await db.prepare(
    "SELECT payload, updated_at, revision FROM workspace_state WHERE id = ?1",
  ).bind(WORKSPACE_ID).first<StoredWorkspace>();

  if (!stored) return json({ configured: true, data: null, revision: 0 });
  try {
    return json({
      configured: true,
      data: parseLearningData(JSON.parse(stored.payload)),
      revision: stored.revision,
      updatedAt: stored.updated_at,
    });
  } catch {
    return json({ code: "invalid_cloud_data", error: "The cloud copy could not be read safely." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const denied = await requireAccess(request);
  if (denied) return denied;
  if (!sameOrigin(request)) return json({ error: "This save request came from another origin." }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "Send progress as JSON." }, { status: 415 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return json({ error: "The progress file is too large." }, { status: 413 });

  const db = database();
  if (!db) return json({ configured: false, error: "Cloud progress is not configured." }, { status: 503 });

  try {
    const body = await request.json() as { data?: unknown };
    const data = parseLearningData(body.data);
    const payload = JSON.stringify(data);
    if (new TextEncoder().encode(payload).byteLength > MAX_BODY_BYTES) {
      return json({ error: "The progress file is too large." }, { status: 413 });
    }
    const updatedAt = new Date().toISOString();
    await db.prepare(`
      INSERT INTO workspace_state (id, payload, updated_at, revision)
      VALUES (?1, ?2, ?3, 1)
      ON CONFLICT(id) DO UPDATE SET
        payload = excluded.payload,
        updated_at = excluded.updated_at,
        revision = workspace_state.revision + 1
    `).bind(WORKSPACE_ID, payload, updatedAt).run();
    const row = await db.prepare(
      "SELECT revision FROM workspace_state WHERE id = ?1",
    ).bind(WORKSPACE_ID).first<{ revision: number }>();
    return json({ saved: true, updatedAt, revision: row?.revision ?? 1 });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("supported Lockinola backup")
      ? error.message
      : "Cloud progress could not be saved.";
    return json({ error: message }, { status: 400 });
  }
}
