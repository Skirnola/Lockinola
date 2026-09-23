import type { LearningData, TrackName } from "@/lib/learning-data";

export type EvidenceState = "introduced" | "helped" | "independent" | "remembered";

export type XpEvent = {
  key: string;
  track: TrackName;
  xp: number;
  label: string;
  createdAt: string;
};

export type TopicEvidence = {
  key: string;
  track: TrackName;
  topic: string;
  state: EvidenceState;
  detail: string;
  updatedAt: string;
};

export type TrackProgress = {
  track: TrackName;
  xp: number;
  level: number;
  levelStart: number;
  levelEnd: number;
  percentToNext: number;
};

export type DayProgress = {
  key: string;
  label: string;
  dateLabel: string;
  xp: number;
  focusMinutes: number;
};

export type ProgressSnapshot = {
  events: XpEvent[];
  topics: TopicEvidence[];
  tracks: Record<TrackName, TrackProgress>;
  totalXp: number;
  creditedActions: number;
  weekly: DayProgress[];
  weekStartLabel: string;
};

const tracks: TrackName[] = ["Coding", "Cloud & DevOps", "Japanese"];
const thresholds = [0, 100, 250, 450, 700, 1000, 1400, 1850];
const stateRank: Record<EvidenceState, number> = { introduced: 1, helped: 2, independent: 3, remembered: 4 };

function validDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function startOfLocalWeek(now: Date) {
  const result = new Date(now);
  const day = (result.getDay() + 6) % 7;
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - day);
  return result;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function levelFor(track: TrackName, xp: number): TrackProgress {
  let index = thresholds.findLastIndex(value => xp >= value);
  if (index < 0) index = 0;
  const level = Math.min(index + 1, thresholds.length);
  const levelStart = thresholds[index];
  const levelEnd = thresholds[index + 1] ?? thresholds[index] + 500;
  const percentToNext = Math.min(100, Math.round(((xp - levelStart) / (levelEnd - levelStart)) * 100));
  return { track, xp, level, levelStart, levelEnd, percentToNext };
}

export function calculateProgress(data: LearningData, now = new Date()): ProgressSnapshot {
  const events: XpEvent[] = [];
  const topicMap = new Map<string, TopicEvidence>();

  const addEvent = (event: XpEvent) => {
    if (!events.some(item => item.key === event.key)) events.push(event);
  };
  const addTopic = (topic: TopicEvidence) => {
    const previous = topicMap.get(topic.key);
    if (!previous || stateRank[topic.state] > stateRank[previous.state] ||
      (stateRank[topic.state] === stateRank[previous.state] && validDate(topic.updatedAt) > validDate(previous.updatedAt))) {
      topicMap.set(topic.key, topic);
    }
  };

  const firstAttempts = new Map<string, LearningData["attempts"][number]>();
  [...data.attempts].sort((a, b) => validDate(a.createdAt).getTime() - validDate(b.createdAt).getTime()).forEach(attempt => {
    const key = `${attempt.track}:${attempt.taskTitle}`;
    if (!firstAttempts.has(key)) firstAttempts.set(key, attempt);
  });
  firstAttempts.forEach(attempt => {
    const key = `lesson:${attempt.track}:${attempt.taskTitle}`;
    addEvent({ key, track: attempt.track, xp: 10, label: attempt.taskTitle, createdAt: attempt.createdAt });
    addTopic({ key, track: attempt.track, topic: attempt.taskTitle, state: "introduced", detail: "Lesson attempt saved", updatedAt: attempt.createdAt });
  });

  const codingRuns = new Map<string, typeof data.codeRuns>();
  data.codeRuns.forEach(run => codingRuns.set(run.exerciseId, [...(codingRuns.get(run.exerciseId) ?? []), run]));
  codingRuns.forEach((runs, exerciseId) => {
    const ordered = [...runs].sort((a, b) => validDate(a.createdAt).getTime() - validDate(b.createdAt).getTime());
    const passed = ordered.find(run => run.status === "passed");
    const latest = ordered.at(-1)!;
    if (passed) addEvent({ key: `code-pass:${exerciseId}`, track: "Coding", xp: 40, label: `${passed.exerciseTitle} passed`, createdAt: passed.createdAt });
    addTopic({ key: `code:${exerciseId}`, track: "Coding", topic: latest.exerciseTitle, state: passed ? "independent" : "introduced", detail: passed ? "Local checks passed" : "Code attempt saved", updatedAt: (passed ?? latest).createdAt });
  });

  const japaneseByCard = new Map<string, typeof data.japaneseAttempts>();
  data.japaneseAttempts.forEach(attempt => japaneseByCard.set(attempt.cardId, [...(japaneseByCard.get(attempt.cardId) ?? []), attempt]));
  japaneseByCard.forEach((attempts, cardId) => {
    const ordered = [...attempts].sort((a, b) => validDate(a.createdAt).getTime() - validDate(b.createdAt).getTime());
    const correct = ordered.filter(attempt => attempt.correct);
    const firstCorrect = correct[0];
    const remembered = firstCorrect && correct.find(attempt => validDate(attempt.createdAt).getTime() - validDate(firstCorrect.createdAt).getTime() >= 20 * 60 * 60 * 1000);
    if (firstCorrect) addEvent({ key: `jp-correct:${cardId}`, track: "Japanese", xp: 15, label: `${firstCorrect.prompt} recalled`, createdAt: firstCorrect.createdAt });
    if (remembered) addEvent({ key: `jp-remembered:${cardId}`, track: "Japanese", xp: 25, label: `${remembered.prompt} remembered later`, createdAt: remembered.createdAt });
    const latest = ordered.at(-1)!;
    addTopic({ key: `jp:${cardId}`, track: "Japanese", topic: latest.prompt, state: remembered ? "remembered" : firstCorrect ? "independent" : "introduced", detail: remembered ? "Correct again after at least 20 hours" : firstCorrect ? "Correct recall saved" : "Practice attempt saved", updatedAt: (remembered ?? firstCorrect ?? latest).createdAt });
  });

  data.cloudLabs.forEach(record => {
    const xp = record.status === "locally_verified" ? 35 : record.status === "evidence_submitted" ? 25 : 5;
    const state: EvidenceState = record.status === "locally_verified" ? "independent" : record.status === "evidence_submitted" ? "helped" : "introduced";
    addEvent({ key: `cloud:${record.labId}`, track: "Cloud & DevOps", xp, label: record.labId.replaceAll("-", " "), createdAt: record.updatedAt });
    addTopic({ key: `cloud:${record.labId}`, track: "Cloud & DevOps", topic: record.labId.replaceAll("-", " "), state, detail: record.status === "locally_verified" ? "Narrow local check passed" : record.status === "evidence_submitted" ? "Guided evidence submitted" : "Lab started", updatedAt: record.updatedAt });
  });

  const trackProgress = Object.fromEntries(tracks.map(track => {
    const xp = events.filter(event => event.track === track).reduce((sum, event) => sum + event.xp, 0);
    return [track, levelFor(track, xp)];
  })) as Record<TrackName, TrackProgress>;

  const weekStart = startOfLocalWeek(now);
  const weekly = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const key = dateKey(date);
    return {
      key,
      label: date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
      dateLabel: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      xp: events.filter(event => dateKey(validDate(event.createdAt)) === key).reduce((sum, event) => sum + event.xp, 0),
      focusMinutes: data.focusSessions.filter(session => dateKey(validDate(session.completedAt)) === key).reduce((sum, session) => sum + session.durationMinutes, 0),
    };
  });

  return {
    events: events.sort((a, b) => validDate(b.createdAt).getTime() - validDate(a.createdAt).getTime()),
    topics: [...topicMap.values()].sort((a, b) => validDate(b.updatedAt).getTime() - validDate(a.updatedAt).getTime()),
    tracks: trackProgress,
    totalXp: events.reduce((sum, event) => sum + event.xp, 0),
    creditedActions: events.length,
    weekly,
    weekStartLabel: `${weekly[0].dateLabel}–${weekly[6].dateLabel}`,
  };
}
