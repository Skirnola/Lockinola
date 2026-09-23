"use client";

import { useState } from "react";
import { Check, HardDrive, KeyRound, LoaderCircle, LockKeyhole, LogOut, Server, ShieldCheck, X } from "lucide-react";
import type { LearningData } from "@/lib/learning-data";
import { parseLearningData, serializeLearningData } from "@/lib/learning-data";

export type ClientAccessStatus = {
  mode: "local" | "hosted" | "unavailable";
  authenticated: boolean;
  accessConfigured: boolean;
  readyForPrivateRelease: boolean;
  reviewConfigured: boolean;
  reviewDailyLimit: number;
  runnerIsLoopback: boolean;
};

export function AccessGate({ status, checking, onAuthenticated, onRetry }: {
  status: ClientAccessStatus | null;
  checking: boolean;
  onAuthenticated: () => void;
  onRetry: () => void;
}) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    if (!password || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json() as { authenticated?: boolean; error?: string };
      if (!response.ok || !result.authenticated) throw new Error(result.error || "The workspace could not be unlocked.");
      setPassword("");
      onAuthenticated();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The workspace could not be unlocked.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="access-screen"><section className="access-card" aria-labelledby="access-title"><div className="access-brand"><img className="brand-mark" src="/lockinola-mark.svg" alt="" width="34" height="34" /><strong>lockinola</strong></div>{checking ? <div className="access-checking"><LoaderCircle className="spin" size={24} /><h1 id="access-title">Checking private access</h1><p>Your learning records stay hidden until the release boundary is known.</p></div> : status?.mode === "unavailable" ? <><span className="access-icon warning"><X size={22} /></span><h1 id="access-title">Access check unavailable</h1><p>The site could not confirm whether this workspace is private. It stays closed instead of guessing.</p><button className="primary-btn" onClick={onRetry}>Try again</button></> : !status?.accessConfigured ? <><span className="access-icon warning"><LockKeyhole size={22} /></span><h1 id="access-title">Hosted access is not configured</h1><p>Add a password of at least 12 characters and a random secret of at least 32 characters, then restart the server.</p><div className="access-env"><code>LOCKINOLA_ACCESS_PASSWORD</code><code>LOCKINOLA_ACCESS_SECRET</code></div></> : <><span className="access-icon"><LockKeyhole size={22} /></span><span className="eyebrow">PRIVATE WORKSPACE</span><h1 id="access-title">Welcome back.</h1><p>Enter the password for this Lockinola workspace.</p><label className="access-password"><span>Workspace password</span><input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void signIn(); }} autoFocus /></label>{error && <p className="access-error" role="alert">{error}</p>}<button className="primary-btn" disabled={!password || submitting} onClick={() => void signIn()}>{submitting ? <LoaderCircle className="spin" size={16} /> : <KeyRound size={16} />}{submitting ? "Unlocking…" : "Unlock workspace"}</button></>}</section></main>;
}

export function ReleasePanel({ data, status, onLock }: { data: LearningData; status: ClientAccessStatus; onLock: () => void }) {
  let backupValid = false;
  try { backupValid = parseLearningData(JSON.parse(serializeLearningData(data))).version === data.version; } catch { backupValid = false; }
  const checks = [
    { label: "Current data boundary", detail: status.mode === "local" ? "Local browser only" : "Hosted browser with access cookie", okay: status.mode === "local" || status.accessConfigured, icon: HardDrive },
    { label: "Private access", detail: status.mode === "local" ? "Not required for localhost" : status.accessConfigured ? "Password gate configured" : "Configuration missing", okay: status.mode === "local" || status.accessConfigured, icon: LockKeyhole },
    { label: "Backup round trip", detail: backupValid ? "Current data validates for restore" : "Current data did not validate", okay: backupValid, icon: ShieldCheck },
    { label: "Local helper boundary", detail: status.runnerIsLoopback ? "Runner points to this computer only" : "Runner URL needs review", okay: status.runnerIsLoopback, icon: Server },
    { label: "Review request limit", detail: status.reviewConfigured ? `${status.reviewDailyLimit} requests per Jakarta day` : "Model key is not configured", okay: true, icon: KeyRound },
  ];
  return <section className="release-panel"><div className="release-heading"><div><span className="eyebrow"><ShieldCheck size={14} /> DEPLOYMENT STATUS</span><h3>Release readiness</h3><p>{status.mode === "local" ? "This workspace is running locally. Nothing has been published." : status.readyForPrivateRelease ? "The hosted access boundary is configured." : "Hosted mode is closed until every required boundary is configured."}</p></div>{status.mode === "hosted" && <button className="secondary-btn" onClick={onLock}><LogOut size={15} /> Lock</button>}</div><div className="release-checks">{checks.map(item => <div key={item.label}><span className={item.okay ? "release-ok" : "release-missing"}>{item.okay ? <Check size={14} /> : <X size={14} />}</span><item.icon size={16} /><div><strong>{item.label}</strong><p>{item.detail}</p></div></div>)}</div><ol className="release-steps"><li><b>01</b><span><strong>Download a fresh backup</strong>Restore it locally before changing hosts or browsers.</span></li><li><b>02</b><span><strong>Choose private hosting</strong>Set hosted mode, the access password, and a random secret only in the host environment.</span></li><li><b>03</b><span><strong>Keep helpers private</strong>Never expose the Python runner or Floci endpoint to the public internet.</span></li><li><b>04</b><span><strong>Test before sharing</strong>Check sign-in, sign-out, phone layout, restore, and API denial in a private preview.</span></li></ol></section>;
}
