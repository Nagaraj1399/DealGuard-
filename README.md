# DealGuard — Guardian Copilot for Real-Estate Deals

> **"Every chat deal dies a scam or a missed moment — Guardian Copilot watches for both."**

**DealGuard** is a real-estate chat marketplace built for the **Nexconn Build Challenge 2026**. It embeds an autonomous AI protection layer (**Guardian Copilot**) inside buyer↔seller conversations to stop P2P advance-fee scams in real time and escalate hot or at-risk leads with spoken audio briefings to human brokers.

---

## ⚡ Nexconn SDK Integration Summary (At a Glance)

- **Packages Used**: `@nexconn/chatui`, `@nexconn/engine`, `@nexconn/chat`
- **Channel Types**:
  - `DirectChannel`: Per-listing encrypted buyer↔seller channels (`channel_alex_priya`, `channel_listing_2`, `channel_listing_3`, `channel_listing_4`) with delivery/read receipts and live typing presence.
  - `GroupChannel`: Priority broker escalation channel (`channel_agent_group`) receiving proactive AI voice briefings and takeover actions.
- **Server APIs Wired**:
  - **Access-Token Issuance**: `POST /api/nexconn/token` → signs and issues Nexconn user tokens via `POST /v4/auth/access-token/issue` (`App-Key`, `Nonce`, `Timestamp`, signature with `NEXCONN_APP_SECRET`, with automatic sandbox token fallback for local evaluation).
  - **Server-Side Message Inspection & Group Dispatch**: `POST /api/channels/:channelId/messages` evaluates every turn via Guardian Copilot (Groq Llama-3.3 / Gemini 2.5 Flash) and automatically dispatches system notices + synthesized WAV briefings (`GET /api/audio/:id.wav` with full HTTP `206 Partial Content` byte-range streaming) to `channel_agent_group`.

---

## 🌟 Core Capabilities

1. **Trust Shield (Live Scam Flagging)**: Inspects every buyer↔seller turn and renders an immediate red warning pill on the message bubble whenever advance deposits, unverified UPI/crypto/wire transfers, or off-platform coercion are detected.
2. **Hot-Lead Radar & Spoken Audio Briefings**: Evaluates buyer commitment (`lead_score`) and disengagement risk (`risk_of_loss`) on every message. When either exceeds `80%`, Guardian Copilot posts an in-channel broker alert, synthesizes a spoken WAV briefing with full browser range-request playback, and queues the conversation in **Agent Radar** (`/agent-radar`) for 1-click **Take Over Conversation**.
3. **Per-Listing Channels & Role Switcher**: 4 synthetic architectural listings with dedicated buyer↔seller conversations (`Priya Patel`, `Elena Rostova`, `Marcus Vance`), persistent backend message history, and instant role switching between Buyer, Sellers, and Senior Broker (`Sarah Jenkins`).

---

## 🔑 How to Configure Nexconn Credentials

1. Visit [Nexconn Console](https://console.nexconn.ai), create an app (e.g., `DealGuard-2026`), and copy your **App Key** and **App Secret**.
2. Copy `.env.example` to `.env`:

```env
# Nexconn Chat SDK credentials
NEXCONN_APP_KEY=your_nexconn_app_key
NEXCONN_APP_SECRET=your_nexconn_app_secret
NEXCONN_API_HOST=https://api.us-east-1.nexconn.ai

# Optional AI Engines (falls back cleanly to Gemini Flash / deterministic rules)
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key

# Storage
DATABASE_URL=file:./dev.db
```

---

## 🎬 Scripted Demo Beats

Run `npm run seed:demo` to reset synthetic data and view the two demo beats:

1. **Beat 1 — Trust Shield Scam Detection**:
   - Send: `"Please transfer the booking amount to this UPI ID before I show you the flat"`
   - Result: Instant red **Trust Shield Warning** badge attached directly to the message bubble with fraud reasoning.
2. **Beat 2 — Hot-Lead Radar & Audio Briefing**:
   - Send: `"ok nvm I'll look elsewhere"`
   - Result: In-channel broker escalation notice + synthesized WAV audio briefing in **Agent Radar** (`/agent-radar`) ready for instant playback and 1-click broker takeover.

---

## 🛠️ Development, Build & Tests

```bash
# Install dependencies
npm install

# Start full-stack dev server (Express + Vite on Port 3000)
npm run dev

# Run TypeScript check
npm run lint

# Run unit, integration, and PII/secret security tests
npm test

# Build production bundle
npm run build
```

All property listings, addresses, and user profiles in this repository are synthetic.
