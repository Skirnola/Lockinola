"use client";

import { useEffect, useState } from "react";
import { CodeXml, Lightbulb, LoaderCircle, MessageSquareText, ShieldCheck } from "lucide-react";
import type { Lesson } from "@/components/learning-views";

type ReviewStatus = {
  configured: boolean;
  provider?: "ollama";
  model?: string;
  used: number;
  limit: number;
  remaining: number;
};

type ReviewReply = Partial<ReviewStatus> & {
  feedback?: string;
  error?: string;
  code?: string;
};

const emptyStatus: ReviewStatus = { configured: false, used: 0, limit: 20, remaining: 20 };

export function ReviewConsole({ lesson }: { lesson: Lesson }) {
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<ReviewStatus>(emptyStatus);
  const [statusReady, setStatusReady] = useState(false);
  const [statusError, setStatusError] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<"hint" | "review" | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/review", { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<ReviewStatus>;
      })
      .then(next => { setStatus(next); setStatusReady(true); })
      .catch(() => { if (!controller.signal.aborted) { setStatusError(true); setStatusReady(true); } });
    return () => controller.abort();
  }, []);

  async function ask(mode: "hint" | "review") {
    if (mode === "review" && answer.trim().length < 2) {
      setError("Write your attempt first, then run the review.");
      return;
    }
    setLoading(mode);
    setFeedback("");
    setError("");
    try {
      const response = await fetch("/api/review", {
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
      const reply = await response.json() as ReviewReply;
      if (typeof reply.used === "number" && typeof reply.limit === "number" && typeof reply.remaining === "number") {
        setStatus(previous => ({ ...previous, used: reply.used!, limit: reply.limit!, remaining: reply.remaining! }));
      }
      if (!response.ok || !reply.feedback) {
        throw new Error(reply.error ?? "The review service could not respond. Try again.");
      }
      setFeedback(reply.feedback);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The review service could not respond. Try again.");
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

  return <section className="review-console" aria-labelledby="review-console-title">
    <div className="review-console-heading">
      <span className="review-console-mark"><CodeXml size={18} /></span>
      <div><span className="eyebrow">REVIEW CONSOLE</span><h3 id="review-console-title">Inspect your approach</h3></div>
      <span className="review-budget">{statusReady ? `${status.used} / ${status.limit} today` : "Checking limit…"}</span>
    </div>
    {!status.configured && statusReady && !statusError && <div className="review-setup"><ShieldCheck size={16} /><span><strong>Review endpoint is offline.</strong> Set the Ollama API key as a Cloudflare Worker secret to enable hosted reviews.</span></div>}
    {statusError && <p className="review-error" role="alert">Review status could not be loaded. Check the local server and reopen this lesson.</p>}
    <label className="review-answer"><span>Your work</span><textarea value={answer} maxLength={4000} onChange={event => setAnswer(event.target.value)} placeholder={placeholder} /><small>{answer.length} / 4000</small></label>
    <div className="review-actions">
      <button className="secondary-btn" disabled={disabled} onClick={() => void ask("hint")}>
        {loading === "hint" ? <LoaderCircle className="spin" size={16} /> : <Lightbulb size={16} />} Hint, no solution
      </button>
      <button className="primary-btn" disabled={disabled} onClick={() => void ask("review")}>
        {loading === "review" ? <LoaderCircle className="spin" size={16} /> : <MessageSquareText size={16} />} Review my answer
      </button>
    </div>
    {status.remaining === 0 && <p className="review-error" role="alert">Today’s review limit is finished. It resets tomorrow in Jakarta time.</p>}
    {error && <p className="review-error" role="alert">{error}</p>}
    {feedback && <div className="review-feedback" role="status"><span>REVIEW OUTPUT</span><p>{feedback}</p></div>}
    <p className="review-boundary">Generated reviews can be inaccurate. This console checks text only; it does not run code or verify cloud work.</p>
  </section>;
}
