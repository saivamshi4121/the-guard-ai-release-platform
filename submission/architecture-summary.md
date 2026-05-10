# Architecture summary

## Topology

Monorepo (**pnpm** workspaces + **Turbo**):

- **Apps** — `runner` (batch eval), `regression-runner` (gate CLI), `web` (dashboard).
- **Packages** — `contracts`, `db`, `llm`, `eval`, `hallucination`, `regression`, `benchmark`, `reports`.

## Data path

1. **Dataset case** → task builds `(system, prompt)` → provider `generate()`.
2. **Scorers** compute structured scores + optional hallucination traces.
3. **Prisma** persists runs, outputs, scores, traces, regression rows.
4. **Regression engine** reads paired runs, runs bootstrap stats, emits verdict.
5. **Dashboard / CI** consume Prisma or exported JSON/Markdown.

## Safeguards (runner)

- **`SAFE_MODELS`** — allowlist.
- **`MAX_*_TOKENS`** — input truncation + output cap.
- **`MAX_CASES_PER_RUN`**, **`MAX_PARALLEL_EVALS`** — throttle workload.
- **`MAX_RUN_COST_USD`**, **`MAX_DAILY_COST_USD`** — cost guards with persistence hooks for violations.

## Replay vs live

| Mode | Provider | Cost |
|------|----------|------|
| `ENABLE_DEMO_MODE=true` | `DemoDataProvider` reads `reports/demo/demo-snapshots.json` | ~$0 |
| Live | OpenAI / Google SDKs | Metered by tokens × pricing metadata |

## Persistence

- **Prisma** + **Postgres** (works with Supabase or any Postgres via `DATABASE_URL`).
- Web app uses the same ORM for read paths when configured.

## Dashboard behavior

- **With `DATABASE_URL`:** live panels (e.g. latest runs) query Postgres.
- **Without:** static/demo-friendly fallbacks so `next build` does not require secrets.

See root [`README.md`](../README.md) for diagrams and package-level tradeoffs.
