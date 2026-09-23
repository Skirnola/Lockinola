# Lockinola build roadmap

Work one stage per user request. Preserve the design and prior working features, verify each stage, update this file, and stop at its boundary.

| Stage | Scope | Status |
| --- | --- | --- |
| 1 | Foundation, distinctive responsive visual prototype, Today and five supporting views, documented requirements | Complete — local preview verified |
| 2 | Profile/preferences, durable tasks/attempts/session records, export and recovery | Complete — local persistence verified |
| 3 | Editable weekly planning, movable sessions, reliable timer persistence and recovery | Complete — responsive behavior verified |
| 4 | Reviewed first-month curriculum, working resource links, courses and certification preparation | Complete — sources and responsive UI verified |
| 5 | Server-side AI tutor with lesson context, hints, feedback, error states and usage controls | Implemented — live API activation deferred by owner |
| 6 | Coding editor, isolated Python runner, meaningful tests, retries and history | Complete — local runner and persistence verified |
| 7 | Japanese kana/audio, accepted-answer checks, vocabulary and spaced review | Complete — local review flow verified |
| 8 | Cloud labs, evidence status, local verifier and real-cloud readiness milestones | Complete — local evidence flow verified |
| 9 | XP, separate track levels, evidence-based mastery, weekly progress without duplicate awards | Complete — derived credit and progress view verified |
| 10 | Private-access protection, cross-device QA, backup/restore, cost controls and release | Complete — private boundary and release checks verified |

## Stage 1 deliverables

- Custom dark-blue Today workspace with Python lesson preview, daily Japanese, open track columns and a sample schedule.
- Working temporary 25/50/90-minute timer with pause/resume/reset; no saved sessions.
- Coding, Cloud & DevOps and Japanese path views with sample mixed-format tasks and next chapters.
- Typical-week day selector respects known campus hours; final workload remains undecided.
- Progress view starts at zero and distinguishes temporary attempts from saved mastery.
- Accessible shared primitives, mobile navigation, keyboard focus and reduced-motion support.
- Local-only; no paid AI connection, cloud provisioning, auth implementation or publication.

## Stage 1 verification

- Initial local route returned HTTP 200.
- TypeScript check passed before final visual refinements.
- Initial production build succeeded; identified stylesheet warnings corrected before final build.
- Final TypeScript check passed. Production build passed with no CSS warnings after corrections.
- Browser checks: all six views, Python lesson dialog, temporary task attempt reflected in Progress, 50-minute selection, countdown, pause/resume label, reset, Tuesday schedule and campus block.
- Visually reviewed desktop, 390px phone and 768px tablet layouts. Confirmed no horizontal page overflow on checked phone/tablet sizes; fixed phone button wrapping and tablet column compression.
- Verified mobile navigation opens and closes after selecting a view. Reset responsive viewport override before handoff.
- Reworked the Stage 1 visual direction after review: warm editorial minimalism, retro stationery details, stronger readability, flatter sections, and selective hard-shadow controls.
- Stage 1 boundary retained: no persistence, paid API, cloud provisioning, or publication.

## Stage 2 deliverables

- Browser-local versioned data store for profile preferences, task attempts, and completed focus sessions.
- Editable name, graduation month, timezone, daily Japanese target, and default technical-session length.
- Repeated attempts remain in history while unique task completion credit is counted once.
- Track and Progress views calculate attempted progress from saved records.
- JSON backup download plus validated restore that rejects unrelated or malformed data.
- Dynamic Jakarta date and explicit local-save status throughout the interface.

## Stage 2 verification

- TypeScript check and production build passed.
- Profile and timer preference changes survived a browser reload; test values were returned to Iqbal and 25 minutes afterward.
- Backup serialization round-trip passed, and an invalid-version backup was rejected.
- Profile and backup dialog reviewed at desktop and 390px phone widths with no horizontal overflow.
- Stage 2 boundary retained: an active timer does not recover after reload, the schedule is not editable yet, and no database, paid API, or publication was added.

## Stage 3 deliverables

- Editable weekly schedule with add, edit, move, retime, retype, and remove controls for local sessions.
- Version 2 browser data model with automatic migration from saved Stage 2 data.
- Active focus timers recover accurately after reload; paused state and completion recording remain local.
- Desktop navigation collapses to a compact icon rail and expands from the top-bar control.
- Today and Schedule grids were tightened to prevent clipped content at desktop and phone sizes.

## Stage 3 verification

- TypeScript check, production build, and version 1-to-2 migration/backup round-trip passed.
- A temporary schedule edit survived reload and was restored to its original value afterward.
- A running timer survived reload with its countdown intact, then was reset to a clean 25-minute state.
- Desktop navigation changed between 216px and 64px widths. Today and Schedule had no horizontal overflow at 1440px and 390px.
- Stage 3 boundary retained: reviewed curriculum links, AI tutoring, code execution, accounts, and publication remain later work.

## Stage 4 deliverables

- Four-week routes with eight concrete tasks each for beginner Python, Linux/cloud, and Japanese from zero.
- Reviewed links to official CS50P, Python, Ubuntu, AWS, Floci, Irodori, and Marugoto resources.
- Every resource task includes a focused assignment and time estimate; local practice tasks include an observable output.
- AWS Cloud Practitioner and JLPT are shown as later checkpoints, without implying current readiness or earned certification.
- Desktop collapse control moved into the sidebar header; the top bar retains the mobile menu control.

## Stage 4 verification

- TypeScript check and production build passed.
- All three learning tracks rendered eight tasks across Weeks 1–4 with no horizontal overflow.
- Reviewed-resource dialogs exposed the expected external URL in a new tab and fit at 1440px and 390px widths.
- Sidebar header control changed the desktop rail between 216px and 64px and remained available in the collapsed rail.
- Stage 4 boundary retained: the app records attempts but does not yet provide AI feedback, run submitted code, or award mastery.

## Stage 5 deliverables

- Lesson-aware tutor panel inside every curriculum task, with separate hint and answer-review actions.
- Server-only OpenAI Responses API route; browser requests contain lesson context and learner text but never the API key.
- Beginner-focused prompting that withholds full solutions for hints and returns an explained verdict for reviews.
- Visible Jakarta-day request counter with a configurable server cap, plus missing-key, validation, timeout, provider, empty-response, and network states.
- Honest boundaries: text feedback does not execute Python, verify cloud infrastructure, award mastery, or prove certification readiness.

## Stage 5 verification

- TypeScript check and production build passed.
- Tutor status, validation, and missing-key responses verified against the local API route without exposing credentials. A paid model call was not made without the learner's API key.
- Lesson tutor reviewed at desktop and phone widths, including setup, disabled-control, and request-budget presentation.
- Stage 5 boundary retained: code execution, deterministic Japanese answer checks, cloud evidence verification, XP/levels, accounts, and publication remain later work.
- Owner decision: leave `OPENAI_API_KEY` unset for now to avoid separate API charges. The tutor setup remains available for later activation without blocking Stage 6.

## Stage 6 deliverables

- Focused Python workbench with three progressive function exercises for variables, conditionals, and loops.
- Real executable checks with per-case expected/actual feedback, syntax feedback, keyboard execution, reset, loading, and runner-error states.
- Loopback-only Python helper started by `npm run dev`; each submission runs in a separate `-I -S -B` process with a three-second timeout and capped output.
- Beginner runner blocks imports, file access, `input()`, top-level execution, and double-underscore access. It is explicitly labelled as local exercise isolation rather than a public hostile-code sandbox.
- Version 3 browser data migrates earlier saves and retains up to 300 code runs with source, result, check counts, output, and timestamps. Previous code can be loaded for a retry.

## Stage 6 verification

- TypeScript check, Python syntax compilation, and production build passed.
- Direct runner and live website endpoint passed a correct solution, reported individual mismatches for an incorrect solution, blocked an import, and terminated an infinite loop.
- Desktop coding workspace reviewed in the local browser with accessible exercise navigation, editor, results, history, and preserved Stage 4 curriculum below it.
- Stage 6 boundary retained: Japanese grading, cloud evidence verification, XP/levels, accounts, and publication remain later work.

## Stage 7 deliverables

- Daily Japanese workspace with hiragana vowels, katakana vowels, and six beginner words.
- Slow pronunciation through the browser's installed Japanese voice, with a disabled state when speech synthesis is unavailable.
- Deterministic romaji, English, and Indonesian accepted-answer checks with correct-answer feedback and retry controls.
- Keyboard-first flow: Enter checks an answer and focus moves to the next-card action after feedback.
- Version 4 browser data migrates earlier saves and retains up to 1,000 Japanese attempts plus one spaced-review record per card.
- Correct reviews return after 1, 3, 7, 14, 30, then 60 days; missed cards return after 10 minutes. Attempts are labelled as evidence rather than mastery.

## Stage 7 verification

- TypeScript check and production build passed.
- Live practice accepted a kana answer and an Indonesian vocabulary answer, updated the due queue, and persisted both attempts after reload.
- Pronunciation control ran without a browser error; availability depends on the Japanese voice installed on the learner's device.
- Japanese workspace reviewed at desktop and 390px phone widths with no horizontal overflow.
- Stage 7 boundary retained: cloud verification, XP/levels, accounts, and publication remain later work.

## Stage 8 deliverables

- Six guided labs for tool inventory, Linux navigation, safe file permissions, request/network mapping, Floci health, and a local S3 round trip.
- Explicit not-started, in-progress, evidence-submitted, and locally-verified states with saved evidence notes and keyboard submission.
- Allow-listed local readiness endpoint for Python, Git, WSL, Docker, AWS CLI, and Floci CLI presence or version checks.
- The verifier performs read-only checks only; it does not execute learner-entered commands, log in, contact cloud accounts, or create resources.
- Version 5 browser data migrates earlier saves and retains cloud lab records plus the latest local tool snapshot in backup/restore.
- Real-provider gate tracks Linux evidence, a network explanation, local cloud cleanup, and a future budget/IAM/alerts review without claiming readiness.

## Stage 8 verification

- TypeScript check, Python syntax compilation, and production build passed.
- Live readiness request detected the installed local tools and saved the inventory lab as locally verified.
- Evidence submission via Ctrl+Enter saved the terminal lab as submitted evidence, retained the non-verification label, and survived reload.
- Cloud workspace reviewed at desktop and 390px phone widths with no horizontal overflow.
- Stage 8 boundary retained: no cloud login, billable resource, XP/levels, accounts, or publication was added.

## Stage 9 deliverables

- Separate Coding, Cloud & DevOps, and Japanese XP totals and levels, with Level 2 beginning at 100 XP.
- Deterministic award keys derived from saved records, so repeated lesson attempts, code passes, reviews, or lab updates cannot award duplicate credit.
- Evidence states for introduced lessons, guided cloud evidence, independent checks, and Japanese recall remembered at least 20 hours later.
- Weekly rhythm view showing earned XP and completed focus minutes across Monday–Sunday.
- Dynamic level markers on Today, track cards, track pages, and Progress, with a visible explanation of every award rule.
- Version 6 browser-data migration that preserves all earlier records and recalculates levels from their evidence.

## Stage 9 verification

- TypeScript check and production build passed.
- A deterministic verification script confirmed duplicate lesson attempts and repeated code passes earn credit once, later Japanese recall adds retention credit once, and a cloud lab uses only its strongest saved award.
- Version 5 data migrated to version 6 without losing attempts.
- Progress view was reviewed against existing saved data in the local app; its XP total, topic state, level meter, and weekly labels rendered correctly.
- Stage 9 boundary retained: no account, publishing, paid AI call, real-cloud login, or billable cloud resource was added.

## Stage 10 deliverables

- Explicit local and hosted modes. Local use remains open; hosted mode fails closed when access configuration is missing.
- Password access using a signed seven-day HttpOnly, Secure, SameSite=Strict cookie, same-origin mutations, and a five-attempt/fifteen-minute sign-in limit.
- Shared access enforcement for the AI tutor, Python runner proxy, and cloud-readiness proxy.
- Release-readiness panel covering the data boundary, access mode, backup round-trip validation, loopback helper boundary, and AI daily cap.
- Manual lock action for hosted sessions and a backup-first private release checklist.
- No automatic browser-data transfer, service exposure, deployment, or publication.

## Stage 10 verification

- TypeScript check, Stage 9 progress verification, Stage 10 access verification, and production build passed.
- Local access-status endpoint reported authenticated local mode, loopback runner isolation, deferred AI, and no published release.
- Automated access checks confirmed local bypass, hosted fail-closed behavior, incorrect-password rejection, signed-session acceptance, and `401` denial without a session.
- Current data successfully passed the same serialize, parse, and version validation used by backup restore.
- Release-readiness panel was reviewed in the local app with clear browser-local and unpublished labels.
- The existing responsive rules cover the access gate and collapse readiness checks to one column on phone widths.

## Project status

Stages 1–10 are complete. Lockinola remains a private local workspace until the owner explicitly chooses a host and follows [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md). Publishing is a separate action.

