# Lockinola private release checklist

Lockinola is still local and unpublished. Use this checklist only when you decide to create a private hosted copy.

## Before hosting

1. Download a fresh JSON backup from **Profile & backup**.
2. Restore that backup in the local app and confirm the profile, XP, schedule, code history, Japanese reviews, and cloud evidence are present.
3. Keep the original backup offline until the hosted copy has been verified.
4. Decide whether the hosted copy should start empty or receive the backup manually. Lockinola never transfers browser data automatically.

## Host environment

Set these as secret environment variables in the hosting provider, never in Git:

```env
LOCKINOLA_HOSTED=true
LOCKINOLA_ACCESS_PASSWORD=use-at-least-12-characters
LOCKINOLA_ACCESS_SECRET=use-at-least-32-random-characters
```

Use HTTPS. The access cookie is `HttpOnly`, `Secure`, and `SameSite=Strict`, so it is intentionally unavailable over plain HTTP. Changing the password invalidates existing signed sessions.

`OPENAI_API_KEY` remains optional. If enabled, set `LOCKINOLA_AI_DAILY_LIMIT` and configure provider-side project spending limits as the stronger cost boundary.

## Boundaries

- Browser learning records stay in that browser unless you manually export and restore them.
- The password gate protects the visible hosted workspace and all Lockinola API routes. Static curriculum code contains no private learning records.
- The Python helper and Floci endpoints must remain loopback-only or on a private internal network. Never expose ports 4317 or local emulator endpoints publicly.
- A hosted UI may show the local labs, but they will remain unavailable unless a separately isolated private runner is designed later.
- No level-up creates a cloud account, resource, charge, or certification claim.

## Private preview checks

1. Open the site in a signed-out private browser. It must show the access gate.
2. Try a wrong password. It must stay locked; repeated failures must be rate-limited.
3. Sign in with the correct password over HTTPS and reload the page.
4. Lock the workspace from **Profile & backup** and confirm protected API requests return `401`.
5. Check the Today, Coding, Cloud & DevOps, Japanese, Schedule, and Progress views on a phone and desktop.
6. Restore a backup in the intended browser and re-check totals before deleting any original copy.

Publishing remains a separate, explicit action.
