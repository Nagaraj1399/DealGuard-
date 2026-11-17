# DealGuard — Full Test Automation Prompt (Nexconn Build Challenge 2026)

Paste this into an AI coding agent (Claude Code, Codex, Cursor, etc.) AFTER `dealguard_build_prompt.md` has been implemented, to generate a complete, end-to-end automated test suite for DealGuard. Do not skip areas — judging is 50% "does it run fully and smoothly," so test coverage here directly protects the biggest score bucket, and the deadline (Nov 22, 23:59 AoE) is hard, so this suite must also catch any last-minute regression before submission.

## 0. Testing philosophy (non-negotiable)

- Follow test-driven-development: write the failing test first, watch it fail, write minimal code to pass, refactor. Use **vertical tracer bullets** — one behavior end-to-end at a time, not a pile of tests written against code that doesn't exist yet.
- Prefer real code over mocks. Mock only true external boundaries: the Nexconn network calls and the Groq API — never mock DealGuard's own logic.
- Test pyramid shape: many fast unit tests, a moderate integration layer, a small but meaningful E2E layer (Playwright), plus dedicated security, performance, accessibility and regression-smoke passes.
- **Never point automated tests at the production/demo Nexconn App Key.** Create a second, CI-only Nexconn app/App Key so test traffic never inflates, corrupts, or dilutes the real traction MAU number judges will check on the demo App Key.
- All test fixtures use synthetic data only — same rule as the build prompt. No real names, phone numbers, or addresses anywhere in the repo, including test fixtures.

## 1. Tooling to install

- Unit/integration runner: **Vitest** (fast, native TS/ESM support, works well with Next.js)
- E2E: **Playwright** (multi-browser-context support is essential here — buyer, seller, and agent must run as separate simultaneous contexts in the same test)
- API mocking at the network boundary: **MSW** (Mock Service Worker) for Groq and Nexconn Server API calls in unit/integration tests
- Coverage: Vitest's built-in `c8`/`istanbul` coverage reporter
- Accessibility: `@axe-core/playwright`
- Performance/web-vitals: Playwright's tracing + a small Lighthouse CI job (separate scheduled pipeline, not on every commit)
- PII/secret scanning: a small custom Node script (`scripts/scan-pii.ts`) run as its own CI step

## 2. Coverage matrix (every row below must have at least one test)

| Area | What must be covered |
|---|---|
| Unit — classifier contract | Valid JSON parses into `{trust_flag, trust_reason, lead_score, risk_of_loss}`; malformed/partial JSON from Groq degrades to a safe "unclassified" result instead of throwing; out-of-range scores (negative, >100) are clamped |
| Unit — Trust Shield threshold | `trust_flag: true` renders the badge; `trust_flag: false` never renders it; boundary values at the trust/no-trust line behave as specified |
| Unit — Hot-Lead Radar threshold | `lead_score >= 80` OR `risk_of_loss >= 80` triggers escalation; 79/79 does not; both at exactly 80 triggers; escalation fires exactly once per qualifying message (no duplicate triggers) |
| Unit — Nexconn token signing | Given fixed test inputs (user id, nonce, timestamp), the signing function produces a deterministic, reproducible signature — inject the clock/nonce so the test isn't time-dependent |
| Unit — data store | CRUD round-trips for listings, messages, and classification results; seed script run twice does not duplicate rows |
| Integration — `/api/nexconn/token` | Success path returns a token; missing/invalid user id returns a clean 4xx, not a crash; a simulated Nexconn API failure is handled and surfaced, not swallowed |
| Integration — `/api/listings` | Returns exactly the seeded synthetic listings in the documented shape |
| Integration — `/api/copilot/classify` | Calls Groq with the documented system prompt; a Groq timeout or 5xx falls back to "unclassified" instead of taking down the request; response is normalized to the fixed schema regardless of model phrasing |
| Integration — `/api/copilot/escalate` | Builds a briefing from the last N messages; calls TTS; posts exactly one audio message to the agent's Group Channel via a mocked Nexconn Server API call with the expected payload; does not double-post on retry |
| Integration — webhook/poll handler | Already-processed messages are not re-classified or re-escalated (idempotency/dedup by message ID) |
| E2E — buyer→seller real message | Using two Playwright browser contexts against the CI Nexconn app: buyer sends a real message via the UI, seller's context receives it in real time through the actual Nexconn SDK (not mocked) |
| E2E — Trust Shield scripted beat | Buyer sends the exact scripted scam message from the build prompt; the red badge appears within a defined timeout with the correct reason text |
| E2E — Hot-Lead Radar scripted beat | Buyer sends the exact scripted walk-away message; the escalation system message appears, the agent's Playwright context shows the new audio briefing message, and the audio asset has nonzero duration |
| E2E — role switcher | Switching between buyer/seller/agent test identities shows the correct channel and message history for each, with no state leaking between roles |
| E2E — reconnection | Simulate the client going offline then online mid-conversation; confirm Nexconn's built-in reconnection restores the session and message history without a manual refresh |
| Security/Privacy | Automated PII scan over the whole repo (phone/email/name-pattern regexes) fails the build on any match outside an explicit, reviewed allowlist; `NEXCONN_APP_SECRET` and `GROQ_API_KEY` are grepped out of the built `.next` client bundle and must never appear there; API routes that should require a session reject anonymous requests |
| Performance | Classifier round-trip latency has an asserted budget (e.g. p95 under a defined threshold) measured against the real Groq endpoint in a scheduled (not per-commit) job; `/listings` and the chat page have an asserted load/Time-to-Interactive budget |
| Accessibility | `axe-core` scan on `/listings`, the chat page, and `/agent` returns zero critical/serious violations |
| Regression — golden-path smoke | One Playwright spec runs both scripted demo beats back-to-back end to end and asserts both visible outcomes; this is the test that protects the submission in the final days before the deadline |

## 3. Folder layout

```
tests/
  unit/
    classifier.test.ts
    trust-shield.test.ts
    hot-lead-radar.test.ts
    nexconn-signing.test.ts
    data-store.test.ts
  integration/
    api.nexconn-token.test.ts
    api.listings.test.ts
    api.copilot-classify.test.ts
    api.copilot-escalate.test.ts
    webhook-dedup.test.ts
  e2e/
    buyer-seller-message.spec.ts
    trust-shield-beat.spec.ts
    hot-lead-beat.spec.ts
    role-switcher.spec.ts
    reconnection.spec.ts
    golden-path-smoke.spec.ts   # the deadline-protection test
  a11y/
    axe-scan.spec.ts
  security/
    scan-pii.test.ts
scripts/
  scan-pii.ts
```

## 4. Coverage targets & CI gate

- Statement coverage ≥ 80% on `/lib` and `/app/api` (unit + integration combined). Report via `vitest --coverage`.
- E2E suite must be 100% green — no skipped or flaky-quarantined specs allowed in the gate that blocks submission.
- The PII scanner and the secret-in-bundle check are **zero-tolerance hard gates**: any hit fails the build, no override.
- The golden-path smoke spec is the single test that must never be red when you hit submit.

## 5. CI pipeline (GitHub Actions)

Jobs, in order, fail-fast disabled so you see every failure in one run:
1. `lint-typecheck` — ESLint + `tsc --noEmit`
2. `unit` — Vitest unit tests + coverage report
3. `integration` — Vitest integration tests against MSW-mocked Nexconn/Groq
4. `e2e` — Playwright against the CI-only Nexconn sandbox app (secrets from GitHub Actions secrets, never committed)
5. `security` — PII scan + secret-in-bundle check (hard gate)
6. `a11y` — axe-core scan

Separate **scheduled** workflow (cron, run every 6 hours during the final week before Nov 22): re-runs only `golden-path-smoke.spec.ts` against the live deployed demo URL, so any regression in the last days is caught automatically without waiting for a push.

## 6. Acceptance criteria for "complete coverage" (verify before calling this done)

- [ ] Every row in the section 2 matrix has a passing, named test you can point to.
- [ ] `vitest --coverage` reports ≥ 80% on `/lib` and `/app/api`.
- [ ] `playwright test` passes fully, including both scripted demo beats and the golden-path smoke spec.
- [ ] PII scan and secret-in-bundle check both pass with zero findings.
- [ ] CI pipeline runs all six jobs on every push to `main`; the scheduled smoke job is wired up and has run at least once successfully.
- [ ] A short `tests/README.md` explains how to run each layer locally and what the CI-only Nexconn app is for.
