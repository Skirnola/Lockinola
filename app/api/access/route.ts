import { expiredSessionCookie, getAccessStatus, sameOrigin, sessionCookie, verifyPassword } from "@/lib/access-control";

export const runtime = "nodejs";

const attempts = new Map<string, { count: number; resetAt: number }>();
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function json(body: Record<string, unknown>, init?: ResponseInit) {
  return Response.json(body, { ...init, headers: { "Cache-Control": "no-store", ...init?.headers } });
}

export async function GET(request: Request) {
  return json(await getAccessStatus(request));
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "This sign-in request came from another origin." }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "Send the workspace password as JSON." }, { status: 415 });
  const client = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const previous = attempts.get(client);
  const record = !previous || previous.resetAt <= now ? { count: 0, resetAt: now + ATTEMPT_WINDOW_MS } : previous;
  if (record.count >= MAX_ATTEMPTS) return json({ error: "Too many attempts. Wait 15 minutes before trying again." }, { status: 429 });
  let password = "";
  try {
    const body = await request.json() as { password?: unknown };
    password = typeof body.password === "string" ? body.password.slice(0, 256) : "";
  } catch {
    return json({ error: "The sign-in request could not be read." }, { status: 400 });
  }
  if (!(await verifyPassword(password))) {
    attempts.set(client, { ...record, count: record.count + 1 });
    return json({ error: "That workspace password is not correct." }, { status: 401 });
  }
  attempts.delete(client);
  return json({ authenticated: true }, { headers: { "Set-Cookie": await sessionCookie() } });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ error: "This sign-out request came from another origin." }, { status: 403 });
  return json({ authenticated: false }, { headers: { "Set-Cookie": expiredSessionCookie() } });
}
