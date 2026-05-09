# Contributing

## Principles
- Keep the architecture **explicit** and **operationally boring** (no framework-heavy abstractions).
- Prefer deterministic scoring and evidence capture; add LLM-judge features only behind explicit flags.
- Treat cost and demo safety as production concerns.

## Development setup
```bash
pnpm -w install
pnpm -w typecheck
```

## Demo-safe workflow
```bash
pnpm -w demo:seed
ENABLE_DEMO_MODE=true pnpm -C apps/runner dev
```

## Code style
- TypeScript strict mode
- Keep module boundaries clean between `packages/*` and `apps/*`

## Pull requests
- Include a short summary + test plan
- Do not commit `.env*` (except `.env.example`)
- Do not commit real keys/URLs

