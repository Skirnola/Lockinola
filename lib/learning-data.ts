export const STORAGE_KEY = "lockinola.learning-data.v1";

export type TrackName = "Coding" | "Cloud & DevOps" | "Japanese";
export type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
export type SessionKind = "coding" | "cloud" | "japanese" | "campus" | "personal" | "review";

export type ProfilePreferences = {
  displayName: string;
  graduationTarget: string;
  timezone: string;
  dailyJapaneseMinutes: number;
  technicalSessionMinutes: number;
};

export type TaskAttempt = {
  id: string;
  taskTitle: string;
  track: TrackName;
  kind: string;
  createdAt: string;
};

export type FocusSession = {
  id: string;
  durationMinutes: number;
  completedAt: string;
};

export type PlannedSession = {
  id: string;
  day: Weekday;
  time: string;
  durationMinutes: number;
  title: string;
  kind: SessionKind;
};

export type ActiveTimer = {
  durationMinutes: number;
  remainingSeconds: number;
  isRunning: boolean;
  endsAt: string | null;
  startedAt: string;
};

export type CodeRun = {
  id: string;
  exerciseId: string;
  exerciseTitle: string;
  code: string;
  status: "passed" | "failed" | "blocked" | "error";
  message: string;
  passedTests: number;
  totalTests: number;
  output: string;
  createdAt: string;
};

export type JapaneseAttempt = {
  id: string;
  cardId: string;
  prompt: string;
  submitted: string;
  correct: boolean;
  createdAt: string;
};

export type JapaneseReview = {
  cardId: string;
  dueAt: string;
  intervalDays: number;
  streak: number;
  lastReviewedAt: string;
};

export type CloudLabStatus = "in_progress" | "evidence_submitted" | "locally_verified";

export type CloudLabRecord = {
  labId: string;
  status: CloudLabStatus;
  evidence: string;
  updatedAt: string;
};

export type CloudToolCheck = {
  tool: string;
  label: string;
  status: "available" | "missing" | "error";
  detail: string;
  checkedAt: string;
};

export type LearningData = {
  version: 6;
  profile: ProfilePreferences;
  attempts: TaskAttempt[];
  focusSessions: FocusSession[];
  plannedSessions: PlannedSession[];
  activeTimer: ActiveTimer | null;
  codeRuns: CodeRun[];
  japaneseAttempts: JapaneseAttempt[];
  japaneseReviews: JapaneseReview[];
  cloudLabs: CloudLabRecord[];
  cloudToolChecks: CloudToolCheck[];
  updatedAt: string;
};

export const defaultPlannedSessions: PlannedSession[] = [
  { id: "plan-mon-campus", day: "Mon", time: "10:00", durationMinutes: 240, title: "Possible campus supervision", kind: "campus" },
  { id: "plan-mon-cloud", day: "Mon", time: "19:00", durationMinutes: 25, title: "Explore your terminal", kind: "cloud" },
  { id: "plan-mon-jp", day: "Mon", time: "20:00", durationMinutes: 20, title: "First five hiragana", kind: "japanese" },
  { id: "plan-tue-campus", day: "Tue", time: "09:00", durationMinutes: 360, title: "Campus", kind: "campus" },
  { id: "plan-tue-code", day: "Tue", time: "19:00", durationMinutes: 25, title: "A small Python exercise", kind: "coding" },
  { id: "plan-tue-jp", day: "Tue", time: "20:00", durationMinutes: 20, title: "Hiragana review", kind: "japanese" },
  { id: "plan-wed-code", day: "Wed", time: "10:00", durationMinutes: 25, title: "Python foundations", kind: "coding" },
  { id: "plan-wed-campus", day: "Wed", time: "13:00", durationMinutes: 240, title: "Campus", kind: "campus" },
  { id: "plan-wed-jp", day: "Wed", time: "20:00", durationMinutes: 20, title: "Hiragana review", kind: "japanese" },
  { id: "plan-thu-code", day: "Thu", time: "10:00", durationMinutes: 50, title: "Learn, then write Python", kind: "coding" },
  { id: "plan-thu-jp", day: "Thu", time: "15:00", durationMinutes: 20, title: "First five hiragana", kind: "japanese" },
  { id: "plan-fri-cloud", day: "Fri", time: "10:00", durationMinutes: 50, title: "Linux and cloud practice", kind: "cloud" },
  { id: "plan-fri-jp", day: "Fri", time: "15:00", durationMinutes: 20, title: "First five hiragana", kind: "japanese" },
  { id: "plan-sat-code", day: "Sat", time: "10:00", durationMinutes: 50, title: "Python foundations", kind: "coding" },
  { id: "plan-sat-jp", day: "Sat", time: "14:00", durationMinutes: 20, title: "Hiragana review", kind: "japanese" },
  { id: "plan-sun-review", day: "Sun", time: "14:00", durationMinutes: 30, title: "Look back at your week", kind: "review" },
  { id: "plan-sun-jp", day: "Sun", time: "15:00", durationMinutes: 20, title: "Gentle Japanese review", kind: "japanese" },
];

export const defaultLearningData: LearningData = {
  version: 6,
  profile: {
    displayName: "Iqbal",
    graduationTarget: "2027-04",
    timezone: "Asia/Jakarta",
    dailyJapaneseMinutes: 20,
    technicalSessionMinutes: 25,
  },
  attempts: [],
  focusSessions: [],
  plannedSessions: defaultPlannedSessions,
  activeTimer: null,
  codeRuns: [],
  japaneseAttempts: [],
  japaneseReviews: [],
  cloudLabs: [],
  cloudToolChecks: [],
  updatedAt: new Date(0).toISOString(),
};

const validTracks: TrackName[] = ["Coding", "Cloud & DevOps", "Japanese"];
const validDays: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const validKinds: SessionKind[] = ["coding", "cloud", "japanese", "campus", "personal", "review"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;
}

export function parseLearningData(value: unknown): LearningData {
  if (!isRecord(value) || ![1, 2, 3, 4, 5, 6].includes(value.version as number) || !isRecord(value.profile)) {
    throw new Error("This is not a supported Lockinola backup.");
  }

  const profile = value.profile;
  const displayName = typeof profile.displayName === "string" ? profile.displayName.trim().slice(0, 40) : "";
  const graduationTarget = typeof profile.graduationTarget === "string" && /^\d{4}-\d{2}$/.test(profile.graduationTarget)
    ? profile.graduationTarget
    : defaultLearningData.profile.graduationTarget;
  const timezone = typeof profile.timezone === "string" && ["Asia/Jakarta", "Asia/Tokyo", "UTC"].includes(profile.timezone)
    ? profile.timezone
    : defaultLearningData.profile.timezone;

  const attempts: TaskAttempt[] = Array.isArray(value.attempts)
    ? value.attempts.flatMap((item) => {
        if (!isRecord(item) || typeof item.id !== "string" || typeof item.taskTitle !== "string" ||
          typeof item.kind !== "string" || typeof item.createdAt !== "string" ||
          !validTracks.includes(item.track as TrackName)) return [];
        return [{
          id: item.id.slice(0, 100),
          taskTitle: item.taskTitle.slice(0, 160),
          track: item.track as TrackName,
          kind: item.kind.slice(0, 80),
          createdAt: item.createdAt,
        }];
      })
    : [];

  const focusSessions: FocusSession[] = Array.isArray(value.focusSessions)
    ? value.focusSessions.flatMap((item) => {
        if (!isRecord(item) || typeof item.id !== "string" || typeof item.completedAt !== "string") return [];
        return [{
          id: item.id.slice(0, 100),
          durationMinutes: boundedNumber(item.durationMinutes, 25, 1, 720),
          completedAt: item.completedAt,
        }];
      })
    : [];

  const plannedSessions: PlannedSession[] = Array.isArray(value.plannedSessions)
    ? value.plannedSessions.flatMap((item) => {
        if (!isRecord(item) || typeof item.id !== "string" || typeof item.title !== "string" ||
          typeof item.time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time) ||
          !validDays.includes(item.day as Weekday) || !validKinds.includes(item.kind as SessionKind)) return [];
        return [{
          id: item.id.slice(0, 100),
          day: item.day as Weekday,
          time: item.time,
          durationMinutes: boundedNumber(item.durationMinutes, 25, 5, 720),
          title: item.title.trim().slice(0, 120) || "Study session",
          kind: item.kind as SessionKind,
        }];
      })
    : structuredClone(defaultPlannedSessions);

  const timer = isRecord(value.activeTimer) ? value.activeTimer : null;
  const activeTimer: ActiveTimer | null = timer && typeof timer.startedAt === "string"
    ? {
        durationMinutes: boundedNumber(timer.durationMinutes, 25, 1, 720),
        remainingSeconds: boundedNumber(timer.remainingSeconds, 1500, 0, 43200),
        isRunning: timer.isRunning === true,
        endsAt: typeof timer.endsAt === "string" ? timer.endsAt : null,
        startedAt: timer.startedAt,
      }
    : null;

  const codeRuns: CodeRun[] = Array.isArray(value.codeRuns)
    ? value.codeRuns.flatMap((item) => {
        if (!isRecord(item) || typeof item.id !== "string" || typeof item.exerciseId !== "string" ||
          typeof item.exerciseTitle !== "string" || typeof item.code !== "string" ||
          typeof item.message !== "string" || typeof item.output !== "string" ||
          typeof item.createdAt !== "string" || !["passed", "failed", "blocked", "error"].includes(item.status as string)) return [];
        return [{
          id: item.id.slice(0, 100),
          exerciseId: item.exerciseId.slice(0, 80),
          exerciseTitle: item.exerciseTitle.slice(0, 160),
          code: item.code.slice(0, 8_000),
          status: item.status as CodeRun["status"],
          message: item.message.slice(0, 500),
          passedTests: boundedNumber(item.passedTests, 0, 0, 100),
          totalTests: boundedNumber(item.totalTests, 0, 0, 100),
          output: item.output.slice(0, 4_000),
          createdAt: item.createdAt,
        }];
      })
    : [];

  const japaneseAttempts: JapaneseAttempt[] = Array.isArray(value.japaneseAttempts)
    ? value.japaneseAttempts.flatMap((item) => {
        if (!isRecord(item) || typeof item.id !== "string" || typeof item.cardId !== "string" ||
          typeof item.prompt !== "string" || typeof item.submitted !== "string" ||
          typeof item.createdAt !== "string" || typeof item.correct !== "boolean") return [];
        return [{
          id: item.id.slice(0, 100),
          cardId: item.cardId.slice(0, 80),
          prompt: item.prompt.slice(0, 120),
          submitted: item.submitted.slice(0, 120),
          correct: item.correct,
          createdAt: item.createdAt,
        }];
      })
    : [];

  const japaneseReviews: JapaneseReview[] = Array.isArray(value.japaneseReviews)
    ? value.japaneseReviews.flatMap((item) => {
        if (!isRecord(item) || typeof item.cardId !== "string" || typeof item.dueAt !== "string" ||
          typeof item.lastReviewedAt !== "string") return [];
        return [{
          cardId: item.cardId.slice(0, 80),
          dueAt: item.dueAt,
          intervalDays: boundedNumber(item.intervalDays, 0, 0, 365),
          streak: boundedNumber(item.streak, 0, 0, 1000),
          lastReviewedAt: item.lastReviewedAt,
        }];
      })
    : [];

  const cloudLabs: CloudLabRecord[] = Array.isArray(value.cloudLabs)
    ? value.cloudLabs.flatMap((item) => {
        if (!isRecord(item) || typeof item.labId !== "string" || typeof item.evidence !== "string" ||
          typeof item.updatedAt !== "string" || !["in_progress", "evidence_submitted", "locally_verified"].includes(item.status as string)) return [];
        return [{
          labId: item.labId.slice(0, 80),
          status: item.status as CloudLabStatus,
          evidence: item.evidence.slice(0, 4_000),
          updatedAt: item.updatedAt,
        }];
      })
    : [];

  const cloudToolChecks: CloudToolCheck[] = Array.isArray(value.cloudToolChecks)
    ? value.cloudToolChecks.flatMap((item) => {
        if (!isRecord(item) || typeof item.tool !== "string" || typeof item.label !== "string" ||
          typeof item.detail !== "string" || typeof item.checkedAt !== "string" ||
          !["available", "missing", "error"].includes(item.status as string)) return [];
        return [{
          tool: item.tool.slice(0, 80),
          label: item.label.slice(0, 100),
          status: item.status as CloudToolCheck["status"],
          detail: item.detail.slice(0, 300),
          checkedAt: item.checkedAt,
        }];
      })
    : [];

  return {
    version: 6,
    profile: {
      displayName: displayName || defaultLearningData.profile.displayName,
      graduationTarget,
      timezone,
      dailyJapaneseMinutes: boundedNumber(profile.dailyJapaneseMinutes, 20, 5, 180),
      technicalSessionMinutes: boundedNumber(profile.technicalSessionMinutes, 25, 10, 240),
    },
    attempts: attempts.slice(-2000),
    focusSessions: focusSessions.slice(-1000),
    plannedSessions: plannedSessions.slice(0, 300),
    activeTimer,
    codeRuns: codeRuns.slice(-300),
    japaneseAttempts: japaneseAttempts.slice(-1000),
    japaneseReviews: japaneseReviews.slice(0, 200),
    cloudLabs: cloudLabs.slice(0, 100),
    cloudToolChecks: cloudToolChecks.slice(0, 20),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
  };
}

export function loadLearningData(): LearningData {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return structuredClone(defaultLearningData);
  return parseLearningData(JSON.parse(stored));
}

export function saveLearningData(data: LearningData) {
  const next = { ...data, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function createRecordId(prefix: string) {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}

export function serializeLearningData(data: LearningData) {
  return JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2);
}
