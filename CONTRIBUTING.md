# Contributing to DealGuard

Thank you for considering contributing to **DealGuard**! We welcome bug reports, documentation improvements, test additions, and pull requests.

## Getting Started

1. Fork the repository and clone your fork locally.
2. Ensure you are running **Node.js 22+** and **npm 10+**.
3. Install dependencies and configure your environment:
   ```bash
   npm install
   cp .env.example .env
   ```
4. Start the full-stack development server (Express + Vite on port `3000`):
   ```bash
   npm run dev
   ```

## Development Workflow

- Create a focused branch from `main` (for example: `feat/escrow-checklist` or `fix/audio-range-header`).
- Keep commits clear and scoped using Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- Never commit real API keys, `.env` files, or personal data. All seeded listings and personas must remain synthetic.

## Quality Checks (Required Before Opening a PR)

Run all four verification commands locally and ensure they pass cleanly:

```bash
# 1. TypeScript type-checking
npm run lint

# 2. Unit, integration, and security tests (requires dev server running on port 3000 for integration tests)
npm test

# 3. PII & secret leak scanner
npm run scan:pii

# 4. Production Vite bundle check
npm run build
```

## Coding Guidelines

- **TypeScript**: Maintain strict type safety across `src/` and `server/`. Avoid unused imports or `any` where concrete types exist.
- **Styling**: Use Tailwind CSS utility classes consistent with DealGuard's warm-dark glass palette (`#0B0806` canvas, `#FCFCFB` text, `#D7EF5A` lime accent, `#E5484D` danger state, Inter Tight typography).
- **AI Safety Rules**: Any change to `server/classifier.ts` must preserve per-message `trust_flag` scoping (scam flags must never bleed onto subsequent benign turns) and enforce strict per-request timeouts.

## Reporting Bugs or Security Issues

- For bugs or feature ideas, open a GitHub Issue with reproduction steps, expected vs. actual behavior, and relevant logs.
- For potential security vulnerabilities (such as leaked credentials or unsafe input handling), please avoid posting exploit details publicly and contact the repository maintainer directly.
