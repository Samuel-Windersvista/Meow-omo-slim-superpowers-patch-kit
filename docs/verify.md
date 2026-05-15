# Verify

## Static checks

- `superpowers` is in your OpenCode plugin list.
- The patched local OMO Slim path is in your OpenCode plugin list.
- Prompt bridge files are present at `~/.config/opencode/oh-my-opencode-slim/superpowers-bridge/`.
- Your OMO Slim config loads the `superpowers-bridge` preset.
- Your local OMO Slim checkout was built after applying patches: `bun install`, then `bun run build`.
- `bun run build` cleans `dist/` before emitting new files.

## Agent availability

Confirm these agents are available: `orchestrator`, `orchestrator-beta`, `fixer`, `oracle`, `explorer`, `librarian`, `designer`, `observer`, and `council`。

`orchestrator-delta` appears only if you installed the optional `opencode-config/` best-of-N example setup.

`councillor` is internal-only for the council flow and does not require a separate published prompt bridge.

## Skill checks

Expected behavior:

- `@fixer` can access `test-driven-development`, `systematic-debugging`, and `verification-before-completion`.
- `@oracle` can access `systematic-debugging` only among the listed Superpowers review/debug skills.
- `@orchestrator`, `@orchestrator-beta`, and `@orchestrator-delta` can access reserved orchestrator-only skills.
- Non-root agents such as `@fixer`, `@oracle`, and `@wildcard` cannot access reserved orchestrator-only skills.

Concrete probes:

```text
@fixer use verification-before-completion and tell me what must be checked before claiming done
  （预期：允许 -- fixer 可访问验证技能）
@fixer use writing-plans to draft a plan for this repo
  （预期：拒绝 -- writing-plans 是 orchestrator 专属技能）
@oracle use systematic-debugging to investigate a suspected bug
  （预期：允许 -- oracle 可访问调试技能）
@oracle use subagent-driven-development to delegate implementation
  （预期：拒绝 -- oracle 是 Tier-3 只读代理，不能委派子代理）
@orchestrator-delta use best-of-n-with-judge and summarize the phases without starting a fan-out
  （预期：允许 -- delta 继承 orchestrator 的保留技能访问权）
@fixer use best-of-n-with-judge
  （预期：拒绝 -- fixer 不在保留技能允许列表中）
```

## MCP checks

- Operator-class agents can still access allowed custom MCPs.
- Non-operator agents cannot access restricted MCPs (`windows-mcp`, `chrome-devtools`, `playwright`).
- OMO-managed MCP restrictions do not affect user custom MCPs.

## Orchestrator pivot checks

Final behavior:

- literal `orchestrator` is the only automatic pivot source
- `orchestrator-beta` is the only automatic pivot target and fallback-enforcing root
- `orchestrator-delta` is manual-only and does not force child fallback

Unit/static check in the patched OMO Slim checkout:

```bash
bun test src/utils/orchestrator-identity.test.ts   src/config/orchestrator-only-skills.test.ts   src/hooks/foreground-fallback/index.test.ts   src/index.test.ts   src/utils/session.test.ts
```

Runtime probes:

```text
# Probe 1: literal orchestrator retry pivots root
@orchestrator -> hit a real retryable Anthropic quota/overload event
# Expected: replay uses @orchestrator-beta on gauge-forge-openai/gpt-5.4

# Probe 2: beta active -> child preroute fires
@orchestrator-beta -> dispatch @librarian short task
# Expected: spawned as @librarian__task_fallback when librarian is Anthropic-primary with a backup model

# Probe 3: resumed Claude child blocked in beta mode
@orchestrator-beta -> dispatch @librarian with task_id pointing at a previous opus-shaped librarian session
# Expected: tool error instructs a fresh task without task_id

# Probe 4: delta is manual-only
@orchestrator-delta -> dispatch @librarian short task
# Expected: no forced rewrite solely because the root is delta
```

## Build cleanliness check

```bash
bun test scripts/build-cleanliness.test.ts
```

Expected: the test creates a stale declaration for a removed hook, runs `bun run build`, and confirms the stale declaration is gone.

## Optional Best-of-N checks

Only run these if you installed the optional `opencode-config/` example setup:

- Dispatch all variant agents through the task tool.
- Dispatch utility agents `scout`, `validator`, `gist`, and `wildcard`.
- Confirm variants inherit base Superpowers policy.
- Load `best-of-n-with-judge` from a root orchestrator without starting a fan-out.
