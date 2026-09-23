"use client";

import { useEffect, useState } from "react";
import { Bot, Lightbulb, LoaderCircle, MessageSquareText, ShieldCheck } from "lucide-react";
import type { Lesson } from "@/components/learning-views";

type TutorStatus = {
  configured: boolean;
  provider?: "ollama" | "openai";
  model?: string;
  used: number;
  limit: number;
  remaining: number;
};

type TutorReply = Partial<TutorStatus> & {
  feedback?: string;
  error?: string;
  code?: string;
};

const emptyStatus: TutorStatus = { configured: false, used: 0, limit: 20, remaining: 20 };

export function AiTutor({ lesson }: { lesson: Lesson }) {
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<TutorStatus>(emptyStatus);
  const [statusReady, setStatusReady] = useState(false);
  const [statusError, setStatusError] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<"hint" | "review" | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/tutor", { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<TutorStatus>;
      })
      .then(next => { setStatus(next); setStatusReady(true); })
      .catch(() => { if (!controller.signal.aborted) { setStatusError(true); setStatusReady(true); } });
    return () => controller.abort();
  }, []);

  async function ask(mode: "hint" | "review") {
    if (mode === "review" && answer.trim().length < 2) {
      setError("Write your attempt first, then ask the tutor to review it.");
      return;
    }
    setLoading(mode);
    setFeedback("");
    setError("");
    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          lesson: {
            title: lesson.title,
            track: lesson.track ?? "General",
            kind: lesson.kind,
            detail: lesson.detail,
            week: lesson.week,
            sourceName: lesson.sourceName,
          },
          answer,
        }),
      });
      const reply = await response.json() as TutorReply;
      if (typeof reply.used === "number" && typeof reply.limit === "number" && typeof reply.remaining === "number") {
        setStatus(previous => ({ ...previous, used: reply.used!, limit: reply.limit!, remaining: reply.remaining! }));
      }
      if (!response.ok || !reply.feedback) {
        throw new Error(reply.error ?? "The tutor could not respond. Try again.");
      }
      setFeedback(reply.feedback);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The tutor could not respond. Try again.");
    } finally {
      setLoading(null);
    }
  }

  const disabled = Boolean(loading) || status.remaining === 0 || (statusReady && (!status.configured || statusError));
  const placeholder = lesson.track === "Coding"
    ? "Paste your code or explain your approach…"
    : lesson.track === "Cloud & DevOps"
      ? "Paste the commands/output you tried, or explain what you did…"
      : "Type your answer, reading, or what you remember…";

  return <section className="ai-tutor" aria-labelledby="ai-tutor-title">
    <div className="ai-tutor-heading">
      <span className="ai-tutor-mark"><Bot size={18} /></span>
      <div><span className="eyebrow">STAGE 5 · AI TUTOR</span><h3 id="ai-tutor-title">Get unstuck, then check your work</h3></div>
      <span className="ai-budget">{statusReady ? `${status.used} / ${status.limit} today` : "Checking limit…"}</span>
    </div>
    {!status.configured && statusReady && !statusError && <div className="tutor-setup"><ShieldCheck size={16} /><span><strong>AI provider setup needed.</strong> Add the provider settings from <code>.env.example</code>, then restart the site.</span></div>}
    {statusError && <p className="tutor-error" role="alert">Tutor status could not be loaded. Check the local server and reopen this lesson.</p>}
    <label className="tutor-answer"><span>Your work</span><textarea value={answer} maxLength={4000} onChange={event => setAnswer(event.target.value)} placeholder={placeholder} /><small>{answer.length} / 4000</small></label>
    <div className="tutor-actions">
      <button className="secondary-btn" disabled={disabled} onClick={() => void ask("hint")}>
        {loading === "hint" ? <LoaderCircle className="spin" size={16} /> : <Lightbulb size={16} />} Hint, no solution
      </button>
      <button className="primary-btn" disabled={disabled} onClick={() => void ask("review")}>
        {loading === "review" ? <LoaderCircle className="spin" size={16} /> : <MessageSquareText size={16} />} Review my answer
      </button>
    </div>
    {status.remaining === 0 && <p className="tutor-error" role="alert">Today’s tutor limit is finished. It resets tomorrow in Jakarta time.</p>}
    {error && <p className="tutor-error" role="alert">{error}</p>}
    {feedback && <div className="tutor-feedback" role="status"><span>AI FEEDBACK</span><p>{feedback}</p></div>}
    <p className="tutor-boundary">AI feedback can be wrong. Stage 5 reviews text only; it does not run code or verify cloud work.</p>
  </section>;
}
