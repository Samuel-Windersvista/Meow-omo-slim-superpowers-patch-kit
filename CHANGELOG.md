# Changelog

## 2026-05-05 — v1.2.0

- Added **orchestrator prefix matching** (patch `0004-orchestrator-prefix-matching.patch`):
  - New exported helper `isOrchestratorAgent(name)` in `src/cli/superpowers-policy.ts` returns `true` for any agent name starting with `orchestrator` (literal `orchestrator`, dash-suffix variants like `orchestrator-beta`, no-separator variants like `orchestrator2`).
  - All four hardcoded `agentName === 'orchestrator'` string-equality sites in OMO Slim are generalized to use `isOrchestratorAgent()`:
    - `src/cli/superpowers-policy.ts` `getAllowedSuperpowersSkillsForAgent` — orchestrator-shaped agents get the full superpowers allowlist
    - `src/agents/index.ts` `applyClassification` — orchestrator-shaped agents get `mode = 'primary'` (visible in OpenCode's primary agent picker)
    - `src/index.ts` post-file-tool nudge hook — fires for any orchestrator-shaped session
    - `src/index.ts` chat.system.transform hook — injects the literal orchestrator's bridge prompt into every orchestrator-shaped session, so variants behave identically
  - Use case: define a fallback primary orchestrator (e.g. `orchestrator-beta` on a different model) so users can switch agents from the OpenCode picker when their main orchestrator's model rate-limits, without re-running the entire 5-hour cooldown clock.
  - Permissions, MCPs, and prompts auto-inherit from `applyDefaultPermissions` (custom-agent path) and the runtime hook respectively — no per-variant configuration required beyond `model` + (optional) `mcps`.
  - 5 new tests in `src/cli/superpowers-policy.test.ts` covering literal/dash-suffix/no-separator-suffix matches and negative cases (mid-name `orchestrator` substrings do NOT match).
- Updated `snapshots/oh-my-opencode-slim/src/cli/{superpowers-policy.ts,superpowers-policy.test.ts}`, `src/agents/index.ts` (NEW snapshot — was missing in v1.1.0), and `src/index.ts` to post-0004 state.
- Updated `README.md`, `COMPATIBILITY.md`, `docs/architecture.md`, `docs/install.md`, `docs/verify.md` with patch-0004 install/verify guidance.
- Patch 0004 is **recommended for all installations** (not opt-in like 0003): the change is purely a generalization of an existing string equality and does not alter behavior for the literal `orchestrator` agent. Skip only if you intentionally need orchestrator-shaped names (e.g., `orchestrator-something`) to NOT be treated as orchestrators.

## 2026-05-04

- Added optional **best-of-N + fast-lane extension**:
  - New patch `0003-best-of-n-agent-name-resolution.patch`: adds `resolveBaseAgentName()` suffix-stripping in `src/cli/superpowers-policy.ts` and `src/cli/skills.ts` so variant agents (`fixer-alpha`, `oracle-gamma`, etc.) inherit base agent superpowers policy automatically. Adds explicit policy entries for `scout`, `validator`, `gist`, `wildcard` utility agents.
  - New `opencode-config/` subtree: optional example mirror of the maintainer's full setup, containing 20 agent markdown files (16 variants + 4 utility), 5 shared base prompt files, the `best-of-n-with-judge` skill (SKILL.md + 3 prompt templates), and design/plan docs.
  - Updated `config-templates/oh-my-opencode-slim.superpowers-bridge.jsonc`: 20 new agent entries with model + variant + orchestratorPrompt for the best-of-N + utility agents.
  - Updated `prompt-bridges/oracle_append.md`: new "Multi-candidate review (best-of-N mode)" section teaching oracle the verdict format.
  - Updated `prompt-bridges/orchestrator_append.md`: new "Best-of-N awareness" section teaching the controller when to invoke the skill.
  - Updated `snapshots/oh-my-opencode-slim/src/cli/superpowers-policy.ts` and `snapshots/oh-my-opencode-slim/src/cli/skills.ts` to reflect post-patch-0003 state.
  - Updated `README.md`, `docs/architecture.md`, `docs/install.md`, `docs/verify.md` with optional best-of-N install/verify guidance.
- Best-of-N is opt-in. The base patch kit (patches 0001 + 0002 + bridges + base agent templates) works without applying patch 0003 or copying `opencode-config/`.

## 2026-04-22

- Initial public patch-kit repository setup
- Added baseline project metadata and compatibility notes for the validated local `superpowers + oh-my-opencode-slim` integration
