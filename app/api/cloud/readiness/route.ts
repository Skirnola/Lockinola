import { requireAccess } from "@/lib/access-control";

export const runtime = "nodejs";

function json(body: Record<string, unknown>, init?: ResponseInit) {
  return Response.json(body, { ...init, headers: { "Cache-Control": "no-store", ...init?.headers } });
}

export async function GET(request: Request) {
  const denied = await requireAccess(request);
  if (denied) return denied;
  const configured = process.env.LOCKINOLA_RUNNER_URL ?? "http://127.0.0.1:4317/run";
  const readinessUrl = new URL("/cloud/readiness", configured).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(readinessUrl, { signal: controller.signal, cache: "no-store" });
    const result = await response.json() as Record<string, unknown>;
    return json(result, { status: response.ok ? 200 : response.status });
  } catch {
    return json({ status: "error", message: "The local readiness helper is unavailable. Restart the site with npm run dev." }, { status: 503 });
  } finally {
    clearTimeout(timeout);
  }
}
