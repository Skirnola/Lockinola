"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronRight, Circle, Clock3, Code2, History, LoaderCircle, Play, RotateCcw, ShieldCheck, Terminal, X } from "lucide-react";
import { createRecordId, type CodeRun } from "@/lib/learning-data";

type Exercise = { id: string; title: string; level: string; filename: string; brief: string; requirement: string; example: string; starter: string };

const exercises: Exercise[] = [
  { id: "intro-function", title: "Introduction function", level: "01 · Variables", filename: "intro.py", brief: "Return one sentence that introduces a learner and their graduation year.", requirement: "Define make_intro(name, graduation_year). Return the exact sentence; do not print it.", example: 'make_intro("Iqbal", 2027) → "Hi, Iqbal! I graduate in 2027."', starter: `def make_intro(name, graduation_year):\n    # Build and return the sentence here.\n    return ""` },
  { id: "grade-classifier", title: "Grade classifier", level: "02 · Conditions", filename: "grades.py", brief: "Turn a score from 0–100 into A, B, C, D, or F and reject values outside the range.", requirement: "Define classify_score(score). Return \"Invalid score\" outside 0–100.", example: "classify_score(90) → \"A\" · classify_score(-1) → \"Invalid score\"", starter: `def classify_score(score):\n    # Check invalid values first, then each grade boundary.\n    return ""` },
  { id: "count-even", title: "Count even numbers", level: "03 · Loops", filename: "even_numbers.py", brief: "Loop through a list and count how many values are evenly divisible by two.", requirement: "Define count_even(numbers). Return a number, including 0 for an empty list.", example: "count_even([1, 2, 3, 4]) → 2", starter: `def count_even(numbers):\n    count = 0\n    # Update count inside a loop.\n    return count` },
];

type RunnerReply = { status: CodeRun["status"]; message: string; tests?: Array<{ name: string; passed: boolean; expected: string; actual: string }>; passedTests?: number; totalTests?: number; output?: string };

export function CodingWorkspace({ runs, onRecord }: { runs: CodeRun[]; onRecord: (run: CodeRun) => void }) {
  const [exerciseId, setExerciseId] = useState(exercises[0].id);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Object.fromEntries(exercises.map(item => [item.id, item.starter])));
  const [result, setResult] = useState<RunnerReply | null>(null);
  const [running, setRunning] = useState(false);
  const exercise = exercises.find(item => item.id === exerciseId) ?? exercises[0];
  const code = drafts[exercise.id];
  const recent = useMemo(() => runs.filter(run => run.exerciseId === exercise.id).slice(-6).reverse(), [runs, exercise.id]);

  function chooseExercise(id: string) { setExerciseId(id); setResult(null); }

  async function runCode() {
    if (!code.trim() || running) return;
    setRunning(true);
    setResult(null);
    try {
      const response = await fetch("/api/python/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exerciseId: exercise.id, code }) });
      const reply = await response.json() as RunnerReply;
      if (!reply.status || !reply.message) throw new Error("The runner returned an incomplete result.");
      setResult(reply);
      onRecord({ id: createRecordId("code"), exerciseId: exercise.id, exerciseTitle: exercise.title, code, status: reply.status, message: reply.message, passedTests: reply.passedTests ?? 0, totalTests: reply.totalTests ?? reply.tests?.length ?? 0, output: reply.output ?? "", createdAt: new Date().toISOString() });
    } catch (error) {
      setResult({ status: "error", message: error instanceof Error ? error.message : "The runner could not be reached." });
    } finally { setRunning(false); }
  }

  const resultIcon = result?.status === "passed" ? <Check size={18} /> : result?.status === "blocked" ? <ShieldCheck size={18} /> : <X size={18} />;
  return <section className="coding-lab" aria-labelledby="coding-lab-title">
    <div className="lab-heading"><div><span className="eyebrow"><Terminal size={15} /> PYTHON CHECKER</span><h2 id="coding-lab-title">Write it. Run it. Read the mismatch.</h2><p>Start with a function, run real checks, then change one thing at a time.</p></div><span className="local-runner"><ShieldCheck size={14} /> Separate local process</span></div>
    <div className="lab-shell"><aside className="exercise-rail" aria-label="Python exercises"><span className="rail-label">EXERCISES</span>{exercises.map((item, index) => <button key={item.id} className={item.id === exercise.id ? "active" : ""} onClick={() => chooseExercise(item.id)}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{item.level}</small><strong>{item.title}</strong></div><ChevronRight size={15} /></button>)}</aside>
      <div className="lab-workbench"><section className="exercise-brief"><div><span className="eyebrow">CURRENT ASSIGNMENT</span><h3>{exercise.title}</h3><p>{exercise.brief}</p></div><dl><div><dt>Requirement</dt><dd>{exercise.requirement}</dd></div><div><dt>Example</dt><dd><code>{exercise.example}</code></dd></div></dl></section>
        <section className="code-editor"><div className="editor-bar"><span><Code2 size={14} /> {exercise.filename}</span><span>Python 3 · Ctrl + Enter to run</span></div><label><span className="sr-only">Python code</span><textarea spellCheck={false} value={code} maxLength={8000} onChange={event => setDrafts(previous => ({ ...previous, [exercise.id]: event.target.value }))} onKeyDown={event => { if (event.ctrlKey && event.key === "Enter") { event.preventDefault(); void runCode(); } }} /></label><div className="editor-actions"><span>{code.length} / 8000 characters</span><button className="text-btn" onClick={() => { setDrafts(previous => ({ ...previous, [exercise.id]: exercise.starter })); setResult(null); }}><RotateCcw size={14} /> Reset</button><button className="primary-btn" disabled={running || !code.trim()} onClick={() => void runCode()}>{running ? <LoaderCircle className="spin" size={16} /> : <Play size={15} fill="currentColor" />}{running ? "Running checks…" : "Run checks"}</button></div></section>
        <section className={`run-result ${result ? result.status : "waiting"}`} aria-live="polite">{!result ? <div className="result-empty"><Circle size={14} /><span>Run the starter when you are ready. The checks stay hidden until then.</span></div> : <><div className="result-summary"><span className="result-mark">{resultIcon}</span><div><span>{result.status === "passed" ? "CHECKS PASSED" : result.status === "blocked" ? "RUN BLOCKED" : result.status === "error" ? "RUNNER STOPPED" : "KEEP WORKING"}</span><strong>{result.message}</strong></div>{typeof result.totalTests === "number" && result.totalTests > 0 && <b>{result.passedTests ?? 0}/{result.totalTests}</b>}</div>{result.tests && result.tests.length > 0 && <ol className="test-list">{result.tests.map(test => <li key={test.name} className={test.passed ? "pass" : "fail"}><span>{test.passed ? <Check size={14} /> : <X size={14} />}</span><div><strong>{test.name}</strong>{!test.passed && <small>Expected {test.expected} · got {test.actual}</small>}</div></li>)}</ol>}{result.output && <pre className="program-output"><span>PRINTED OUTPUT</span>{result.output}</pre>}</>}</section>
      </div></div>
    <section className="run-history"><div className="history-heading"><span><History size={15} /> RECENT ATTEMPTS · THIS EXERCISE</span><small>{recent.length ? `${recent.length} saved locally` : "No runs yet"}</small></div>{recent.length ? <div className="history-list">{recent.map(run => <button key={run.id} onClick={() => { setDrafts(previous => ({ ...previous, [exercise.id]: run.code })); setResult(null); }}><span className={`history-status ${run.status}`}>{run.status === "passed" ? <Check size={13} /> : run.status === "blocked" ? <ShieldCheck size={13} /> : <AlertTriangle size={13} />}</span><div><strong>{run.message}</strong><small><Clock3 size={11} /> {new Date(run.createdAt).toLocaleString()} · {run.passedTests}/{run.totalTests} checks</small></div><span>Load code</span></button>)}</div> : <p className="history-empty">Every run will be saved here so retries stay visible. Passing once records success, not mastery.</p>}</section>
    <p className="runner-boundary">Local learning runner: imports, files, input(), top-level execution, and double-underscore access are blocked. Runs stop after 3 seconds. This process boundary is designed for these exercises, not untrusted public code.</p>
  </section>;
}
