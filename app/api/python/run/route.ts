import { z } from "zod";
import { requireAccess } from "@/lib/access-control";

export const runtime = "nodejs";

const schema = z.object({
  exerciseId: z.enum(["intro-function", "grade-classifier", "count-even"]),
  code: z.string().min(1).max(8_000),
});

function json(body: Record<string, unknown>, init?: ResponseInit) {
  return Response.json(body, { ...init, headers: { "Cache-Control": "no-store", ...init?.headers } });
}

export async function POST(request: Request) {
  const denied = await requireAccess(request);
  if (denied) return denied;
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ status: "error", message: "Send Python work as JSON." }, { status: 415 });
  }
  let body: unknown;
  try { body = await request.json(); }
  catch { return json({ status: "error", message: "The runner could not read that request." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return json({ status: "error", message: "Choose an exercise and write no more than 8,000 characters of Python." }, { status: 400 });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_500);
  try {
    const response = await fetch(process.env.LOCKINOLA_RUNNER_URL ?? "http://127.0.0.1:4317/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      signal: controller.signal,
    });
    const result = await response.json() as Record<string, unknown>;
    return json(result, { status: response.ok ? 200 : response.status });
  } catch {
    return json({ status: "error", message: "The local Python helper is unavailable. Restart the site with npm run dev." }, { status: 503 });
  } finally { clearTimeout(timeout); }
}
