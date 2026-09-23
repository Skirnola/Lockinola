"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Check, Clock3, Headphones, Keyboard, Languages, RotateCcw, Volume2, X } from "lucide-react";
import { createRecordId, type JapaneseAttempt, type JapaneseReview } from "@/lib/learning-data";

type Card = {
  id: string;
  group: "Hiragana" | "Katakana" | "Vocabulary";
  prompt: string;
  reading: string;
  meaning?: string;
  accepted: string[];
  hint: string;
};

const cards: Card[] = [
  { id: "hira-a", group: "Hiragana", prompt: "あ", reading: "a", accepted: ["a"], hint: "The open sound in father." },
  { id: "hira-i", group: "Hiragana", prompt: "い", reading: "i", accepted: ["i", "ii"], hint: "A short ee sound." },
  { id: "hira-u", group: "Hiragana", prompt: "う", reading: "u", accepted: ["u", "uu"], hint: "A short, unrounded oo sound." },
  { id: "hira-e", group: "Hiragana", prompt: "え", reading: "e", accepted: ["e"], hint: "Like e in get." },
  { id: "hira-o", group: "Hiragana", prompt: "お", reading: "o", accepted: ["o", "ou"], hint: "A clean o sound." },
  { id: "kata-a", group: "Katakana", prompt: "ア", reading: "a", accepted: ["a"], hint: "Katakana uses the same sound as hiragana." },
  { id: "kata-i", group: "Katakana", prompt: "イ", reading: "i", accepted: ["i", "ii"], hint: "Two sharp strokes; the sound is i." },
  { id: "kata-u", group: "Katakana", prompt: "ウ", reading: "u", accepted: ["u", "uu"], hint: "The sound is u." },
  { id: "kata-e", group: "Katakana", prompt: "エ", reading: "e", accepted: ["e"], hint: "The sound is e." },
  { id: "kata-o", group: "Katakana", prompt: "オ", reading: "o", accepted: ["o", "ou"], hint: "The sound is o." },
  { id: "word-neko", group: "Vocabulary", prompt: "ねこ", reading: "neko", meaning: "cat", accepted: ["cat", "kucing"], hint: "A common household animal." },
  { id: "word-inu", group: "Vocabulary", prompt: "いぬ", reading: "inu", meaning: "dog", accepted: ["dog", "anjing"], hint: "Another common household animal." },
  { id: "word-mizu", group: "Vocabulary", prompt: "みず", reading: "mizu", meaning: "water", accepted: ["water", "air"], hint: "Something you drink every day." },
  { id: "word-hon", group: "Vocabulary", prompt: "ほん", reading: "hon", meaning: "book", accepted: ["book", "buku"], hint: "Something you read." },
  { id: "word-asa", group: "Vocabulary", prompt: "あさ", reading: "asa", meaning: "morning", accepted: ["morning", "pagi"], hint: "The first part of the day." },
  { id: "word-sushi", group: "Vocabulary", prompt: "すし", reading: "sushi", meaning: "sushi", accepted: ["sushi"], hint: "A well-known Japanese food." },
];

type Mode = "Daily queue" | "Kana" | "Vocabulary";
type Feedback = { correct: boolean; submitted: string };

function normalize(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[.,!?\-_']/g, "").replace(/\s+/g, " ");
}

function nextReview(previous: JapaneseReview | undefined, correct: boolean, now: Date): JapaneseReview {
  const streak = correct ? (previous?.streak ?? 0) + 1 : 0;
  const intervals = [1, 3, 7, 14, 30, 60];
  const intervalDays = correct ? intervals[Math.min(streak - 1, intervals.length - 1)] : 0;
  const dueMs = correct ? intervalDays * 86_400_000 : 10 * 60_000;
  return { cardId: previous?.cardId ?? "", dueAt: new Date(now.getTime() + dueMs).toISOString(), intervalDays, streak, lastReviewedAt: now.toISOString() };
}

export function JapaneseWorkspace({ attempts, reviews, onRecord }: {
  attempts: JapaneseAttempt[];
  reviews: JapaneseReview[];
  onRecord: (attempt: JapaneseAttempt, review: JapaneseReview) => void;
}) {
  const [mode, setMode] = useState<Mode>("Daily queue");
  const [cardId, setCardId] = useState(cards[0].id);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const reviewMap = useMemo(() => new Map(reviews.map(item => [item.cardId, item])), [reviews]);
  const eligible = useMemo(() => cards.filter(card => mode === "Daily queue" || mode === "Kana" ? mode !== "Kana" || card.group !== "Vocabulary" : card.group === "Vocabulary"), [mode]);
  const dueCards = eligible.filter(card => {
    const review = reviewMap.get(card.id);
    return !review || new Date(review.dueAt).getTime() <= currentTime;
  });
  const card = cards.find(item => item.id === cardId && eligible.some(candidate => candidate.id === item.id)) ?? dueCards[0] ?? eligible[0];
  const queueStartId = (dueCards[0] ?? eligible[0])?.id;
  const today = currentTime ? new Date(currentTime).toDateString() : "";
  const todayAttempts = attempts.filter(item => new Date(item.createdAt).toDateString() === today);
  const correctToday = todayAttempts.filter(item => item.correct).length;

  useEffect(() => {
    const update = () => {
      setCurrentTime(Date.now());
      setAudioReady("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    };
    const start = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 60_000);
    return () => { window.clearTimeout(start); window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (feedback) window.setTimeout(() => nextRef.current?.focus(), 0);
  }, [feedback]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (queueStartId) setCardId(queueStartId);
      setAnswer("");
      setFeedback(null);
      inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [mode, queueStartId]);

  function speak() {
    if (!audioReady || !card) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(card.prompt);
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(voice => voice.lang.toLowerCase().startsWith("ja")) ?? null;
    utterance.lang = "ja-JP";
    utterance.rate = 0.72;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function submit() {
    if (!card || feedback || !answer.trim()) return;
    const submitted = normalize(answer);
    const correct = card.accepted.some(value => normalize(value) === submitted);
    const reviewedAt = new Date();
    const previous = reviewMap.get(card.id);
    const scheduled = nextReview(previous, correct, reviewedAt);
    const review = { ...scheduled, cardId: card.id };
    setFeedback({ correct, submitted: answer.trim() });
    onRecord({ id: createRecordId("jp"), cardId: card.id, prompt: card.prompt, submitted: answer.trim(), correct, createdAt: reviewedAt.toISOString() }, review);
  }

  function continuePractice() {
    const currentIndex = eligible.findIndex(item => item.id === card.id);
    const nextDue = dueCards.find(item => item.id !== card.id);
    const next = nextDue ?? eligible[(currentIndex + 1) % eligible.length];
    setCardId(next.id);
    setAnswer("");
    setFeedback(null);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  const schedule = reviewMap.get(card.id);
  const promptLabel = card.group === "Vocabulary" ? "What does this word mean?" : "Type this sound in romaji";
  return <section className="japanese-lab" aria-labelledby="japanese-lab-title">
    <header className="jp-lab-heading">
      <div><span className="eyebrow"><Languages size={14} /> JAPANESE DRILL</span><h2 id="japanese-lab-title">See it. Hear it. Recall it.</h2><p>Begin with the vowel kana, then mix in a small set of useful words.</p></div>
      <div className="jp-today-count"><strong>{todayAttempts.length}</strong><span>attempts today<br />{todayAttempts.length ? `${Math.round(correctToday / todayAttempts.length * 100)}% correct` : "start gently"}</span></div>
    </header>

    <div className="jp-mode-bar" role="group" aria-label="Japanese practice mode">
      {(["Daily queue", "Kana", "Vocabulary"] as Mode[]).map(item => <button key={item} className={mode === item ? "active" : ""} onClick={() => setMode(item)}>{item}</button>)}
      <span><Clock3 size={13} /> {dueCards.length} due now</span>
    </div>

    <div className="jp-practice-grid">
      <section className="jp-prompt-panel">
        <div className="jp-card-meta"><span>{card.group}</span><span>{schedule ? `Streak ${schedule.streak}` : "New card"}</span></div>
        <div className="jp-character" lang="ja">{card.prompt}</div>
        <button className="jp-listen" disabled={!audioReady} onClick={speak}><Volume2 size={18} /> {audioReady ? "Play sound" : "Audio unavailable"}</button>
        <p><Headphones size={14} /> Uses the Japanese voice installed in your browser or device.</p>
      </section>

      <section className="jp-answer-panel">
        <span className="eyebrow"><Keyboard size={14} /> RECALL CHECK</span>
        <h3>{promptLabel}</h3>
        <p className="jp-hint">Hint: {card.hint}</p>
        <label><span>Your answer</span><input ref={inputRef} value={answer} disabled={!!feedback} autoComplete="off" spellCheck={false} placeholder={card.group === "Vocabulary" ? "English or Indonesian" : "romaji"} onChange={event => setAnswer(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); if (feedback) continuePractice(); else submit(); } }} /></label>
        {!feedback ? <button className="primary-btn jp-check" disabled={!answer.trim()} onClick={submit}>Check answer <Check size={16} /></button> : <div className={`jp-feedback ${feedback.correct ? "correct" : "incorrect"}`} aria-live="polite"><div className="jp-feedback-title"><span>{feedback.correct ? <Check size={17} /> : <X size={17} />}</span><div><small>{feedback.correct ? "CORRECT" : "TRY IT AGAIN LATER"}</small><strong>{feedback.correct ? `${card.prompt} is ${card.reading}.` : `The answer is ${card.group === "Vocabulary" ? `${card.meaning} (${card.reading})` : card.reading}.`}</strong></div></div><p>You entered “{feedback.submitted}”. Accepted: {card.accepted.join(" / ")}.</p><div className="jp-feedback-actions"><button className="text-btn" onClick={() => { setAnswer(""); setFeedback(null); inputRef.current?.focus(); }}><RotateCcw size={14} /> Retry this card</button><button ref={nextRef} className="primary-btn" onClick={continuePractice}>Next card</button></div></div>}
        <span className="jp-key-note">Press Enter to check or continue.</span>
      </section>
    </div>

    <div className="jp-review-strip">
      <div><BookOpen size={17} /><span><strong>Spaced review</strong> Correct cards return after 1, 3, 7, 14, then 30 days. Missed cards return in 10 minutes.</span></div>
      <p>{reviews.length} cards scheduled · {attempts.length} saved attempts. Practice history is evidence, not a mastery claim.</p>
    </div>
  </section>;
}
