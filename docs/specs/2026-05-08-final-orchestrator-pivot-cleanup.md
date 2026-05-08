# Final Orchestrator Pivot Cleanup Design

Date: 2026-05-08
Patch: `0007-final-orchestrator-pivot-cleanup.patch`

## Problem

The final public behavior separates three concepts that were mixed during implementation: automatic root retry pivot, manual GPT root selection, and child task fallback enforcement.

## Final contract

- Automatic retry pivot is exactly `orchestrator` -> `orchestrator-beta`.
- `orchestrator-beta` is the only fallback-enforcing root identity.
- `orchestrator-delta` is a manual GPT root only.
- Reserved orchestrator-only skills allow `orchestrator`, `orchestrator-beta`, and `orchestrator-delta`.
- Temporary debug/probe commands are not supported public knobs.
- Build output is cleaned before rebuild so deleted source surfaces cannot survive as stale `dist/` artifacts.

## Root identity matrix

| Root | Purpose | Pivot source | Pivot target | Child fallback enforcement | Reserved root skills |
|---|---|---:|---:|---:|---:|
| `orchestrator` | Anthropic-primary controller | yes | no | no | yes |
| `orchestrator-beta` | automatic GPT fallback root | no | yes | yes | yes |
| `orchestrator-delta` | manual GPT root | no | no | no | yes |

## Source changes

- `src/utils/orchestrator-identity.ts` keeps `isPivotedRootAgent()` strict to `orchestrator-beta`.
- `src/agents/preroute-decision.ts` uses `isPivotedRootAgent(rootAgent)` for child task rewrite/block decisions.
- `src/hooks/foreground-fallback/index.ts` pivots only literal `orchestrator` sessions and sets session identity to `orchestrator-beta` after replay.
- `src/config/orchestrator-only-skills.ts` adds `orchestrator-delta` to the reserved skill allowlist.
- `package.json` runs `clean:dist` before `build`.
- `scripts/clean-dist.ts` deletes `dist/` before emit.
- `scripts/build-cleanliness.test.ts` proves stale removed hook declarations do not survive rebuild.

## Acceptance checks

- Identity helper tests prove delta is neither primary nor pivoted.
- Foreground fallback tests prove literal orchestrator pivots to beta and beta does not repivot.
- Plugin integration test proves child pre-route sees beta after root pivot.
- Reserved-skill tests prove delta is allowed while non-root workers remain denied.
- Build-cleanliness test proves deleted debug hook artifacts are removed from `dist/`.
