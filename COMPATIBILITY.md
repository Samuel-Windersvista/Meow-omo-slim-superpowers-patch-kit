# Compatibility

## Validated versions

This patch kit is currently validated against:

- `superpowers v5.1.0`
- `oh-my-opencode-slim v2.0.0`

## What to check when versions differ

If your versions differ from the validated ones:

### oh-my-opencode-slim version drift

Key files to compare:
- `src/index.ts` (main entry point — most likely to change between versions)
- `src/agents/index.ts` (agent config building)
- `src/cli/skills.ts` (skill permission hook)
- `src/config/agent-mcps.ts` (MCP gating)
- `src/hooks/foreground-fallback/index.ts` (fallback + cooldown integration)
- `src/agents/*.ts` (individual agent factories — unlikely to change)

### superpowers version drift

- Skill names referenced in permission allowlists (`src/cli/superpowers-policy.ts`) should be verified against your superpowers skill inventory
- The orchestrator-only skill list (`best-of-n-with-judge`, `update-memory`) in `src/config/orchestrator-only-skills.ts` should be checked
- Prompt bridge instructions that reference specific superpowers skills should be verified for accuracy

### Key differences from v1.1.1

- `subtask` tool is removed in v2.0.0; superpowers skills never referenced it
- `grep_app` MCP is renamed to `gh_grep` in v2.0.0
- `sessionManager` config key is renamed to `backgroundJobs`
- `cancel_task` is a new plugin tool in v2.0.0 (restricted to orchestrator)
- Background orchestration uses OpenCode native `task(background=true)` and synthetic message injection
- Requires `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true` environment variable
