# Lockinola

A personal learning workspace for coding, cloud/DevOps, and daily Japanese. It supports a private hosted workspace, Cloudflare D1 progress synchronization, local browser recovery, and an Ollama-powered tutor.

## Run locally

Requires Node.js 22.13+.

```sh
npm run install:ci
npm run dev
```

Open the local URL printed by the development server (normally http://localhost:5173).

`npm run dev` also starts a loopback-only Python helper on port 4317. Python 3 must be available as `python`; set `LOCKINOLA_PYTHON_PATH` to an absolute executable path if it is installed elsewhere. The helper is for local development and is not a hosted-code sandbox.

## AI tutor setup

Install Ollama, pull Qwen 3.8 27B, copy `.env.example` to `.env.local`, and restart the local server:

```sh
ollama pull qwen3.8:27b
```

Local mode calls Ollama at `http://127.0.0.1:11434/api`. Hosted mode calls Ollama Cloud and requires `OLLAMA_API_KEY` as a Cloudflare Worker secret. The key stays on the server. OpenAI remains available as an optional provider fallback.

## Private hosted mode

Local development opens normally. A hosted copy stays locked unless all three values below are set in the hosting provider's secret environment:

```env
LOCKINOLA_HOSTED=true
LOCKINOLA_ACCESS_PASSWORD=at-least-12-characters
LOCKINOLA_ACCESS_SECRET=at-least-32-random-characters
```

Hosted access requires HTTPS. Sessions use a signed, `HttpOnly`, `Secure`, `SameSite=Strict` cookie and expire after seven days. Failed sign-ins are limited to five attempts per client within fifteen minutes. Changing the password invalidates existing sessions. See [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) before any private preview or deployment.

## Checks

```sh
npx tsc --noEmit
npm run build
```

On Windows, if an npm shell wrapper cannot locate npm, invoke its installed JavaScript entrypoint with Node. The development script itself can also run with `node scripts/run-framework.mjs dev`.

## What's included

- Today, Coding, Cloud & DevOps, Japanese, Schedule, and Progress views.
- Responsive navigation with a collapsible desktop rail and accessible lesson dialogs.
- Focus timer with 25/50/90-minute presets; active timers recover after reload and finished sessions are recorded locally.
- Sample lessons spanning videos, courses, readings, exercises, and labs.
- Durable task-attempt history with unique-task progress that does not double-count retries.
- Editable profile preferences, graduation target, timezone, and default study lengths.
- JSON backup download and validated restore flow.
- Editable weekly schedule with movable sessions, plus honest zero-start mastery.
- Four-week beginner routes with eight concrete tasks per track.
- Reviewed official learning sources from CS50P, Python, Ubuntu, AWS, Floci, Irodori, and Marugoto.
- Resource lesson dialogs with exact assignments, expected time, and direct source links.
- Lesson-aware AI hints that avoid giving the finished solution.
- Text-answer review with an explained verdict and a visible daily request counter.
- Server-only API key handling plus missing-key, network, provider-limit, timeout, and empty-response states.
- Three progressive Python function exercises with real executable checks and mismatch feedback.
- A loopback-only Python helper that runs every submission in a separate isolated-mode process with a three-second timeout.
- Locally saved code-run history, including retries, passed-check counts, and reloadable previous code.
- Hiragana, katakana, and beginner vocabulary recall with deterministic accepted answers.
- Slow Japanese pronunciation through the browser's installed Japanese voice, with a clear unavailable state.
- Locally saved Japanese attempts and per-card review dates using a 1, 3, 7, 14, and 30-day schedule; missed cards return after 10 minutes.
- Six guided Cloud/DevOps labs covering local tooling, Linux navigation, permissions, network requests, Floci health, and a local S3 round trip.
- Explicit not-started, in-progress, evidence-submitted, and locally-verified states with honest verification boundaries.
- A read-only local check for Python, Git, WSL, Docker, AWS CLI, and Floci CLI; it does not log in, contact a cloud account, or create resources.
- Real-cloud readiness milestones for Linux evidence, networking, local cloud cleanup, and a later budget/IAM/alerts review.
- Separate Coding, Cloud & DevOps, and Japanese levels; each track reaches Level 2 at 100 XP.
- Derived XP awards keyed to unique lessons, first Python passes, first and later Japanese recall, and the strongest saved cloud-lab state, so retries never farm XP.
- Topic evidence states for introduced, with-help, independent, and remembered-later work.
- A weekly rhythm view combining newly earned XP with finished focus minutes for each day.
- Local mode that remains frictionless and an explicit hosted mode that fails closed when access secrets are missing.
- Password-gated hosted UI and matching protection on the tutor, Python-runner proxy, and cloud-readiness proxy.
- A release-readiness panel that validates backup round trips, local helper boundaries, access configuration, and AI cost status.
- A backup-first private release checklist; publication and data transfer remain explicit later actions.

Profile, lesson attempts, code runs, Japanese reviews, cloud-lab records, local tool results, weekly sessions, and focus-timer state persist in browser storage. When hosted with D1, the same validated record synchronizes across signed-in devices while the browser copy remains available for recovery. Earlier saved data migrates automatically, and the first hosted session uploads the existing browser record when the cloud workspace is empty. XP and levels are derived from evidence records, so backup/restore retains the audit trail without a separate balance that can drift. AI feedback is requested only when the learner presses a tutor action; the Python checker, Japanese checker, and local tool inventory remain separate. Imports, file access, `input()`, top-level execution, and double-underscore access are blocked in the beginner runner. This is a bounded learning process rather than a security boundary for arbitrary public code. Submitted cloud notes are saved evidence, not proof that commands ran. Certification pages are preparation references; the app does not claim readiness or earned credentials.

See [DEPLOYMENT.md](DEPLOYMENT.md) for Cloudflare D1, Worker secrets, GitHub, and automatic deployment setup.

See [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) for the agreed scope and [ROADMAP.md](ROADMAP.md) for the next stage. The React/TypeScript UI uses the local Sites/Vinext starter with Tailwind and its accessible component primitives. Native system fonts and bundled icons keep the preview independent of remote media services.
