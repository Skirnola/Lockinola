"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { ArrowRight, BookOpen, Check, ChevronRight, Clock3, Cloud, Code2, Download, ExternalLink, Flag, HardDrive, LayoutGrid, Pause, Play, RotateCcw, Settings, Target, Timer, CalendarDays, Upload, X } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { LearningPath, ScheduleView, ProgressView, type Lesson } from "@/components/learning-views";
import { ReviewConsole } from "@/components/review-console";
import { CodingWorkspace } from "@/components/coding-workspace";
import { JapaneseWorkspace } from "@/components/japanese-workspace";
import { CloudWorkspace } from "@/components/cloud-workspace";
import { AccessGate, ReleasePanel, type ClientAccessStatus } from "@/components/access-control";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createRecordId, defaultLearningData, loadLearningData, parseLearningData, saveLearningData, serializeLearningData, type CloudLabRecord, type CloudToolCheck, type CodeRun, type JapaneseAttempt, type JapaneseReview, type LearningData, type PlannedSession, type TrackName } from "@/lib/learning-data";
import { calculateProgress } from "@/lib/progress";
import { loadCloudLearningData, saveCloudLearningData } from "@/lib/cloud-sync";

type View = "Today" | "Coding" | "Cloud & DevOps" | "Japanese" | "Schedule" | "Progress";
const navigation = [{ name: "Today", icon: LayoutGrid }, { name: "Coding", icon: Code2 }, { name: "Cloud & DevOps", icon: Cloud }, { name: "Japanese", icon: BookOpen }, { name: "Schedule", icon: CalendarDays }, { name: "Progress", icon: Target }] as const;
const tracks = [
  { name: "Coding", color: "coding", icon: Code2, title: "Python first", topic: "Week 1 · functions & variables", lesson: "CS50P: functions and variables", time: "45 min", kind: "Course lesson", detail: "Watch the Functions and Variables lecture in chunks. Stop after variables, print, input, numbers, and strings. Type each example yourself.", sourceName: "CS50P · Week 0", sourceUrl: "https://cs50.harvard.edu/python/weeks/0/" },
  { name: "Cloud & DevOps", color: "cloud", icon: Cloud, title: "Start with Linux", topic: "Week 1 · terminal navigation", lesson: "Ubuntu command line: first steps", time: "45 min", kind: "Official tutorial", detail: "Complete the beginner sections for opening a terminal, pwd, cd, ls, mkdir, and file paths inside a disposable practice folder.", sourceName: "Ubuntu · Command line for beginners", sourceUrl: "https://ubuntu.com/tutorials/command-line-for-beginners" },
  { name: "Japanese", color: "japanese", icon: BookOpen, title: "Japanese from zero", topic: "Week 1 · hiragana vowels", lesson: "Hiragana vowels: あいうえお", time: "20 min daily", kind: "Kana lesson", detail: "Use HIRAGANA/KATAKANA Memory Hint. Learn the five vowels, say each sound, trace it, then recognise it without romaji.", sourceName: "Japan Foundation · Memory Hint", sourceUrl: "https://marugoto.jpf.go.jp/en/e-learning/" },
] as const;

function Navigation({ view, navigate, data, openSettings }: { view: View; navigate: (v: View) => void; data: LearningData; openSettings: () => void }) {
  const { setOpenMobile } = useSidebar();
  const initials = data.profile.displayName.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
  const target = new Date(`${data.profile.graduationTarget}-02T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase();
  return <Sidebar className="study-sidebar" collapsible="icon"><SidebarHeader className="brand-area"><div className="brand-row"><a className="brand" href="#today" onClick={() => navigate("Today")}><Image className="brand-mark" src="/lockinola-mark.svg" alt="" width={32} height={32} priority /><span className="brand-name">lockinola</span></a><SidebarTrigger className="sidebar-nav-toggle" /></div></SidebarHeader><SidebarContent><div className="nav-label">WORKSPACE</div><SidebarMenu>{navigation.map(({ name, icon: Icon }, index) => <SidebarMenuItem key={name} className={index === 4 ? "nav-divider" : ""}><SidebarMenuButton tooltip={name} isActive={view === name} onClick={() => { navigate(name); setOpenMobile(false); }} className="nav-link"><Icon size={18} /><span>{name}</span>{name === "Japanese" && view !== name && <span className="daily-dot" />}{view === name && <span className="active-dot" />}</SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu><div className="chapter-card"><span className="eyebrow"><Flag size={14} /> TARGET</span><strong>{target}</strong><p>Graduate with a strong technical foundation and usable Japanese.</p><div className="chapter-line"><span /></div><span className="subtle">Private workspace</span></div></SidebarContent><SidebarFooter><button className="profile profile-button" onClick={openSettings}><span className="avatar">{initials || "IQ"}</span><div><strong>{data.profile.displayName}</strong><span>Profile & backup</span></div><Settings size={15} /><span className="profile-dot" /></button></SidebarFooter></Sidebar>;
}

export default function Home() {
  const [view, setView] = useState<View>("Today");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [data, setData] = useState<LearningData>(defaultLearningData);
  const [hydrated, setHydrated] = useState(false);
  const [todayLabel, setTodayLabel] = useState("TODAY");
  const [duration, setDuration] = useState("25");
  const [seconds, setSeconds] = useState(1500);
  const [running, setRunning] = useState(false);
  const sessionRecorded = useRef(false);
  const timerEndsAt = useRef<number | null>(null);
  const [notice, setNotice] = useState("");
  const [accessStatus, setAccessStatus] = useState<ClientAccessStatus | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessNonce, setAccessNonce] = useState(0);
  const [syncState, setSyncState] = useState<"local" | "syncing" | "saved" | "offline">("local");
  const cloudReady = useRef(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/access", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("Access status unavailable");
      return response.json() as Promise<ClientAccessStatus>;
    }).then(status => { if (!cancelled) { setAccessStatus(status); setAccessChecked(true); } }).catch(() => {
      if (!cancelled) { setAccessStatus({ mode: "unavailable", authenticated: false, accessConfigured: false, readyForPrivateRelease: false, reviewConfigured: false, reviewDailyLimit: 20, runnerIsLoopback: false }); setAccessChecked(true); }
    });
    return () => { cancelled = true; };
  }, [accessNonce]);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        let loaded = loadLearningData();
        const active = loaded.activeTimer;
        if (active) {
          setDuration(String(active.durationMinutes));
          if (active.isRunning && active.endsAt) {
            const end = new Date(active.endsAt).getTime();
            const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
            if (remaining > 0) {
              timerEndsAt.current = end;
              setSeconds(remaining);
              setRunning(true);
            } else {
              loaded = { ...loaded, activeTimer: null, focusSessions: [...loaded.focusSessions, { id: createRecordId("focus"), durationMinutes: active.durationMinutes, completedAt: active.endsAt }] };
              setSeconds(active.durationMinutes * 60);
              setNotice("Your focus session finished while the page was closed and has been saved.");
            }
          } else {
            setSeconds(active.remainingSeconds);
          }
        } else {
          setDuration(String(loaded.profile.technicalSessionMinutes));
          setSeconds(loaded.profile.technicalSessionMinutes * 60);
        }
        setData(loaded);
      }
      catch { setNotice("The saved data could not be read, so Lockinola opened with safe defaults."); }
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    const timeout = window.setTimeout(() => setTodayLabel(new Intl.DateTimeFormat("en-US", { timeZone: data.profile.timezone, weekday: "long", day: "numeric", month: "long" }).format(new Date()).toUpperCase()), 0);
    return () => window.clearTimeout(timeout);
  }, [data.profile.timezone]);
  useEffect(() => {
    if (!hydrated) return;
    let timeout: number | undefined;
    try { saveLearningData(data); }
    catch { timeout = window.setTimeout(() => setNotice("Lockinola could not save changes in this browser."), 0); }
    return () => { if (timeout !== undefined) window.clearTimeout(timeout); };
  }, [data, hydrated]);
  useEffect(() => {
    if (!hydrated || accessStatus?.mode !== "hosted" || !accessStatus.authenticated || cloudReady.current) return;
    const controller = new AbortController();
    setSyncState("syncing");
    void loadCloudLearningData(controller.signal)
      .then(async remote => {
        if (remote) setData(remote);
        else await saveCloudLearningData(data, controller.signal);
        cloudReady.current = true;
        setSyncState("saved");
      })
      .catch(() => { if (!controller.signal.aborted) setSyncState("offline"); });
    return () => controller.abort();
  }, [accessStatus?.authenticated, accessStatus?.mode, data, hydrated]);
  useEffect(() => {
    if (!hydrated || accessStatus?.mode !== "hosted" || !accessStatus.authenticated || !cloudReady.current) return;
    setSyncState("syncing");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void saveCloudLearningData(data, controller.signal)
        .then(() => setSyncState("saved"))
        .catch(() => { if (!controller.signal.aborted) setSyncState("offline"); });
    }, 900);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [accessStatus?.authenticated, accessStatus?.mode, data, hydrated]);
  useEffect(() => {
    if (!running) return;
    const deadline = timerEndsAt.current ?? Date.now() + seconds * 1000;
    timerEndsAt.current = deadline;
    const interval = setInterval(() => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(next);
      if (next === 0) {
        if (sessionRecorded.current) return;
        sessionRecorded.current = true;
        setRunning(false);
        timerEndsAt.current = null;
        setData(previous => ({ ...previous, activeTimer: null, focusSessions: [...previous.focusSessions, { id: createRecordId("focus"), durationMinutes: Number(duration), completedAt: new Date().toISOString() }] }));
        setNotice("Focus session finished and saved locally.");
      }
    }, 250);
    return () => clearInterval(interval);
    // Capture remaining time when the timer resumes, not on each tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(""), 6500); return () => clearTimeout(id); }, [notice]);
  function navigate(next: View) { setView(next); window.scrollTo({ top: 0, behavior: "instant" }); }
  function openTrack(name: string) { const track = tracks.find(t => t.name === name)!; setLesson({ title: track.lesson, kind: track.kind, detail: track.detail, track: track.name, time: track.time, sourceName: track.sourceName, sourceUrl: track.sourceUrl }); }
  const completed = Array.from(new Set(data.attempts.map(attempt => attempt.taskTitle)));
  const focusMinutes = data.focusSessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const progressSnapshot = useMemo(() => calculateProgress(data), [data]);
  const activeTrack = tracks.find(track => track.name === view)?.name;
  const markerLevel = activeTrack ? progressSnapshot.tracks[activeTrack].level : Math.max(1, Math.floor(Object.values(progressSnapshot.tracks).reduce((sum, track) => sum + track.level, 0) / 3));
  function updateProfile(field: keyof LearningData["profile"], value: string | number) {
    setData(previous => ({ ...previous, profile: { ...previous.profile, [field]: value } }));
  }
  function chooseDuration(value: string) {
    const minutes = Number(value);
    setRunning(false);
    sessionRecorded.current = false;
    timerEndsAt.current = null;
    setDuration(value);
    setSeconds(minutes * 60);
    setData(previous => ({ ...previous, activeTimer: null }));
  }
  function toggleTimer() {
    if (running) {
      setRunning(false);
      timerEndsAt.current = null;
      setData(previous => ({ ...previous, activeTimer: { durationMinutes: Number(duration), remainingSeconds: seconds, isRunning: false, endsAt: null, startedAt: previous.activeTimer?.startedAt ?? new Date().toISOString() } }));
      return;
    }
    const remaining = seconds === 0 ? Number(duration) * 60 : seconds;
    const end = Date.now() + remaining * 1000;
    if (seconds === 0 || seconds === Number(duration) * 60) sessionRecorded.current = false;
    timerEndsAt.current = end;
    setSeconds(remaining);
    setRunning(true);
    setData(previous => ({ ...previous, activeTimer: { durationMinutes: Number(duration), remainingSeconds: remaining, isRunning: true, endsAt: new Date(end).toISOString(), startedAt: previous.activeTimer?.startedAt ?? new Date().toISOString() } }));
  }
  function resetTimer() {
    setRunning(false);
    sessionRecorded.current = false;
    timerEndsAt.current = null;
    setSeconds(Number(duration) * 60);
    setData(previous => ({ ...previous, activeTimer: null }));
  }
  function savePlannedSession(session: PlannedSession) {
    setData(previous => ({ ...previous, plannedSessions: previous.plannedSessions.some(item => item.id === session.id) ? previous.plannedSessions.map(item => item.id === session.id ? session : item) : [...previous.plannedSessions, session] }));
    setNotice("Schedule updated and saved locally.");
  }
  function deletePlannedSession(id: string) {
    setData(previous => ({ ...previous, plannedSessions: previous.plannedSessions.filter(item => item.id !== id) }));
    setNotice("Session removed from the weekly plan.");
  }
  function recordCodeRun(run: CodeRun) {
    setData(previous => ({ ...previous, codeRuns: [...previous.codeRuns, run].slice(-300) }));
  }
  function recordJapaneseAttempt(attempt: JapaneseAttempt, review: JapaneseReview) {
    setData(previous => ({
      ...previous,
      japaneseAttempts: [...previous.japaneseAttempts, attempt].slice(-1000),
      japaneseReviews: [...previous.japaneseReviews.filter(item => item.cardId !== review.cardId), review].slice(-200),
    }));
  }
  function saveCloudLab(record: CloudLabRecord) {
    setData(previous => ({ ...previous, cloudLabs: [...previous.cloudLabs.filter(item => item.labId !== record.labId), record].slice(-100) }));
  }
  function saveCloudChecks(checks: CloudToolCheck[]) {
    setData(previous => ({ ...previous, cloudToolChecks: checks.slice(0, 20) }));
  }
  function downloadBackup() {
    const blob = new Blob([serializeLearningData(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `lockinola-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Backup downloaded.");
  }
  async function restoreBackup(file: File) {
    try {
      const restored = parseLearningData(JSON.parse(await file.text()));
      setData(restored);
      setNotice(`Backup restored: ${restored.attempts.length} attempts and ${restored.focusSessions.length} focus sessions.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "That backup could not be restored.");
    }
  }
  async function lockWorkspace() {
    await fetch("/api/access", { method: "DELETE" });
    setSettingsOpen(false);
    setAccessChecked(false);
    setAccessNonce(value => value + 1);
  }
  function refreshAccess() {
    setAccessChecked(false);
    setAccessNonce(value => value + 1);
  }
  if (!accessChecked || !accessStatus?.authenticated) {
    return <AccessGate status={accessStatus} checking={!accessChecked} onAuthenticated={refreshAccess} onRetry={refreshAccess} />;
  }
  const syncLabel = syncState === "saved" ? "SAVED TO CLOUD" : syncState === "syncing" ? "SYNCING" : syncState === "offline" ? "CLOUD OFFLINE" : "SAVED LOCALLY";
  const timer = <section className="focus-card"><div className="section-kicker"><span><Timer size={16} /> FOCUS TIMER</span><span className={running ? "live-indicator running" : "live-indicator"}>{running ? "Running" : data.activeTimer ? "Paused · saved" : "Ready"}</span></div><div className="timer-readout" role="timer" aria-label={`${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds remaining`}>{String(Math.floor(seconds / 60)).padStart(2, "0")}<span>:</span>{String(seconds % 60).padStart(2, "0")}</div><p className="timer-caption">Stay with one task until the timer ends.</p><Tabs value={duration} onValueChange={chooseDuration}><TabsList className="duration-tabs">{["25", "50", "90"].map(v => <TabsTrigger key={v} value={v}>{v} min</TabsTrigger>)}</TabsList></Tabs><div className="timer-actions"><button className="primary-btn timer-start" onClick={toggleTimer}>{running ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}{running ? "Pause" : seconds < Number(duration) * 60 && seconds > 0 ? "Resume" : "Start session"}</button><button className="icon-btn" aria-label="Reset focus timer" onClick={resetTimer}><RotateCcw size={17} /></button></div><span className="timer-note">Active timer recovers after reload</span></section>;
  return <SidebarProvider style={{ "--sidebar-width": "216px", "--sidebar-width-icon": "64px" } as CSSProperties}><Navigation view={view} navigate={navigate} data={data} openSettings={() => setSettingsOpen(true)} /><main className="workspace"><header className="topbar"><div className="breadcrumb"><SidebarTrigger className="mobile-trigger" /><span>Lockinola</span><ChevronRight size={14} /><strong>{view}</strong></div><span className="prototype-badge"><span /> {syncLabel}</span></header><div className="page-content" key={view}><div className="page-heading"><div><span className="eyebrow">{view === "Today" ? todayLabel : "LEARNING WORKSPACE"}</span><h1>{view === "Today" ? <>Today&apos;s <em>plan</em></> : view}</h1><p>{view === "Today" ? `Two focused tasks for ${data.profile.displayName}. Start with Python, then complete your daily Japanese.` : "Follow the first-month route, open the reviewed source, and complete the assignment."}</p></div><div className="day-marker"><span>{String(markerLevel).padStart(2, "0")}</span><div>{activeTrack ? "TRACK LEVEL" : "AVERAGE LEVEL"}<br /><strong>{activeTrack ? `${progressSnapshot.tracks[activeTrack].xp} XP` : `${progressSnapshot.totalXp} total XP`}</strong></div></div></div>
  {view === "Today" ? <><div className="today-grid"><div className="today-main"><section className="next-lesson"><div className="section-kicker"><span><span className="tiny-square" /> UP NEXT</span><span className="lesson-number">PYTHON · 01</span></div><div className="next-lesson-body"><div><span className="small-pill">BEGINNER</span><h2>Variables and<br />expressions</h2><p>Learn how Python stores values, then predict the output of a short program.</p></div><div className="code-note" aria-label="Python sample"><span className="code-file"><Code2 size={13} /> first_steps.py</span><code><span className="code-comment"># a value needs a name</span><br /><span className="code-lime">name</span> = <span className="code-string">&quot;Iqbal&quot;</span><br /><span className="code-lime">day</span> = <span className="code-number">1</span><br /><br /><span className="code-purple">print</span>(<span className="code-string">&quot;Let&apos;s begin.&quot;</span>)</code><span className="code-output"><ChevronRight size={13} /> Let&apos;s begin.<span className="cursor-block" /></span></div></div><div className="lesson-footer"><button className="primary-btn" onClick={() => openTrack("Coding")}>Open lesson <ArrowRight size={17} /></button><span><Clock3 size={14} /> 25 min <i /> Learn + practice</span></div></section><section className="japanese-daily"><div className="kana-stamp" lang="ja">あ</div><div><span className="eyebrow lavender">DAILY JAPANESE</span><h3>Hiragana vowels</h3><p>Learn and recognise あ · い · う · え · お</p></div><button className="round-arrow" aria-label="Open daily Japanese lesson" onClick={() => openTrack("Japanese")}><ArrowRight size={19} /></button></section></div>{timer}</div>
  <section className="track-section"><div className="section-heading"><h2>Learning tracks</h2><span className="subtle">{progressSnapshot.totalXp} XP earned</span></div><div className="track-grid">{tracks.map(track => { const progress = progressSnapshot.tracks[track.name]; return <button key={track.name} className={`track-card ${track.color}`} onClick={() => navigate(track.name)}><div className="track-top"><span className="track-icon"><track.icon size={19} /></span><span className="level-badge">LEVEL {String(progress.level).padStart(2, "0")}</span><ArrowRight size={16} /></div><h3>{track.name}</h3><p>{track.title}</p><div className="track-progress-label"><span>{progress.xp} XP · {track.topic}</span><span>{progress.percentToNext}%</span></div><Progress value={progress.percentToNext} aria-label={`${track.name} level ${progress.level}, ${progress.percentToNext} percent to next level`} /><div className="track-bottom"><span>{progress.levelEnd - progress.xp} XP to level {progress.level + 1}</span><ArrowRight size={15} /></div></button>; })}</div></section>
  <section className="rhythm-section"><div className="section-heading"><h2>Later today</h2><button className="text-btn" onClick={() => navigate("Schedule")}>Full schedule <ArrowRight size={15} /></button></div><div className="rhythm-strip"><div className="rhythm-cell"><span>10:00 <i>—</i> 10:25</span><strong><span className="color-dot green" /> Python variables</strong><small>Learn + practice</small></div><div className="rhythm-cell"><span>14:00 <i>—</i> 14:20</span><strong><span className="color-dot purple" /> Hiragana vowels</strong><small>Video + recall</small></div><div className="rhythm-cell flexible"><CalendarDays size={19} /><div><strong>Gym and campus stay flexible</strong><small>Move study blocks when the day changes.</small></div></div></div></section></> : view === "Schedule" ? <ScheduleView sessions={data.plannedSessions} onSave={savePlannedSession} onDelete={deletePlannedSession} /> : view === "Progress" ? <ProgressView completed={completed} attemptCount={data.attempts.length} focusMinutes={focusMinutes} snapshot={progressSnapshot} /> : view === "Coding" ? <><CodingWorkspace runs={data.codeRuns} onRecord={recordCodeRun} /><LearningPath name="Coding" openLesson={setLesson} completed={completed} progress={progressSnapshot.tracks.Coding} /></> : view === "Cloud & DevOps" ? <><CloudWorkspace records={data.cloudLabs} toolChecks={data.cloudToolChecks} onSaveRecord={saveCloudLab} onSaveChecks={saveCloudChecks} /><LearningPath name="Cloud & DevOps" openLesson={setLesson} completed={completed} progress={progressSnapshot.tracks["Cloud & DevOps"]} /></> : view === "Japanese" ? <><JapaneseWorkspace attempts={data.japaneseAttempts} reviews={data.japaneseReviews} onRecord={recordJapaneseAttempt} /><LearningPath name="Japanese" openLesson={setLesson} completed={completed} progress={progressSnapshot.tracks.Japanese} /></> : null}
  <footer className="page-footer"><span>LOCKINOLA · PRIVATE WORKSPACE</span><span><HardDrive size={12} /> {syncState === "saved" ? "Progress synced across devices" : "Browser copy available"}</span></footer></div></main>
  <Dialog open={!!lesson} onOpenChange={open => { if (!open) setLesson(null); }}><DialogContent className="lesson-dialog"><DialogHeader><span className="eyebrow">{lesson?.track ?? "LEARNING TASK"}{lesson?.week ? ` · WEEK ${lesson.week}` : ""}</span><DialogTitle>{lesson?.title}</DialogTitle><DialogDescription>{lesson?.detail}</DialogDescription></DialogHeader><div className="lesson-preview-content"><div className="lesson-meta"><span className="small-pill">{lesson?.kind}</span>{lesson?.time && <span><Clock3 size={13} /> {lesson.time}</span>}</div>{lesson?.sourceUrl ? <><p className="source-copy">Use the reviewed source for the learning portion, then return here and complete the assignment described above.</p><a className="resource-link" href={lesson.sourceUrl} target="_blank" rel="noreferrer"><span><small>REVIEWED SOURCE</small><strong>{lesson.sourceName}</strong></span><ExternalLink size={17} /></a></> : <p>This task is completed locally. Keep the result in your learning folder so it can become evidence in a later assessment stage.</p>}</div>{lesson && <ReviewConsole key={`${lesson.track}-${lesson.title}`} lesson={lesson} />}<p className="dialog-note">Marking this records an attempt. It does not claim mastery or certification.</p><button className="primary-btn" onClick={() => { if (lesson?.track) setData(previous => ({ ...previous, attempts: [...previous.attempts, { id: createRecordId("attempt"), taskTitle: lesson.title, track: lesson.track as TrackName, kind: lesson.kind, createdAt: new Date().toISOString() }] })); setNotice("Task attempt saved on this device."); setLesson(null); }}><Check size={16} />{lesson && completed.includes(lesson.title) ? "Record another attempt" : "Mark as tried"}</button></DialogContent></Dialog>
  <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}><DialogContent className="settings-dialog"><DialogHeader><span className="eyebrow"><Settings size={14} /> PROFILE & DATA</span><DialogTitle>Your Lockinola setup</DialogTitle><DialogDescription>{syncState === "saved" ? "Preferences and progress are synchronized with your private cloud workspace." : "A browser copy is saved automatically; cloud synchronization resumes when available."}</DialogDescription></DialogHeader><div className="settings-form"><label><span>Your name</span><input value={data.profile.displayName} maxLength={40} onChange={event => updateProfile("displayName", event.target.value)} onBlur={() => { if (!data.profile.displayName.trim()) updateProfile("displayName", "Iqbal"); }} /></label><label><span>Graduation target</span><input type="month" value={data.profile.graduationTarget} min="2026-01" max="2035-12" onChange={event => updateProfile("graduationTarget", event.target.value)} /></label><label><span>Timezone</span><select value={data.profile.timezone} onChange={event => updateProfile("timezone", event.target.value)}><option value="Asia/Jakarta">Jakarta · WIB</option><option value="Asia/Tokyo">Tokyo · JST</option><option value="UTC">UTC</option></select></label><div className="settings-pair"><label><span>Daily Japanese</span><input type="number" min="5" max="180" value={data.profile.dailyJapaneseMinutes} onChange={event => updateProfile("dailyJapaneseMinutes", Number(event.target.value))} /><small>minutes</small></label><label><span>Technical session</span><select value={data.profile.technicalSessionMinutes} onChange={event => { const minutes = Number(event.target.value); updateProfile("technicalSessionMinutes", minutes); chooseDuration(String(minutes)); }}><option value="25">25 minutes</option><option value="50">50 minutes</option><option value="90">90 minutes</option></select></label></div></div><ReleasePanel data={data} status={accessStatus} onLock={() => void lockWorkspace()} /><section className="backup-panel"><div><span className="eyebrow"><HardDrive size={14} /> BACKUP & RECOVERY</span><h3>Keep a copy of your progress</h3><p>{data.attempts.length} lesson attempts · {data.codeRuns.length} code runs · {data.japaneseAttempts.length} Japanese checks · {data.cloudLabs.length} cloud lab records · {data.focusSessions.length} focus sessions · {data.plannedSessions.length} planned sessions</p></div><div className="backup-actions"><button className="secondary-btn" onClick={downloadBackup}><Download size={16} /> Download backup</button><label className="secondary-btn upload-btn"><Upload size={16} /> Restore backup<input type="file" accept="application/json,.json" onChange={event => { const file = event.target.files?.[0]; if (file) void restoreBackup(file); event.target.value = ""; }} /></label></div><p className="backup-note">Restoring replaces the profile, progress, schedule, code, Japanese, and cloud-lab history, and active timer stored in this browser.</p></section></DialogContent></Dialog>
  {notice && <div className="notice" role="status"><Check size={17} /><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice("")}><X size={16} /></button></div>}
  </SidebarProvider>;
}


