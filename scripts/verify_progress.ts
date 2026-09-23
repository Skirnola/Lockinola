import assert from "node:assert/strict";
import { defaultLearningData, parseLearningData, type LearningData } from "../lib/learning-data";
import { calculateProgress } from "../lib/progress";

const monday = "2026-09-21T10:00:00+07:00";
const tuesday = "2026-09-22T10:30:00+07:00";

const sample: LearningData = {
  ...structuredClone(defaultLearningData),
  attempts: [
    { id: "a1", taskTitle: "Variables", track: "Coding", kind: "lesson", createdAt: monday },
    { id: "a2", taskTitle: "Variables", track: "Coding", kind: "lesson", createdAt: tuesday },
  ],
  codeRuns: [
    { id: "c1", exerciseId: "intro", exerciseTitle: "Introduction function", code: "pass", status: "passed", message: "ok", passedTests: 3, totalTests: 3, output: "", createdAt: monday },
    { id: "c2", exerciseId: "intro", exerciseTitle: "Introduction function", code: "pass again", status: "passed", message: "ok", passedTests: 3, totalTests: 3, output: "", createdAt: tuesday },
  ],
  japaneseAttempts: [
    { id: "j1", cardId: "a", prompt: "あ", submitted: "a", correct: true, createdAt: monday },
    { id: "j2", cardId: "a", prompt: "あ", submitted: "a", correct: true, createdAt: tuesday },
  ],
  cloudLabs: [{ labId: "tool-inventory", status: "locally_verified", evidence: "checked", updatedAt: monday }],
};

const snapshot = calculateProgress(sample, new Date(monday));
assert.equal(snapshot.tracks.Coding.xp, 50, "duplicate lessons and passes must not add XP");
assert.equal(snapshot.tracks.Japanese.xp, 40, "later recall should add one retention award");
assert.equal(snapshot.tracks["Cloud & DevOps"].xp, 35, "verified cloud lab should use its strongest award only");
assert.equal(snapshot.totalXp, 125);
assert.equal(snapshot.topics.find(topic => topic.key === "jp:a")?.state, "remembered");

const migrated = parseLearningData({ ...sample, version: 5 });
assert.equal(migrated.version, 6, "Stage 8 data should migrate to Stage 9 storage without loss");
assert.equal(migrated.attempts.length, 2);

console.log("Stage 9 progress verification passed.");
