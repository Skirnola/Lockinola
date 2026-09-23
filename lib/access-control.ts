import { env } from "cloudflare:workers";

const COOKIE_NAME = "lockinola_access";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

export type AccessStatus = {
  mode: "local" | "hosted";
  authenticated: boolean;
  accessConfigured: boolean;
  readyForPrivateRelease: boolean;
  reviewConfigured: boolean;
  reviewDailyLimit: number;
  runnerIsLoopback: boolean;
};

export function isHosted() {
  return (env.LOCKINOLA_HOSTED ?? process.env.LOCKINOLA_HOSTED) === "true";
}

function accessPassword() {
  return env.LOCKINOLA_ACCESS_PASSWORD ?? process.env.LOCKINOLA_ACCESS_PASSWORD ?? "";
}

function accessSecret() {
  return env.LOCKINOLA_ACCESS_SECRET ?? process.env.LOCKINOLA_ACCESS_SECRET ?? "";
}

function accessConfigured() {
  return accessPassword().length >= 12 && accessSecret().length >= 32;
}

function dailyLimit() {
  const value = Number(env.LOCKINOLA_REVIEW_DAILY_LIMIT ?? process.env.LOCKINOLA_REVIEW_DAILY_LIMIT ?? 20);
  return Number.isInteger(value) && value >= 1 && value <= 100 ? value : 20;
}

function runnerIsLoopback() {
  try {
    const url = new URL(env.LOCKINOLA_RUNNER_URL ?? process.env.LOCKINOLA_RUNNER_URL ?? "http://127.0.0.1:4317/run");
    return ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function cookieValue(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.split(";").map(item => item.trim()).find(item => item.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1) ?? "";
}

function toHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, "0")).join("");
}

async function digest(value: string) {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function signature(message: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(accessSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

function constantTimeEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let different = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) different |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return different === 0;
}

async function tokenMessage(expires: string) {
  return `${expires}.${(await digest(accessPassword())).slice(0, 24)}`;
}

async function hasValidSession(request: Request) {
  if (!isHosted()) return true;
  if (!accessConfigured()) return false;
  const [expires, supplied] = cookieValue(request).split(".");
  if (!expires || !supplied || !/^\d+$/.test(expires) || Number(expires) <= Math.floor(Date.now() / 1000)) return false;
  const expected = await signature(await tokenMessage(expires));
  return constantTimeEqual(supplied, expected);
}

export async function getAccessStatus(request: Request): Promise<AccessStatus> {
  const hosted = isHosted();
  const configured = accessConfigured();
  return {
    mode: hosted ? "hosted" : "local",
    authenticated: hosted ? await hasValidSession(request) : true,
    accessConfigured: configured,
    readyForPrivateRelease: hosted && configured && runnerIsLoopback(),
    reviewConfigured: !hosted || Boolean(env.OLLAMA_API_KEY ?? process.env.OLLAMA_API_KEY),
    reviewDailyLimit: dailyLimit(),
    runnerIsLoopback: runnerIsLoopback(),
  };
}

export async function verifyPassword(value: string) {
  const [supplied, expected] = await Promise.all([digest(value), digest(accessPassword())]);
  return accessConfigured() && constantTimeEqual(supplied, expected);
}

export async function sessionCookie() {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const signed = await signature(await tokenMessage(String(expires)));
  return `${COOKIE_NAME}=${expires}.${signed}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

export function expiredSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function requireAccess(request: Request) {
  if (await hasValidSession(request)) return null;
  return Response.json({ code: "access_required", error: "Private workspace access is required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
