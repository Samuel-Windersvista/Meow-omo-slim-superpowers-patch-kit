> **Note**: This file is a snapshot-style reference for the optional best-of-N + fast-lane setup. It documents the maintainer's specific config and is **not an installation target**. Use it as a reference, then adapt model assignments to your provider catalog.
>
> Installation steps are in [`../docs/install.md`](../docs/install.md).

---

# opencode user config

Personal OpenCode configuration: plugins, custom agents, skills, prompts.

## Layout

```text
.config/opencode/
├── opencode.json
├── oh-my-opencode-slim.jsonc
├── agents/
├── prompts/
├── skills/
├── superpowers/
├── oh-my-opencode-slim/
├── oh-my-opencode-slim-local/
├── plugins/
├── tools/
└── docs/plans/
```

## Best-of-N with Judge

This config installs `best-of-n-with-judge` for parallel candidate generation, blind oracle review, and winner selection on top of the standard Superpowers + OMO Slim flow.

Variant agents:

- `fixer-{alpha,beta,gamma}` — code candidate generators
- `fixer-delta` — deliberate naive-challenger lane
- `oracle-{alpha,beta,gamma,delta}` — blind reviewers
- `designer-{alpha,beta,gamma,delta}` — UI candidate generators
- `explorer-{alpha,beta}` — parallel reconnaissance
- `librarian-{alpha,beta}` — parallel docs research

Fast-lane utility agents:

- `@scout` — narrow file/code lookup
- `@validator` — format/syntax check
- `@gist` — 3-line file summarizer
- `@wildcard` — divergent ideation contributor for brainstorming only

## Root orchestrators

- `orchestrator` is Anthropic-primary and may automatically pivot on retry.
- `orchestrator-beta` is the only automatic pivot target and the only fallback-enforcing root identity for Claude child tasks.
- `orchestrator-delta` is a manual GPT root. It inherits root operator posture and reserved-skill access, but it does not force child fallback.

Reserved orchestrator-only skills are `best-of-n-with-judge` and `update-memory`. Only `orchestrator`, `orchestrator-beta`, and `orchestrator-delta` may invoke them.

## Worktree convention

Candidates land at `<main-repo>/.worktrees/bestofn-<slug>-<ts>/<variant>/`. Each candidate gets its own branch `bestofn/<slug>-<ts>/<variant>`. Cleanup is unconditional. State persists at `<main-repo>/.opencode/bestofn-state/<task-id>.json` until fan-out completes successfully, then is deleted.

## Model assignments

Variant and utility model assignments live centrally in `oh-my-opencode-slim.jsonc` under `presets.superpowers-bridge`. Each entry specifies `model`, optional `variant`, optional `mcps`, and an `orchestratorPrompt` teaching the controller when to dispatch it.

The markdown files in `agents/` carry OpenCode-native behavioral fields (`permission`, `hidden`, `mode`, `temperature`, `description`, `prompt`). OMO Slim does not manage these fields.

`opencode.json` `agent` block should not carry per-variant overrides, because those would shallow-replace OMO Slim's synthesized permissions.
