# Architecture

## Layer 1: OpenCode native

OpenCode provides the base session model, child sessions, agents, tools, and MCP runtime.

## Layer 2: OMO Slim

OMO Slim provides specialist agents, model routing, lane specialization, and prompt-bridge behavior.

## Layer 3: Superpowers

Superpowers provides the workflow/controller layer:

- brainstorming
- planning
- implementation discipline
- review loops
- verification
- completion flow

## Cooperation model

- Superpowers remains the director
- OMO Slim provides the worker seats
- the plugin snippet intentionally disables OpenCode's default `general` and `explore` lanes to avoid duplicate/default lane competition
- only Superpowers skills are selectively restricted
- only OMO-managed MCPs are selectively restricted
- all other custom skills and MCPs remain available

Within the council/councillor area, `councillor` is an internal-only worker used by the council flow rather than a normal user-facing agent lane. It intentionally keeps OMO Slim's internal/upstream council prompt behavior, so this patch kit does not publish a separate `councillor` prompt bridge file.

Patches mainly constrain Layer 2 worker behavior, prompt bridges connect Layer 2 seats to Layer 3 workflow rules, and config templates pin the Layer 1+2 wiring that makes the stack reproducible.

## Optional: Best-of-N support (patch 0003 + `opencode-config/`)

The kit's optional best-of-N extension introduces 20 additional sub-agents on top of the base 9 (orchestrator + 8 specialists):

- **16 variant agents**: 4 each of `fixer`, `oracle`, `designer` + 2 each of `explorer`, `librarian`. Each variant runs the same base prompt as its parent agent but with a different model and reasoning effort. They exist for parallel candidate generation in best-of-N fan-out.

- **4 utility agents**: `scout` (narrow file lookup), `validator` (format check), `gist` (3-line summarizer), `wildcard` (divergent ideation noise). These are NOT in the best-of-N pool — they are independent latency-optimized roles for narrow tasks and brainstorming Phase 4 ideation injection.

### Registration mechanism

All 20 are registered as **OMO Slim custom agents** via `oh-my-opencode-slim.jsonc` `presets.superpowers-bridge.<name>` entries (same code path as the user-defined `laborer` agent — `getCustomAgentNames()` discovers unknown keys and `buildCustomAgentDefinition()` registers them). No opencode-native `agent` block entries are needed (and adding them would shallow-replace OMO's synthesized permissions).

### Suffix-stripping policy resolution

Patch 0003 modifies `src/cli/superpowers-policy.ts` and `src/cli/skills.ts` to add `resolveBaseAgentName()`:

```
"fixer-alpha" -> "fixer"   (suffix stripped, inherits fixer policy)
"oracle-gamma" -> "oracle"  (suffix stripped, inherits oracle policy)
"validator"   -> "validator" (already in map, explicit policy)
"scout"       -> "scout"     (already in map, empty allowed)
```

Without this patch, suffixed names would not be in the `AGENT_ALLOWED_SUPERPOWERS` map and would silently lose access to their base agent's superpowers (e.g., `fixer-alpha` would lose `test-driven-development`). The patch keeps inheritance automatic — adding a new variant requires zero code changes.

### Behavioral contract layering

For each best-of-N agent:

| Field | Source | Why |
|---|---|---|
| `model`, `variant`, `mcps`, `orchestratorPrompt` | `oh-my-opencode-slim.jsonc` | OMO Slim manages these; preset switching applies |
| `permission`, `hidden`, `mode`, `temperature`, `description`, `prompt` (file ref) | markdown in `~/.config/opencode/agents/<name>.md` | OpenCode-native fields OMO Slim does not manage |
| Superpowers skill policy | `src/cli/superpowers-policy.ts` (auto via suffix resolution) | inheritance from base |
| Non-OMO MCP permissions | preserved by default | OMO only synthesizes managed MCP rules |
| Non-superpowers skills | preserved by default (`*: allow` overlay) | only superpowers names get explicit deny |

### Best-of-n-with-judge skill

A separate user-level skill (in `opencode-config/skills/best-of-n-with-judge/`) orchestrates fan-out: pre-flight verification, git worktree setup, parallel candidate dispatch, hard-gate filter, blind oracle review, vote aggregation, council arbitration on splits, redo loop on no-winner, winner landing via cherry-pick or squash, and unconditional cleanup. See the skill's `SKILL.md` for full pipeline details.

## Orchestrator prefix matching (patch 0004, v1.2.0)

OMO Slim originally hardcoded the literal string `'orchestrator'` in four runtime sites:

1. `src/cli/superpowers-policy.ts` `getAllowedSuperpowersSkillsForAgent` — orchestrator gets the full superpowers allowlist
2. `src/agents/index.ts` `applyClassification` — orchestrator alone gets `mode = 'primary'`
3. `src/index.ts` post-file-tool nudge hook — fires only for the literal orchestrator session
4. `src/index.ts` chat.system.transform hook — injects the orchestrator bridge prompt only for the literal orchestrator session

Patch 0004 introduces a small helper `isOrchestratorAgent(name)` that returns `true` for any name starting with `orchestrator` (literal, dash-suffix variants like `orchestrator-beta`, no-separator variants like `orchestrator2`, etc.) and replaces all four equality checks with the helper.

### Why a fallback orchestrator matters

Anthropic API has 5-hour rolling rate limits per model. When a primary orchestrator running on (e.g.) `claude-opus-4-7` exhausts its quota, the entire session stalls until the cooldown clears. With patch 0004, you can register a second orchestrator (e.g. `orchestrator-beta` running on a vendor-diverse model like `gpt-5.4 + xhigh`) as a peer primary agent. Switching to it from the OpenCode agent picker resumes work immediately — the bridge prompt, MCPs, permissions, and superpowers allowlist all auto-inherit from the literal orchestrator.

### Behavioral inheritance for `orchestrator-*` variants

| Field | Source | How it flows to `orchestrator-beta` |
|---|---|---|
| Bridge prompt | Resolved at runtime from the literal orchestrator definition (`agentDefs.find(a => a.name === 'orchestrator')`) | Hook unchanged; `isOrchestratorAgent()` gate widened |
| `mode = 'primary'` | `applyClassification` switch in `src/agents/index.ts` | Generalized via `isOrchestratorAgent()` |
| Superpowers allowlist | `getAllowedSuperpowersSkillsForAgent` policy | Generalized via `isOrchestratorAgent()` |
| `permission` (`question: allow`, `council_session: deny`, `skill: { ... }`) | `applyDefaultPermissions` runs on every custom agent (existing path) | No change; auto-inherited |
| `mcps` | OMO Slim resolves from the agent's preset entry; copying `["*", "!context7"]` from `orchestrator` to `orchestrator-beta` mirrors behavior | User-supplied in `oh-my-opencode-slim.jsonc` |
| `model`, `variant` | User-supplied in `oh-my-opencode-slim.jsonc` | The whole point — this is what you change |

Adding a new orchestrator-shaped agent is therefore purely a configuration change: a single jsonc entry with `model` + `mcps`, and (optionally) an `agents/<name>.md` markdown for OpenCode-native fields like `description` or `displayName`.
