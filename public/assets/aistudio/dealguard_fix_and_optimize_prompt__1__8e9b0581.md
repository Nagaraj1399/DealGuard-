# DealGuard — Fix & Optimize Prompt (Nexconn Build Challenge 2026)

Paste this into an AI coding agent (Claude Code, Codex, Cursor, etc.) against the existing DealGuard repo. This is a fix-and-polish pass, not a rewrite — every bug below has a known root cause from live QA against the deployed app (`dealguard-366972920178.asia-southeast1.run.app`), and every optimization is scoped to things that move the actual judging rubric (50% completeness/UX, 30% innovation, 20% business/traction) or that make Nexconn itself want to feature this submission. Do not expand scope beyond what's listed here.

## 0. Ground rules

- Fix bugs in the priority order given (P0 before P1 before P2). Re-run the full `dealguard_test_automation_prompt.md` suite, especially `golden-path-smoke.spec.ts`, after every fix — a fix that breaks the already-working Trust Shield or Hot-Lead Radar mechanics is a regression, not progress.
- Do not touch the classifier logic, the escalation threshold logic, or the two scripted demo beats' wording — those already work correctly and were verified false-positive-free against a benign message.
- Every fix must come with the failing case it addresses re-tested and confirmed fixed before moving to the next one.

## 1. P0 bug fixes — these directly cost completeness/UX score

### 1.1 Hot-Lead audio briefing never plays (highest priority — this is the hero demo beat)

**Root cause (confirmed):** `GET /api/audio/:id.wav` returns `200` with the full body even when the request carries a `Range: bytes=0-1023` header, and never sends `Accept-Ranges: bytes`. Chrome's native `<audio>` element requires range-request support to leave `readyState: HAVE_NOTHING` — this is why `audio.play()` hangs forever and the player shows `0:00 / 0:00` even though the file itself is valid (confirmed: a plain `fetch()` to the same URL returns `200`, `audio/wav`, correct byte length).

**Fix:**
- Implement proper HTTP range support on the audio route: parse the `Range` header, respond `206 Partial Content` with `Content-Range`, `Accept-Ranges: bytes`, and the correct byte slice when a Range header is present; keep `200` + full body only when there's no Range header.
- If serving from disk, prefer `res.sendFile()` (Express handles ranges natively) or a dedicated static/stream middleware over manually buffering the whole file into `res.send()`.
- If the audio is generated and cached in memory/Blob storage rather than disk, wrap it in a tiny range-aware handler (read `Content-Length`, slice the buffer per the requested range, set `Content-Range: bytes start-end/total`).
- **Verify fix:** reload `/agent-radar` after a Hot-Lead trigger, click Play, confirm `audio.readyState` reaches `4 (HAVE_ENOUGH_DATA)` and `currentTime` advances. Also re-test with a manual `curl -H "Range: bytes=0-1023" .../api/audio/x.wav -D -` and confirm a `206` response with `Content-Range` in the headers.

### 1.2 Chat transcript shows the wrong seller's name/content on every listing except Priya Patel's own two

**Root cause (confirmed):** the seeded demo conversation is one hardcoded transcript (Alex Chen ↔ Priya Patel, discussing Priya's own property/HOA/parking) reused verbatim for every listing regardless of its actual seller. Opening "Cedarwood Modern Villa" (seller: Elena Rostova) shows the correct header but Priya Patel's dialogue underneath.

**Fix:**
- Key the seed conversation generator by `listingId` (or `sellerId` + `listingId`), not a single global template. Each listing needs its own buyer/seller message set that references that listing's own name/amenities and that listing's actual seller name.
- Write one seed template per listing (reuse the structure — buyer asks about viewing/price/amenity, seller answers — but substitute the real seller name and a real amenity pulled from that listing's own data) rather than one shared string.
- **Verify fix:** open all 4 listings' chats in sequence and confirm every message bubble's sender name matches that listing's actual seller, and every amenity mentioned in the dialogue actually appears in that listing's own description.

### 1.3 No mobile navigation — Agent Radar and Demo Script are unreachable on a phone

**Root cause (confirmed):** at a 390px viewport, the `Listings` / `Buyer↔Seller Chat` / `Agent Radar` / `Demo Script` nav buttons report `offsetParent: null` (hidden by a desktop-only breakpoint) with no replacement control; the header itself overflows (`scrollWidth 486 > clientWidth 390`).

**Fix:**
- Add a responsive mobile nav: a hamburger menu (or bottom tab bar) that surfaces all four destinations at narrow widths, using the same routes/handlers already wired to the desktop buttons.
- Make the role-switcher pill row horizontally scrollable (`overflow-x-auto`) instead of silently overflowing the viewport, or collapse it into a dropdown on mobile.
- **Verify fix:** at 390×844, confirm all four nav destinations are visible and tappable, and the header has no horizontal overflow.

## 2. P1 bug fixes — visible polish issues

### 2.1 Filter + search combination with zero matches shows a blank page

**Fix:** when the listings array is empty after applying both the category filter and the search term, render an explicit empty state ("No properties match 'X' in this category — try clearing a filter") instead of nothing.

### 2.2 Chat view doesn't auto-scroll to the latest message after returning from Agent Radar / "Take Over Conversation"

**Fix:** on mount (and whenever a new message/system notice is appended), scroll the message list container to its bottom (`scrollTop = scrollHeight`), matching the behavior every real chat UI has.

### 2.3 Unknown routes silently fall back to the homepage

**Fix:** low priority — add a minimal "page not found, back to Listings" state for unmatched routes instead of a silent redirect. Skip this one first if time is short; it was the lowest-severity finding.

## 3. Optimization pass — make this the submission Nexconn wants to feature

These aren't bug fixes; they're the difference between "technically meets the bar" and "the team building the SDK wants to screenshot this." Do these after section 1 is fully verified, in this order:

### 3.1 Surface more of the Nexconn SDK, visibly

Right now the differentiators (Trust Shield, Hot-Lead Radar) are custom logic riding on top of the SDK — good — but make sure the judging-visible UI also clearly shows native Nexconn chat features working, not just your own AI layer:
- Read receipts / delivery status on sent messages (ChatUI usually exposes this — confirm it's switched on, not hidden by custom styling).
- A typing indicator while the "seller" is composing a reply.
- Message history correctly persists and reloads on refresh (confirms real backend-synced channels, not client-only state).
This matters because judges and Nexconn specifically credit "real, measurable SDK usage" — a submission that visibly uses more of the SDK surface (not just send/receive) reads as a deeper, more serious integration.

### 3.2 Perceived-latency polish around the AI classifier

Add a subtle "Guardian Copilot analyzing…" indicator (a small pulsing dot or label near the message) while the classifier call for that message is in flight, even if it usually resolves in under a second. Without it, a slower network during the actual judging session could make the Trust Shield badge's appearance feel like nothing is happening rather than like the system is working. This is cheap to add and meaningfully reduces "is this broken?" risk during live viewing.

### 3.3 Graceful degradation if Groq or Nexconn hiccups during judging

Wrap the classifier call and the escalation/TTS call in error handling that fails safe: if Groq times out or errors, the message still sends normally (just unclassified, no badge) rather than the whole send action failing; if the TTS call fails, still post the system escalation message and the written briefing text, just without an audio attachment, rather than losing the whole escalation. Judges seeing a single missing badge is fine; judges seeing a crashed chat is not.

### 3.4 README written for a Nexconn reviewer, not just future-you

Rewrite `README.md` to explicitly list, near the top: which Nexconn SDK packages are used (`@nexconn/chatui`, `@nexconn/engine`, `@nexconn/chat`), which channel types (Direct + Group), which server APIs (access-token issuance, group channel creation, server-side message posting), and the one-line pitch ("every chat deal dies a scam or a missed moment — Guardian Copilot watches for both"). A reviewer skimming the repo for 90 seconds should immediately see real SDK depth, not have to dig for it.

### 3.5 A respectful, well-filed SDK feedback issue (optional, high goodwill value)

If the Day-1 spike or this fix pass surfaced any genuine friction with the Nexconn SDK/docs (e.g. anything unclear about the audio/range handling, token signing, or ChatUI custom-element mounting), file one clean issue on `NexconnAI-Dev/hackathon` using their support template (current behavior, integration package, logs/screenshots). Nexconn explicitly checks issues multiple times a day during the challenge — a clear, useful bug report or doc clarification from a hackathon participant is exactly the kind of engagement that makes a team notice a submission, separate from the judging score itself. Do not fabricate an issue if nothing genuine came up.

### 3.6 Traction checklist (do this in parallel with the fixes, not after)

- Share the live (fixed) app link with real external contacts now, so there's time for genuine Nexconn-measured MAU to accumulate before Nov 22.
- Capture Nexconn Console analytics screenshots once there's real traffic, for the write-up's traction section and the bonus category.

## 4. Final verification before resubmission

- [ ] Re-run `dealguard_test_automation_prompt.md`'s full suite, especially `golden-path-smoke.spec.ts` — both demo beats must still pass end to end.
- [ ] Audio briefing plays fully in a real browser (not just `fetch()` succeeding) — confirmed via `audio.readyState === 4` and advancing `currentTime`.
- [ ] All 4 listings' chats show the correct seller's name and listing-appropriate content.
- [ ] Mobile viewport (390×844) can reach all four nav destinations.
- [ ] Filter+search zero-match case shows a message, not a blank page.
- [ ] Chat auto-scrolls to the latest message on every entry/update.
- [ ] README leads with the Nexconn SDK usage summary and the one-line pitch.
- [ ] No console errors, no failed network requests, across the full re-test pass (this was already clean before the fixes — keep it that way).
- [ ] Fresh screenshots/recording of the two demo beats taken AFTER these fixes, not reused from before — the audio fix especially changes what the video should show.
