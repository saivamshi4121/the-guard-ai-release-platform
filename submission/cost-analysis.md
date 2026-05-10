# Cost analysis

All figures are **order-of-magnitude** for reviewer calibration unless tied to checked-in demo metadata.

## Demo / replay mode

| Item | Estimate |
|------|----------|
| Provider token spend | **$0** (no live API calls) |
| Infra | Local CPU + Postgres optional |

Replay uses [`reports/demo/demo-snapshots.json`](../reports/demo/demo-snapshots.json). Per-row `metadata.cost.totalCost` values are **estimated** (e.g. ~**$0.00029 USD** per call for sample rows) and marked `isEstimated: true`.

## Live eval run (single runner invocation)

Spend is bounded primarily by:

- `MAX_CASES_PER_RUN` (default **10**)
- `MAX_INPUT_TOKENS` / `MAX_OUTPUT_TOKENS`
- Model unit economics inside `packages/llm` pricing metadata

Hard stops:

- **`MAX_RUN_COST_USD`** (default **$1.00**) — ceiling for a single run’s estimated accumulate cost path.
- **`MAX_DAILY_COST_USD`** (default **$5.00**) — aggregate guard for shared keys.

## Regression analysis

Statistical comparison is **compute + DB** between two persisted run ids; no mandatory third-party inference spend beyond whatever produced the runs.

## Engineering / development cost

Implementation cost is dominated by **engineering time** (architecture, scoring, stats, UI, CI glue)—not API line items. Deterministic replay materially reduced token burn during iterative development and demo recording versus live-only iteration.

## Recommendation for reviewers

When reproducing live numbers, set conservative caps, use **`SAFE_MODELS`**, start with **`ENABLE_DEMO_MODE=true`**, then enable live keys only after validating dataset slice size.
