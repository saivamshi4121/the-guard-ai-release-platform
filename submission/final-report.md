# Final report — The Guard

## Summary

The Guard is a **TypeScript monorepo** that operationalizes LLM release safety: **dataset-driven evaluations**, **deterministic-first hallucination tracing**, **paired statistical regression** (bootstrap confidence intervals and p-values), **GO/NO_GO/INCONCLUSIVE** decisions with persisted artifacts, and a **Next.js dashboard** for operational review.

## What shipped

- **Eval runner (`apps/runner`)** — Executes tasks (`deal_copy_v1`, `support_reply_v1`), enforces token/cost/run-size guards, persists scores and traces via Prisma.
- **Regression runner (`apps/regression-runner`)** — Compares baseline vs candidate runs; exports JSON/Markdown; supports demo mode from on-disk reports.
- **Dashboard (`apps/web`)** — Release overview, regression routes, benchmarks, history; Prisma-backed sections when `DATABASE_URL` is configured.
- **Packages** — Explicit boundaries: `llm` (providers + replay), `eval` (tasks/scorers), `hallucination`, `regression`, `benchmark`, `reports`, `db`, `contracts`.

## Design stance

- **Boring modularity** over framework magic: reviewers can trace a case from dataset → prompt → scores → DB → report.
- **Cost and abuse controls are default-on** in the runner env schema (allowlist, token caps, concurrency caps, USD ceilings).
- **Deterministic replay** (`ENABLE_DEMO_MODE`) preserves demos and CI without API spend.

## Evidence for reviewers

- Root [`README.md`](../README.md) — full methodology, env matrix, diagrams, retrospective.
- [`reports/`](../reports/) — checked-in demo snapshots and regression artifacts.
- [`docs/screenshots/`](../docs/screenshots/) — UI captures referenced from README.

## Operational caveat

This is **infrastructure-shaped** software: production hardening would add auth, queues, and fleet-wide rollout orchestration—listed under “Future work” in the main README.
