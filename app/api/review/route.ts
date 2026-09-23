import { z } from "zod";
import { env } from "cloudflare:workers";
import { isHosted, requireAccess } from "@/lib/access-control";
import { generateReview, reviewProviderStatus } from "@/lib/review-provider";

export const runtime = "nodejs";

const requestSchema = z.object({
  mode: z.enum(["hint", "review"]),
  lesson: z.object({
    title: z.string().trim().min(1).max(160),
    track: z.string().trim().min(1).max(80),
    kind: z.string().trim().min(1).max(80),
    detail: z.string().trim().min(1).max(1_500),
    week: z.number().int().min(1).max(52).optional(),
    sourceName: z.string().trim().max(160).optional(),
  }),
  answer: z.string().trim().max(4_000).default(""),
});

type DailyUsage = { date: string; used: number };
const usage: DailyUsage = { date: "", used: 0 };

function currentDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

function dailyLimit() {
  const configured = Number(process.env.LOCKINOLA_REVIEW_DAILY_LIMIT ?? 20);
  return Number.isInteger(configured) && configured >= 1 && configured <= 100 ? configured : 20;
}

async function usageSnapshot() {
  const date = currentDate();
  const limit = dailyLimit();
  if (isHosted() && env.DB) {
    const row = await env.DB.prepare("SELECT used FROM review_usage WHERE date = ?1").bind(date).first<{ used: number }>();
    const used = row?.used ?? 0;
    return { used, limit, remaining: Math.max(0, limit - used) };
  }
  if (usage.date !== date) { usage.date = date; usage.used = 0; }
  return { used: usage.used, limit, remaining: Math.max(0, limit - usage.used) };
}

async function reserveUsage() {
  const date = currentDate();
  const limit = dailyLimit();
  if (isHosted() && env.DB) {
    await env.DB.prepare("INSERT OR IGNORE INTO review_usage (date, used) VALUES (?1, 0)").bind(date).run();
    const result = await env.DB.prepare("UPDATE review_usage SET used = used + 1 WHERE date = ?1 AND used < ?2").bind(date, limit).run();
    return { allowed: (result.meta.changes ?? 0) > 0, ...await usageSnapshot() };
  }
  const before = await usageSnapshot();
  if (before.remaining === 0) return { allowed: false, ...before };
  usage.used += 1;
  return { allowed: true, ...await usageSnapshot() };
}

function json(body: Record<string, unknown>, init?: ResponseInit) {
  return Response.json(body, { ...init, headers: { "Cache-Control": "no-store", ...init?.headers } });
}

export async function GET(request: Request) {
  const denied = await requireAccess(request);
  if (denied) return denied;
  return json({ ...reviewProviderStatus(), ...await usageSnapshot() });
}

export async function POST(request: Request) {
  const denied = await requireAccess(request);
  if (denied) return denied;
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ code: "invalid_request", error: "Send lesson work as JSON.", ...await usageSnapshot() }, { status: 415 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return json({ code: "invalid_request", error: "The review service could not read that request.", ...await usageSnapshot() }, { status: 400 }); }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return json({ code: "invalid_request", error: "The lesson or answer is incomplete.", ...await usageSnapshot() }, { status: 400 });
  if (parsed.data.mode === "review" && parsed.data.answer.length < 2) return json({ code: "answer_required", error: "Write an answer before asking for a review.", ...await usageSnapshot() }, { status: 400 });

  const provider = reviewProviderStatus();
  if (!provider.configured) return json({ code: "not_configured", error: "Ollama is not configured yet.", ...await usageSnapshot() }, { status: 503 });
  const reservation = await reserveUsage();
  if (!reservation.allowed) return json({ code: "daily_limit", error: "Today’s review limit has been reached.", ...reservation }, { status: 429 });

  const lesson = parsed.data.lesson;
  const instructions = [
    "You are Lockinola's code and learning reviewer.",
    "Use only the supplied lesson context and learner work. Keep the response under 180 words.",
    "For HINT mode: do not give the finished solution. Explain one useful idea, give 2-4 small clues, and end with one concrete next action.",
    "For REVIEW mode: start with exactly one verdict line: 'Verdict: Correct', 'Verdict: Partly correct', or 'Verdict: Needs work'. Then explain one strength, the most important issue, and one next action.",
    "For coding, review the text but never claim the code was executed. For cloud work, never claim commands or infrastructure were verified. For Japanese, explain corrections simply and include kana when useful.",
    "Do not award mastery, certification, XP, or a level. If the task cannot be assessed from the supplied work, say what evidence is missing.",
  ].join(" ");
  const input = [
    `MODE: ${parsed.data.mode.toUpperCase()}`,
    `TRACK: ${lesson.track}`,
    `LESSON: ${lesson.title}`,
    `TYPE: ${lesson.kind}`,
    lesson.week ? `WEEK: ${lesson.week}` : "",
    lesson.sourceName ? `SOURCE: ${lesson.sourceName}` : "",
    `ASSIGNMENT: ${lesson.detail}`,
    `LEARNER WORK: ${parsed.data.answer || "No work submitted yet; give a starting hint for the assignment."}`,
  ].filter(Boolean).join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const feedback = await generateReview(instructions, input, controller.signal);
    return json({ feedback, mode: parsed.data.mode, provider: provider.provider, model: provider.model, ...await usageSnapshot() });
  } catch (error) {
    const code = error instanceof Error ? error.message : "provider_error";
    const message = code === "not_configured" || code === "configuration_error"
      ? "The server could not authenticate the review endpoint. Check its provider key."
      : code === "provider_limit" ? "The model endpoint is busy or its usage limit was reached. Try again later."
        : code === "refused" ? "The review request was refused. Keep your submission focused on this lesson and try again."
          : code === "empty_response" ? "The review endpoint returned no readable output. Try rewording your work."
            : error instanceof Error && error.name === "AbortError" ? "The review took too long to respond. Try again."
              : "The review endpoint could not connect. Check the provider and try again.";
    return json({ code, error: message, ...await usageSnapshot() }, { status: code === "provider_limit" ? 429 : code === "refused" ? 422 : 502 });
  } finally {
    clearTimeout(timeout);
  }
}
