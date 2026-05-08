# Final Orchestrator Pivot Cleanup Plan

Date: 2026-05-08
Patch: `0007-final-orchestrator-pivot-cleanup.patch`

## Tasks

1. Remove temporary debug/probe command surfaces from final public behavior.
2. Keep automatic root retry pivot as `orchestrator` -> `orchestrator-beta` only.
3. Keep child task fallback enforcement gated only on root identity `orchestrator-beta`.
4. Add `orchestrator-delta` as a manual GPT root in config templates.
5. Add `orchestrator-delta` to reserved orchestrator-only skill access.
6. Add clean-build support so stale deleted `dist/` artifacts cannot survive rebuilds.
7. Publish incremental patch 0007.
8. Sync snapshots for changed source, tests, scripts, package file, and final config template.
9. Update public docs to describe the final contract and remove abandoned debug guidance.

## Verification

Run in the patched OMO Slim checkout:

```bash
bun test src/utils/orchestrator-identity.test.ts   src/config/orchestrator-only-skills.test.ts   src/hooks/foreground-fallback/index.test.ts   src/index.test.ts   src/utils/session.test.ts   scripts/build-cleanliness.test.ts
```

Run in the patch-kit repo:

```bash
git apply --check patches/oh-my-opencode-slim/0007-final-orchestrator-pivot-cleanup.patch
```

Inspect docs for absence of current guidance referencing removed debug/probe commands.
