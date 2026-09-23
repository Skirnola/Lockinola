"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronRight, Circle, Cloud, FileCheck2, LoaderCircle, LockKeyhole, Play, RefreshCw, ShieldCheck, Terminal } from "lucide-react";
import type { CloudLabRecord, CloudToolCheck } from "@/lib/learning-data";

type Lab = {
  id: string;
  step: string;
  title: string;
  kind: "local_check" | "evidence";
  summary: string;
  task: string;
  evidencePrompt: string;
  safeCommands?: string[];
};

const labs: Lab[] = [
  { id: "tool-inventory", step: "01 · Setup", title: "Read-only tool inventory", kind: "local_check", summary: "See which local tools are available before following a lab that needs them.", task: "Run the readiness check. It only asks installed command-line tools for their version or presence.", evidencePrompt: "The site records the tool results automatically." },
  { id: "terminal-navigation", step: "02 · Linux", title: "Terminal navigation trail", kind: "evidence", summary: "Move through a disposable folder and explain where you are after each command.", task: "Create a lockinola-lab folder, enter it, make notes and output folders, then return to its parent. Do not use an important folder.", evidencePrompt: "Paste the commands you ran and one sentence explaining the final location.", safeCommands: ["pwd", "mkdir lockinola-lab", "cd lockinola-lab", "mkdir notes output", "ls", "cd .."] },
  { id: "files-permissions", step: "03 · Linux", title: "Files and safe permissions", kind: "evidence", summary: "Create, read, copy, and inspect a file without administrator privileges.", task: "Work only inside lockinola-lab. Create hello.txt, copy it, inspect permissions, and explain what the read/write flags mean. Do not use sudo.", evidencePrompt: "Paste the relevant output and your plain-language permission explanation.", safeCommands: ["printf 'hello cloud' > hello.txt", "cp hello.txt hello-copy.txt", "ls -l"] },
  { id: "network-request", step: "04 · Network", title: "Map one web request", kind: "evidence", summary: "Connect DNS, IP addresses, ports, requests, and responses without vendor jargon.", task: "Choose one public website and draw or describe the path from your browser to its server. Do not include cookies, tokens, or private headers.", evidencePrompt: "Submit your diagram as text: client → DNS → IP:port → request → response." },
  { id: "floci-health", step: "05 · Local cloud", title: "Floci health check", kind: "evidence", summary: "Start the local emulator and identify its local endpoint before creating anything.", task: "Follow your installed Floci quick start. Run its health or doctor check and confirm that the endpoint is local. Use only documented test credentials.", evidencePrompt: "Paste the health result and local endpoint. Remove any real credentials first." },
  { id: "local-s3", step: "06 · Local cloud", title: "Local S3 round trip", kind: "evidence", summary: "Create, list, upload, retrieve, and remove a bucket against Floci only.", task: "Point the AWS CLI at the local Floci endpoint. Use a disposable bucket and text file, verify the download, then clean up both objects and the bucket.", evidencePrompt: "Paste the commands and non-secret output, including cleanup. Explain which steps could cost money on real AWS." },
];

const statusLabels = {
  in_progress: "In progress",
  evidence_submitted: "Evidence submitted",
  locally_verified: "Locally verified",
} as const;

export function CloudWorkspace({ records, toolChecks, onSaveRecord, onSaveChecks }: {
  records: CloudLabRecord[];
  toolChecks: CloudToolCheck[];
  onSaveRecord: (record: CloudLabRecord) => void;
  onSaveChecks: (checks: CloudToolCheck[]) => void;
}) {
  const [labId, setLabId] = useState(labs[0].id);
  const [draft, setDraft] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState("");
  const recordMap = useMemo(() => new Map(records.map(item => [item.labId, item])), [records]);
  const lab = labs.find(item => item.id === labId) ?? labs[0];
  const record = recordMap.get(lab.id);
  const completedCount = records.filter(item => item.status === "evidence_submitted" || item.status === "locally_verified").length;
  const availableTools = toolChecks.filter(item => item.status === "available").length;
  const latestCheck = toolChecks[0]?.checkedAt;
  const isRecorded = (id: string) => ["evidence_submitted", "locally_verified"].includes(recordMap.get(id)?.status ?? "");
  const linuxReady = isRecorded("terminal-navigation") && isRecorded("files-permissions");
  const networkReady = isRecorded("network-request");
  const localCloudReady = isRecorded("floci-health") && isRecorded("local-s3");

  function chooseLab(id: string) {
    setLabId(id);
    setDraft(recordMap.get(id)?.evidence ?? "");
    setCheckError("");
  }

  function startLab() {
    onSaveRecord({ labId: lab.id, status: "in_progress", evidence: record?.evidence ?? "", updatedAt: new Date().toISOString() });
  }

  function submitEvidence() {
    const evidence = draft.trim();
    if (evidence.length < 20) return;
    onSaveRecord({ labId: lab.id, status: "evidence_submitted", evidence: evidence.slice(0, 4_000), updatedAt: new Date().toISOString() });
  }

  async function runReadiness() {
    if (checking) return;
    setChecking(true);
    setCheckError("");
    try {
      const response = await fetch("/api/cloud/readiness", { cache: "no-store" });
      const result = await response.json() as { status?: string; checks?: CloudToolCheck[]; message?: string };
      if (!response.ok || !Array.isArray(result.checks)) throw new Error(result.message || "The readiness check did not return results.");
      onSaveChecks(result.checks);
      const pythonReady = result.checks.some(item => item.tool === "python" && item.status === "available");
      if (pythonReady) onSaveRecord({ labId: lab.id, status: "locally_verified", evidence: "Read-only local tool inventory completed.", updatedAt: new Date().toISOString() });
    } catch (error) {
      setCheckError(error instanceof Error ? error.message : "The readiness check could not run.");
    } finally {
      setChecking(false);
    }
  }

  return <section className="cloud-lab" aria-labelledby="cloud-lab-title">
    <header className="cloud-lab-heading"><div><span className="eyebrow"><Cloud size={15} /> STAGE 8 · LOCAL CLOUD LABS</span><h2 id="cloud-lab-title">Prove the foundation first.</h2><p>Practise locally, save evidence, and understand cleanup before touching a billable provider.</p></div><div className="cloud-stage-count"><strong>{completedCount}/6</strong><span>lab records<br />saved locally</span></div></header>

    <div className="cloud-lab-shell">
      <aside className="cloud-lab-rail" aria-label="Cloud and DevOps labs"><span className="rail-label">GUIDED LABS</span>{labs.map(item => { const state = recordMap.get(item.id)?.status; return <button key={item.id} className={item.id === lab.id ? "active" : ""} onClick={() => chooseLab(item.id)}><span className={`cloud-status-dot ${state ?? "not_started"}`}>{state === "locally_verified" || state === "evidence_submitted" ? <Check size={12} /> : state === "in_progress" ? <Play size={11} /> : <Circle size={10} />}</span><div><small>{item.step}</small><strong>{item.title}</strong></div><ChevronRight size={15} /></button>; })}</aside>

      <div className="cloud-lab-main">
        <section className="cloud-assignment"><div className="cloud-assignment-top"><div><span className="eyebrow">CURRENT LAB</span><h3>{lab.title}</h3><p>{lab.summary}</p></div><span className={`cloud-state ${record?.status ?? "not_started"}`}>{record ? statusLabels[record.status] : "Not started"}</span></div><div className="cloud-task"><strong>Task</strong><p>{lab.task}</p></div>{lab.safeCommands && <div className="command-sheet"><span>SAFE PRACTICE SEQUENCE</span>{lab.safeCommands.map(command => <code key={command}>{command}</code>)}</div>}</section>

        {lab.kind === "local_check" ? <section className="tool-readiness"><div className="tool-readiness-heading"><div><span className="eyebrow"><ShieldCheck size={14} /> READ-ONLY CHECK</span><h3>Local tool readiness</h3><p>No login, cloud request, resource creation, or configuration change.</p></div><button className="primary-btn" disabled={checking} onClick={() => void runReadiness()}>{checking ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}{checking ? "Checking…" : toolChecks.length ? "Check again" : "Run checks"}</button></div>{checkError && <p className="cloud-check-error"><AlertTriangle size={15} /> {checkError}</p>}{toolChecks.length ? <div className="tool-grid">{toolChecks.map(item => <div key={item.tool} className={`tool-result ${item.status}`}><span>{item.status === "available" ? <Check size={14} /> : item.status === "missing" ? <Circle size={12} /> : <AlertTriangle size={14} />}</span><div><strong>{item.label}</strong><p>{item.detail}</p></div></div>)}</div> : <div className="tool-empty"><Terminal size={22} /><p>Run the check to inspect Python, Git, WSL, Docker, AWS CLI, and Floci CLI.</p></div>}<p className="check-timestamp">{latestCheck ? `Last checked ${new Date(latestCheck).toLocaleString()}` : "No check saved yet."}</p></section> : <section className="cloud-evidence"><span className="eyebrow"><FileCheck2 size={14} /> EVIDENCE NOTE</span><h3>Show what you actually did</h3><p>{lab.evidencePrompt}</p><label><span>Commands, output, and explanation</span><textarea value={draft} maxLength={4_000} placeholder="Keep this specific and remove passwords, tokens, account IDs, and real credentials." onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.ctrlKey && event.key === "Enter") { event.preventDefault(); submitEvidence(); } }} /></label><div className="cloud-evidence-actions"><span>{draft.length} / 4000 · Ctrl + Enter to save</span>{!record && <button className="secondary-btn" onClick={startLab}><Play size={15} /> Start lab</button>}<button className="primary-btn" disabled={draft.trim().length < 20} onClick={submitEvidence}><FileCheck2 size={15} /> {record?.status === "evidence_submitted" ? "Update evidence" : "Submit evidence"}</button></div>{record?.status === "evidence_submitted" && <p className="evidence-boundary"><Check size={14} /> Saved as submitted evidence. The app has not independently verified the commands or cloud state.</p>}</section>}
      </div>
    </div>

    <section className="cloud-readiness-gate"><div className="gate-lock"><LockKeyhole size={22} /><div><span>REAL CLOUD GATE</span><strong>{completedCount === labs.length ? "Foundations recorded; review account safety next." : "AWS, GCP, and Azure stay later."}</strong></div></div><div className="gate-milestones"><span className={linuxReady ? "done" : ""}><b>01</b> Linux evidence</span><span className={networkReady ? "done" : ""}><b>02</b> Network explanation</span><span className={localCloudReady ? "done" : ""}><b>03</b> Local cloud + cleanup</span><span><b>04</b> Budget, IAM, alerts</span></div><p>{availableTools} local tools detected. Tool availability and submitted notes do not prove production readiness or certification.</p></section>
  </section>;
}
