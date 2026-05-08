# OMO Permission Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the per-agent permission redesign (Approach D) defined in `docs/specs/2026-05-05-permission-redesign.md` — symmetric oracle family fully read-only, closed-set MCP blacklist, reserved orchestrator-only skill mechanism with `update-memory` placeholder.

**Architecture:** Three-layer overlay (OMO patch code → markdown agents → jsonc config). Patch code is the policy authority for skill/MCP gating; markdown frontmatter carries variant tool denies; jsonc carries explicit user overrides.

**Tech Stack:** TypeScript, `bun:test`, `@opencode-ai/plugin` SDK, `@opencode-ai/sdk/v2`.

**Working source:** `C:\Users\Administrator\.config\opencode\oh-my-opencode-slim-local\` (live plugin install — patch-kit snapshots sync from here after green).

---

## File Structure

### NEW source files (under `oh-my-opencode-slim-local\src\`)

```
src/config/agent-mcp-blacklist.ts            (closed-set MCP deny resolver)
src/config/agent-mcp-blacklist.test.ts       (unit tests)
src/config/orchestrator-only-skills.ts       (reserved skill list + checker)
src/config/orchestrator-only-skills.test.ts  (unit tests)
src/cli/agent-tier-policy.ts                 (tier 3 base names + non-SP default)
src/cli/agent-tier-policy.test.ts            (unit tests)
```

### MODIFIED source files

```
src/cli/superpowers-policy.ts        (oracle SP {DBG} only; fixer/designer + RCR)
src/cli/superpowers-policy.test.ts   (update assertions)
src/cli/custom-skills.ts             (simplify -> fixer only)
src/cli/skills.ts                    (use tier-policy for non-SP default; apply reserved skills)
src/cli/skills.test.ts               (lock new contract)
src/index.ts                         (emit restricted MCP denies in agent permission rule loop)
src/agents/index.test.ts             (integration tests for final permission output)
src/agents/oracle.ts                 (factory adds tool denies)
src/agents/explorer.ts               (factory adds tool denies)
src/agents/librarian.ts              (factory adds tool denies)
src/agents/observer.ts               (factory adds tool denies)
src/agents/council.ts                (factory adds tool denies)
src/agents/fixer.ts                  (factory adds task deny)
src/agents/designer.ts               (factory adds task deny)
```

### MODIFIED user/config files

```
~/.config/opencode/agents/oracle-alpha.md      (append write, todowrite to deny)
~/.config/opencode/agents/oracle-beta.md       (append write, todowrite)
~/.config/opencode/agents/oracle-gamma.md      (append write, todowrite)
~/.config/opencode/agents/oracle-delta.md      (append write, todowrite)
~/.config/opencode/agents/explorer-alpha.md    (append write, todowrite)
~/.config/opencode/agents/explorer-beta.md     (append write, todowrite)
~/.config/opencode/agents/librarian-alpha.md   (append write, todowrite)
~/.config/opencode/agents/librarian-beta.md    (append write, todowrite)
~/.config/opencode/agents/scout.md             (append write, todowrite)
~/.config/opencode/agents/validator.md         (append write, todowrite)
~/.config/opencode/agents/gist.md              (append write, todowrite)
~/.config/opencode/agents/wildcard.md          (append write, todowrite)
~/.config/opencode/oh-my-opencode-slim.jsonc   (cleanup redundant MCP grants)
```

> Note: base-agent denies (oracle/explorer/librarian/observer/council/fixer/designer) are set in factory functions (Task 7), not via new markdown files. Variant denies live in markdown (Task 10).

### MODIFIED docs

```
patch-kit/opencode-config/README.md            (clarify reserved skills + tier 3 deny)
patch-kit/docs/architecture.md                 (link to new spec)
patch-kit/docs/verify.md                       (new permission verification checklist)
patch-kit/CHANGELOG.md                         (v1.4.0 entry)
```

---

## Task Index

```
Phase A (Patch-kit code, TDD):
  Task 1  — agent-mcp-blacklist.ts
  Task 2  — orchestrator-only-skills.ts
  Task 3  — agent-tier-policy.ts
  Task 4  — superpowers-policy.ts (oracle DBG only; fixer/designer +RCR)
  Task 5  — custom-skills.ts (simplify to fixer)
  Task 6  — skills.ts (tier-default + reserved-skills wiring)
  Task 7  — index.ts (wire restricted MCP denies)
  Task 8  — Base agent factory tool denies (7 factories)
  Task 9  — agents/index.test.ts integration tests

Phase B (Verification):
  Task 10 — Full regression + build

Phase C (Live deployment):
  Task 11 — Update variant markdown files (write, todowrite)
  Task 12 — Cleanup oh-my-opencode-slim.jsonc
  Task 13 — Restart OpenCode + smoke test

Phase D (Docs + version):
  Task 14 — Update opencode-config/README.md
  Task 15 — Update patch-kit docs (architecture, verify)
  Task 16 — CHANGELOG entry

Phase E (Optional, patch-kit publish):
  Task 17 — Snapshot sync + patch generation + version bump
```

---

## Phase A — Patch-kit code (TDD)

### Task 1: New module — `agent-mcp-blacklist.ts`

**Files:**
- Create: `C:\Users\Administrator\.config\opencode\oh-my-opencode-slim-local\src\config\agent-mcp-blacklist.ts`
- Create: `C:\Users\Administrator\.config\opencode\oh-my-opencode-slim-local\src\config\agent-mcp-blacklist.test.ts`

- [ ] **Step 1.1: Write the failing test file**

Create `src/config/agent-mcp-blacklist.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { getRestrictedMcpDenies } from './agent-mcp-blacklist';

describe('getRestrictedMcpDenies', () => {
  test('orchestrator gets no denies (operator for all 3)', () => {
    expect(getRestrictedMcpDenies('orchestrator')).toEqual([]);
  });

  test('orchestrator-beta inherits orchestrator (operator)', () => {
    expect(getRestrictedMcpDenies('orchestrator-beta')).toEqual([]);
  });

  test('fixer gets no denies (operator)', () => {
    expect(getRestrictedMcpDenies('fixer')).toEqual([]);
  });

  test('fixer-alpha inherits fixer (operator)', () => {
    expect(getRestrictedMcpDenies('fixer-alpha')).toEqual([]);
  });

  test('designer-delta inherits designer (operator)', () => {
    expect(getRestrictedMcpDenies('designer-delta')).toEqual([]);
  });

  test('laborer is operator (no denies)', () => {
    expect(getRestrictedMcpDenies('laborer')).toEqual([]);
  });

  test('librarian gets windows-mcp deny only', () => {
    expect(getRestrictedMcpDenies('librarian')).toEqual(['windows-mcp']);
  });

  test('librarian-alpha inherits librarian (windows-mcp deny only)', () => {
    expect(getRestrictedMcpDenies('librarian-alpha')).toEqual(['windows-mcp']);
  });

  test('oracle gets all 3 restricted MCPs denied', () => {
    expect(getRestrictedMcpDenies('oracle').sort()).toEqual(
      ['chrome-devtools', 'playwright', 'windows-mcp'].sort(),
    );
  });

  test('oracle-beta inherits oracle (all 3 denied)', () => {
    expect(getRestrictedMcpDenies('oracle-beta').sort()).toEqual(
      ['chrome-devtools', 'playwright', 'windows-mcp'].sort(),
    );
  });

  test('explorer gets all 3 denied', () => {
    expect(getRestrictedMcpDenies('explorer').sort()).toEqual(
      ['chrome-devtools', 'playwright', 'windows-mcp'].sort(),
    );
  });

  test('wildcard gets all 3 denied', () => {
    expect(getRestrictedMcpDenies('wildcard').sort()).toEqual(
      ['chrome-devtools', 'playwright', 'windows-mcp'].sort(),
    );
  });

  test('unknown agent name defaults to safe (all 3 denied)', () => {
    expect(getRestrictedMcpDenies('foo-unknown').sort()).toEqual(
      ['chrome-devtools', 'playwright', 'windows-mcp'].sort(),
    );
  });
});
```

- [ ] **Step 1.2: Run test, verify it fails because module does not exist**

Run: `bun test src/config/agent-mcp-blacklist.test.ts` from `C:\Users\Administrator\.config\opencode\oh-my-opencode-slim-local\`

Expected: FAIL with "Cannot find module './agent-mcp-blacklist'"

- [ ] **Step 1.3: Create source module**

Create `src/config/agent-mcp-blacklist.ts`:

```ts
import { resolveBaseAgentName } from '../cli/superpowers-policy';

/**
 * Closed-set blacklist of restricted third-party MCPs.
 *
 * Each entry maps an MCP name to the set of base agent names allowed to use
 * it. Agents whose base name is NOT in the operator list get an explicit
 * deny rule emitted by the patch.
 *
 * Future-safe: adding a newly-restricted MCP requires only one new entry
 * here; no per-agent jsonc/markdown changes needed. New MCPs not listed
 * here remain implicit-allow for all agents.
 */
const MCP_OPERATOR_BASES: Record<string, ReadonlyArray<string>> = {
  'windows-mcp': ['fixer', 'orchestrator', 'laborer', 'designer'],
  'chrome-devtools': ['fixer', 'orchestrator', 'laborer', 'designer', 'librarian'],
  'playwright': ['fixer', 'orchestrator', 'laborer', 'designer', 'librarian'],
};

/**
 * Return the list of restricted MCP names that should be denied for the
 * given agent.
 *
 * Variant agents (e.g. `fixer-alpha`, `librarian-beta`) resolve to their
 * base name via `resolveBaseAgentName` and inherit the base's operator
 * status.
 */
export function getRestrictedMcpDenies(agentName: string): string[] {
  const base = resolveBaseAgentName(agentName);
  const denies: string[] = [];
  for (const [mcp, allowedBases] of Object.entries(MCP_OPERATOR_BASES)) {
    if (!allowedBases.includes(base)) {
      denies.push(mcp);
    }
  }
  return denies;
}
```

- [ ] **Step 1.4: Run test, verify it passes**

Run: `bun test src/config/agent-mcp-blacklist.test.ts`

Expected: 13 pass / 0 fail.

- [ ] **Step 1.5: Commit**

```bash
git add src/config/agent-mcp-blacklist.ts src/config/agent-mcp-blacklist.test.ts
git commit -m "feat(config): add agent-mcp-blacklist for closed-set MCP deny resolution"
```

---

### Task 2: New module — `orchestrator-only-skills.ts`

**Files:**
- Create: `src/config/orchestrator-only-skills.ts`
- Create: `src/config/orchestrator-only-skills.test.ts`

- [ ] **Step 2.1: Write the failing test file**

Create `src/config/orchestrator-only-skills.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import {
  RESERVED_ORCHESTRATOR_ONLY_SKILLS,
  isReservedSkillAllowed,
} from './orchestrator-only-skills';

describe('RESERVED_ORCHESTRATOR_ONLY_SKILLS', () => {
  test('contains best-of-n-with-judge', () => {
    expect(RESERVED_ORCHESTRATOR_ONLY_SKILLS).toContain('best-of-n-with-judge');
  });

  test('contains update-memory placeholder', () => {
    expect(RESERVED_ORCHESTRATOR_ONLY_SKILLS).toContain('update-memory');
  });
});

describe('isReservedSkillAllowed', () => {
  test('orchestrator is allowed', () => {
    expect(isReservedSkillAllowed('orchestrator')).toBe(true);
  });

  test('orchestrator-beta is allowed', () => {
    expect(isReservedSkillAllowed('orchestrator-beta')).toBe(true);
  });

  test('fixer is denied', () => {
    expect(isReservedSkillAllowed('fixer')).toBe(false);
  });

  test('fixer-alpha is denied (variants do not inherit reserved access)', () => {
    expect(isReservedSkillAllowed('fixer-alpha')).toBe(false);
  });

  test('oracle is denied', () => {
    expect(isReservedSkillAllowed('oracle')).toBe(false);
  });

  test('wildcard is denied', () => {
    expect(isReservedSkillAllowed('wildcard')).toBe(false);
  });

  test('unknown agent name is denied', () => {
    expect(isReservedSkillAllowed('foo-unknown')).toBe(false);
  });
});
```

- [ ] **Step 2.2: Run test, verify FAIL (module missing)**

Run: `bun test src/config/orchestrator-only-skills.test.ts`

Expected: FAIL "Cannot find module".

- [ ] **Step 2.3: Create source module**

Create `src/config/orchestrator-only-skills.ts`:

```ts
/**
 * Skills that may only be invoked by `orchestrator` and `orchestrator-beta`.
 *
 * For all other agents, the patch emits an explicit `deny` rule for these
 * skill names — regardless of the agent's non-SP `* allow` / `* deny`
 * posture. This forms a closed-set whitelist that is symmetric to the
 * closed-set blacklist in `agent-mcp-blacklist.ts`.
 *
 * Future skills that should be orchestrator-only just append here.
 */
export const RESERVED_ORCHESTRATOR_ONLY_SKILLS: ReadonlyArray<string> = [
  'best-of-n-with-judge',
  'update-memory', // PLACEHOLDER: skill landing in a future commit (memory layer)
] as const;

/**
 * Return `true` if the given agent is permitted to invoke reserved
 * orchestrator-only skills. Currently: `orchestrator` + `orchestrator-beta`
 * only. Variant agents (e.g. `fixer-alpha`) do NOT inherit this access.
 */
export function isReservedSkillAllowed(agentName: string): boolean {
  return agentName === 'orchestrator' || agentName === 'orchestrator-beta';
}
```

- [ ] **Step 2.4: Run test, verify PASS**

Run: `bun test src/config/orchestrator-only-skills.test.ts`

Expected: 9 pass / 0 fail.

- [ ] **Step 2.5: Commit**

```bash
git add src/config/orchestrator-only-skills.ts src/config/orchestrator-only-skills.test.ts
git commit -m "feat(config): add reserved orchestrator-only skill list with update-memory placeholder"
```

---

### Task 3: New module — `agent-tier-policy.ts`

**Files:**
- Create: `src/cli/agent-tier-policy.ts`
- Create: `src/cli/agent-tier-policy.test.ts`

- [ ] **Step 3.1: Write the failing test file**

Create `src/cli/agent-tier-policy.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { getDefaultNonSpPolicy } from './agent-tier-policy';

describe('getDefaultNonSpPolicy', () => {
  test('orchestrator: allow', () => {
    expect(getDefaultNonSpPolicy('orchestrator')).toBe('allow');
  });

  test('orchestrator-beta: allow', () => {
    expect(getDefaultNonSpPolicy('orchestrator-beta')).toBe('allow');
  });

  test('fixer: allow (tier 2 implementer)', () => {
    expect(getDefaultNonSpPolicy('fixer')).toBe('allow');
  });

  test('fixer-alpha: allow (variant inherits)', () => {
    expect(getDefaultNonSpPolicy('fixer-alpha')).toBe('allow');
  });

  test('designer: allow', () => {
    expect(getDefaultNonSpPolicy('designer')).toBe('allow');
  });

  test('laborer: allow', () => {
    expect(getDefaultNonSpPolicy('laborer')).toBe('allow');
  });

  test('oracle: deny (tier 3 review-class)', () => {
    expect(getDefaultNonSpPolicy('oracle')).toBe('deny');
  });

  test('oracle-beta: deny (variant inherits)', () => {
    expect(getDefaultNonSpPolicy('oracle-beta')).toBe('deny');
  });

  test('explorer: deny', () => {
    expect(getDefaultNonSpPolicy('explorer')).toBe('deny');
  });

  test('librarian: deny', () => {
    expect(getDefaultNonSpPolicy('librarian')).toBe('deny');
  });

  test('observer: deny', () => {
    expect(getDefaultNonSpPolicy('observer')).toBe('deny');
  });

  test('council: deny', () => {
    expect(getDefaultNonSpPolicy('council')).toBe('deny');
  });

  test('councillor: deny', () => {
    expect(getDefaultNonSpPolicy('councillor')).toBe('deny');
  });

  test('scout: deny', () => {
    expect(getDefaultNonSpPolicy('scout')).toBe('deny');
  });

  test('validator: deny', () => {
    expect(getDefaultNonSpPolicy('validator')).toBe('deny');
  });

  test('gist: deny', () => {
    expect(getDefaultNonSpPolicy('gist')).toBe('deny');
  });

  test('wildcard: deny', () => {
    expect(getDefaultNonSpPolicy('wildcard')).toBe('deny');
  });

  test('unknown agent name: allow (safe default for unknown custom agents)', () => {
    expect(getDefaultNonSpPolicy('foo-unknown')).toBe('allow');
  });
});
```

- [ ] **Step 3.2: Run, verify FAIL**

Run: `bun test src/cli/agent-tier-policy.test.ts`

Expected: FAIL "Cannot find module".

- [ ] **Step 3.3: Create source module**

Create `src/cli/agent-tier-policy.ts`:

```ts
import { resolveBaseAgentName } from './superpowers-policy';

/**
 * Tier 3 agents are the read-only review/recon/utility class. They have a
 * default non-SP skill policy of `deny` — meaning they cannot load
 * arbitrary non-Superpowers skills unless the agent's jsonc explicitly
 * lists the skill OR the patch's RECOMMENDED_SKILLS / CUSTOM_SKILLS
 * registries grant it.
 *
 * Tier 1 (orchestrator) and Tier 2 (implementer: fixer/designer/laborer)
 * agents default to `allow` for non-SP skills.
 */
const TIER_3_BASE_NAMES = new Set([
  'oracle',
  'explorer',
  'librarian',
  'observer',
  'council',
  'councillor',
  'scout',
  'validator',
  'gist',
  'wildcard',
]);

/**
 * Return the default non-Superpowers wildcard skill policy for the given
 * agent. Used by `getSkillPermissionsForAgent` when no explicit `skills`
 * override is provided in the agent's jsonc config.
 *
 * Variant agents (e.g. `oracle-alpha`) resolve to their base name via
 * `resolveBaseAgentName` and inherit the base's tier policy.
 *
 * Unknown agent names default to `allow` to avoid accidentally locking
 * down a user's custom agent that this patch is unaware of.
 */
export function getDefaultNonSpPolicy(agentName: string): 'allow' | 'deny' {
  const base = resolveBaseAgentName(agentName);
  return TIER_3_BASE_NAMES.has(base) ? 'deny' : 'allow';
}
```

- [ ] **Step 3.4: Run, verify PASS**

Run: `bun test src/cli/agent-tier-policy.test.ts`

Expected: 18 pass / 0 fail.

- [ ] **Step 3.5: Commit**

```bash
git add src/cli/agent-tier-policy.ts src/cli/agent-tier-policy.test.ts
git commit -m "feat(cli): add agent-tier-policy for tier-3 default non-SP deny"
```

---

### Task 4: Modify `superpowers-policy.ts` (oracle DBG only; fixer/designer +RCR)

**Files:**
- Modify: `src/cli/superpowers-policy.ts:26-40` (the AGENT_ALLOWED_SUPERPOWERS map)
- Modify: `src/cli/superpowers-policy.test.ts` (update assertions)

- [ ] **Step 4.1: Update test assertions to expect new policy**

Open `src/cli/superpowers-policy.test.ts`. Find the assertions for `oracle`, `fixer`, `designer`. Update them to:

```ts
// Was: oracle had {systematic-debugging, verification-before-completion, receiving-code-review}
test('oracle gets only systematic-debugging in SP allowlist', () => {
  const allowed = getAllowedSuperpowersSkillsForAgent('oracle');
  expect(allowed.has('systematic-debugging')).toBe(true);
  expect(allowed.has('verification-before-completion')).toBe(false);
  expect(allowed.has('receiving-code-review')).toBe(false);
  expect(allowed.size).toBe(1);
});

test('oracle-alpha inherits oracle (DBG only)', () => {
  const allowed = getAllowedSuperpowersSkillsForAgent('oracle-alpha');
  expect(allowed.has('systematic-debugging')).toBe(true);
  expect(allowed.size).toBe(1);
});

test('fixer gets TDD + DBG + VBC + RCR (4 skills, RCR added)', () => {
  const allowed = getAllowedSuperpowersSkillsForAgent('fixer');
  expect(allowed.has('test-driven-development')).toBe(true);
  expect(allowed.has('systematic-debugging')).toBe(true);
  expect(allowed.has('verification-before-completion')).toBe(true);
  expect(allowed.has('receiving-code-review')).toBe(true);
  expect(allowed.size).toBe(4);
});

test('designer gets TDD + DBG + VBC + RCR (4 skills, RCR added)', () => {
  const allowed = getAllowedSuperpowersSkillsForAgent('designer');
  expect(allowed.has('test-driven-development')).toBe(true);
  expect(allowed.has('systematic-debugging')).toBe(true);
  expect(allowed.has('verification-before-completion')).toBe(true);
  expect(allowed.has('receiving-code-review')).toBe(true);
  expect(allowed.size).toBe(4);
});
```

(If existing tests with these names already exist, REPLACE their bodies. If not, ADD these tests. Also delete any existing test that asserts the OLD oracle/fixer/designer SP shape.)

- [ ] **Step 4.2: Run tests, verify FAIL on the new assertions**

Run: `bun test src/cli/superpowers-policy.test.ts`

Expected: FAIL — tests assert oracle has only DBG, but current code allows DBG+VBC+RCR. Tests assert fixer has 4 skills, but current code allows 3.

- [ ] **Step 4.3: Update the AGENT_ALLOWED_SUPERPOWERS map**

In `src/cli/superpowers-policy.ts`, replace lines 26-40:

```ts
// Was:
//   fixer: ['test-driven-development', 'systematic-debugging', 'verification-before-completion'],
//   designer: ['test-driven-development', 'systematic-debugging', 'verification-before-completion'],
//   oracle:  ['systematic-debugging', 'verification-before-completion', 'receiving-code-review'],

  fixer: [
    'test-driven-development',
    'systematic-debugging',
    'verification-before-completion',
    'receiving-code-review',
  ],
  designer: [
    'test-driven-development',
    'systematic-debugging',
    'verification-before-completion',
    'receiving-code-review',
  ],
  oracle: [
    'systematic-debugging',
  ],
```

- [ ] **Step 4.4: Run tests, verify PASS**

Run: `bun test src/cli/superpowers-policy.test.ts`

Expected: all pass.

- [ ] **Step 4.5: Commit**

```bash
git add src/cli/superpowers-policy.ts src/cli/superpowers-policy.test.ts
git commit -m "feat(cli): tighten oracle SP to DBG only; add RCR to fixer/designer

Per permission redesign spec: oracle is pure read-only analyzer;
verification-before-completion and receiving-code-review do not fit
oracle's role. Move VBC out (already on orchestrator/fixer/designer/
validator). Move RCR onto the implementer agents (fixer, designer)
who are the actual receivers of code review feedback."
```

---

### Task 5: Modify `custom-skills.ts` (simplify -> fixer)

**Files:**
- Modify: `src/cli/custom-skills.ts:34` (`simplify` `allowedAgents` field)

- [ ] **Step 5.1: Write failing test**

Open `src/agents/index.test.ts`. Find the existing tests under `describe('skill permissions', ...)` (around line 231-269). Add new tests:

```ts
test('fixer has simplify skill allowed (moved from oracle)', () => {
  const agents = createAgents();
  const fixer = agents.find((a) => a.name === 'fixer');
  expect(fixer).toBeDefined();
  const skillPerm = (fixer?.config.permission as Record<string, unknown>)
    ?.skill as Record<string, string>;
  expect(skillPerm?.simplify).toBe('allow');
});

test('oracle does NOT have simplify skill allowed (moved to fixer)', () => {
  const agents = createAgents();
  const oracle = agents.find((a) => a.name === 'oracle');
  expect(oracle).toBeDefined();
  const skillPerm = (oracle?.config.permission as Record<string, unknown>)
    ?.skill as Record<string, string>;
  expect(skillPerm?.simplify).not.toBe('allow');
});

test('oracle-alpha does NOT have simplify (variant inherits)', () => {
  const agents = createAgents();
  const oracleAlpha = agents.find((a) => a.name === 'oracle-alpha');
  expect(oracleAlpha).toBeDefined();
  const skillPerm = (oracleAlpha?.config.permission as Record<string, unknown>)
    ?.skill as Record<string, string>;
  expect(skillPerm?.simplify).not.toBe('allow');
});
```

- [ ] **Step 5.2: Run, verify FAIL**

Run: `bun test src/agents/index.test.ts`

Expected: FAIL — `oracle` currently has `simplify: allow`; `fixer` does not.

- [ ] **Step 5.3: Update custom-skills.ts**

In `src/cli/custom-skills.ts:30-43`, change:

```ts
// Was:
//   {
//     name: 'simplify',
//     description: 'Code simplification and readability-focused refactoring',
//     allowedAgents: ['oracle'],
//     sourcePath: 'src/skills/simplify',
//   },

  {
    name: 'simplify',
    description: 'Code simplification and readability-focused refactoring',
    allowedAgents: ['fixer'],
    sourcePath: 'src/skills/simplify',
  },
```

- [ ] **Step 5.4: Run, verify PASS**

Run: `bun test src/agents/index.test.ts`

Expected: pass.

- [ ] **Step 5.5: Commit**

```bash
git add src/cli/custom-skills.ts src/agents/index.test.ts
git commit -m "feat(cli): move simplify skill from oracle to fixer

Per permission redesign: oracle is read-only and cannot 'Make the
change + Run tests' that simplify requires. fixer is the implementer
that can actually land simplification refactors."
```

---

### Task 6: Modify `skills.ts` (tier-default + reserved-skills wiring)

**Files:**
- Modify: `src/cli/skills.ts:108-188` (the `getSkillPermissionsForAgent` function body)
- Modify: `src/cli/skills.test.ts` (lock the new contract)

- [ ] **Step 6.1: Write failing tests**

Open or create `src/cli/skills.test.ts`. Add:

```ts
import { describe, expect, test } from 'bun:test';
import { getSkillPermissionsForAgent } from './skills';

describe('getSkillPermissionsForAgent — tier 3 default deny', () => {
  test('oracle has * deny (tier 3)', () => {
    const perms = getSkillPermissionsForAgent('oracle');
    expect(perms['*']).toBe('deny');
  });

  test('explorer has * deny (tier 3)', () => {
    const perms = getSkillPermissionsForAgent('explorer');
    expect(perms['*']).toBe('deny');
  });

  test('wildcard has * deny (tier 3)', () => {
    const perms = getSkillPermissionsForAgent('wildcard');
    expect(perms['*']).toBe('deny');
  });

  test('oracle-alpha inherits oracle * deny', () => {
    const perms = getSkillPermissionsForAgent('oracle-alpha');
    expect(perms['*']).toBe('deny');
  });

  test('fixer has * allow (tier 2)', () => {
    const perms = getSkillPermissionsForAgent('fixer');
    expect(perms['*']).toBe('allow');
  });

  test('designer has * allow (tier 2)', () => {
    const perms = getSkillPermissionsForAgent('designer');
    expect(perms['*']).toBe('allow');
  });

  test('orchestrator has * allow (tier 1)', () => {
    const perms = getSkillPermissionsForAgent('orchestrator');
    expect(perms['*']).toBe('allow');
  });

  test('oracle preserves SP allow for systematic-debugging despite * deny', () => {
    const perms = getSkillPermissionsForAgent('oracle');
    expect(perms['systematic-debugging']).toBe('allow');
  });
});

describe('getSkillPermissionsForAgent — reserved orchestrator-only skills', () => {
  test('orchestrator can use best-of-n-with-judge', () => {
    const perms = getSkillPermissionsForAgent('orchestrator');
    expect(perms['best-of-n-with-judge']).toBe('allow');
  });

  test('orchestrator can use update-memory', () => {
    const perms = getSkillPermissionsForAgent('orchestrator');
    expect(perms['update-memory']).toBe('allow');
  });

  test('orchestrator-beta can use both reserved skills', () => {
    const perms = getSkillPermissionsForAgent('orchestrator-beta');
    expect(perms['best-of-n-with-judge']).toBe('allow');
    expect(perms['update-memory']).toBe('allow');
  });

  test('fixer cannot use best-of-n-with-judge despite * allow', () => {
    const perms = getSkillPermissionsForAgent('fixer');
    expect(perms['best-of-n-with-judge']).toBe('deny');
  });

  test('fixer cannot use update-memory despite * allow', () => {
    const perms = getSkillPermissionsForAgent('fixer');
    expect(perms['update-memory']).toBe('deny');
  });

  test('wildcard cannot use either reserved skill', () => {
    const perms = getSkillPermissionsForAgent('wildcard');
    expect(perms['best-of-n-with-judge']).toBe('deny');
    expect(perms['update-memory']).toBe('deny');
  });

  test('fixer-alpha cannot use reserved skills (no inheritance)', () => {
    const perms = getSkillPermissionsForAgent('fixer-alpha');
    expect(perms['best-of-n-with-judge']).toBe('deny');
  });
});

describe('getSkillPermissionsForAgent — explicit skillList override still works', () => {
  test('laborer with skills:[] gets * deny + all SP denied', () => {
    const perms = getSkillPermissionsForAgent('laborer', []);
    expect(perms['*']).toBe('deny');
    expect(perms['systematic-debugging']).toBe('deny');
  });
});
```

- [ ] **Step 6.2: Run, verify FAIL**

Run: `bun test src/cli/skills.test.ts`

Expected: many failures — current `getSkillPermissionsForAgent` always defaults to `'*': 'allow'` and does not apply reserved skill denies.

- [ ] **Step 6.3: Refactor `getSkillPermissionsForAgent`**

Replace `src/cli/skills.ts:108-188` (everything inside the `getSkillPermissionsForAgent` function plus its imports section if needed):

```ts
import { spawnSync } from 'node:child_process';
import { CUSTOM_SKILLS } from './custom-skills';
import {
  buildSuperpowersSkillPermissions,
  resolveBaseAgentName,
} from './superpowers-policy';
import { getDefaultNonSpPolicy } from './agent-tier-policy';
import {
  RESERVED_ORCHESTRATOR_ONLY_SKILLS,
  isReservedSkillAllowed,
} from '../config/orchestrator-only-skills';

// ... (RecommendedSkill / PermissionOnlySkill interfaces and RECOMMENDED_SKILLS / PERMISSION_ONLY_SKILLS / installSkill exports unchanged) ...

/**
 * Get permission presets for a specific agent based on tier policy + recommended skills.
 *
 * @param agentName - The name of the agent
 * @param skillList - Optional explicit list of skills to allow (overrides recommendations)
 * @returns Permission rules for the skill permission type
 */
export function getSkillPermissionsForAgent(
  agentName: string,
  skillList?: string[],
): Record<string, 'allow' | 'ask' | 'deny'> {
  const superpowersPermissions = buildSuperpowersSkillPermissions(agentName);

  // If the user provided an explicit skill list (even empty), honor it.
  // (laborer's skills:[] in jsonc lands here.)
  if (skillList) {
    const explicitPermissions: Record<string, 'allow' | 'ask' | 'deny'> = {
      '*': 'deny',
    };

    for (const name of skillList) {
      if (name === '*') {
        explicitPermissions['*'] = 'allow';
      } else if (name.startsWith('!')) {
        explicitPermissions[name.slice(1)] = 'deny';
      } else {
        explicitPermissions[name] = 'allow';
      }
    }

    for (const [name, policy] of Object.entries(superpowersPermissions)) {
      const explicit = explicitPermissions[name] ?? explicitPermissions['*'];
      explicitPermissions[name] =
        policy === 'allow' && explicit === 'allow' ? 'allow' : 'deny';
    }

    applyReservedSkillOverrides(explicitPermissions, agentName);

    return explicitPermissions;
  }

  // No explicit override: use tier-default for non-SP wildcard, layer SP on top.
  const defaultPolicy = getDefaultNonSpPolicy(agentName);
  const permissions: Record<string, 'allow' | 'ask' | 'deny'> = {
    '*': defaultPolicy,
    ...superpowersPermissions,
  };

  // Resolve variant suffix names so variants inherit base-agent allowedAgents
  // matches without explicit per-variant entries.
  const resolvedAgentName = resolveBaseAgentName(agentName);

  for (const skill of RECOMMENDED_SKILLS) {
    const isAllowed =
      skill.allowedAgents.includes('*') ||
      skill.allowedAgents.includes(agentName) ||
      skill.allowedAgents.includes(resolvedAgentName);
    if (isAllowed) {
      permissions[skill.skillName] = 'allow';
    }
  }

  for (const skill of CUSTOM_SKILLS) {
    const isAllowed =
      skill.allowedAgents.includes('*') ||
      skill.allowedAgents.includes(agentName) ||
      skill.allowedAgents.includes(resolvedAgentName);
    if (isAllowed) {
      permissions[skill.name] = 'allow';
    }
  }

  for (const skill of PERMISSION_ONLY_SKILLS) {
    const isAllowed =
      skill.allowedAgents.includes('*') ||
      skill.allowedAgents.includes(agentName) ||
      skill.allowedAgents.includes(resolvedAgentName);
    if (isAllowed) {
      permissions[skill.name] = 'allow';
    }
  }

  applyReservedSkillOverrides(permissions, agentName);

  return permissions;
}

/**
 * Apply RESERVED_ORCHESTRATOR_ONLY_SKILLS gating. Runs LAST so it overrides
 * any prior allow/deny decision. Orchestrator family gets explicit allow;
 * everyone else gets explicit deny — regardless of `*` policy.
 */
function applyReservedSkillOverrides(
  permissions: Record<string, 'allow' | 'ask' | 'deny'>,
  agentName: string,
): void {
  const reservedPolicy: 'allow' | 'deny' = isReservedSkillAllowed(agentName)
    ? 'allow'
    : 'deny';
  for (const skill of RESERVED_ORCHESTRATOR_ONLY_SKILLS) {
    permissions[skill] = reservedPolicy;
  }
}
```

- [ ] **Step 6.4: Run, verify PASS**

Run: `bun test src/cli/skills.test.ts`

Expected: all pass.

Also run: `bun test src/agents/index.test.ts`

Expected: all pass (Task 5's tests + existing tests).

- [ ] **Step 6.5: Commit**

```bash
git add src/cli/skills.ts src/cli/skills.test.ts
git commit -m "feat(cli): tier-based default non-SP policy + reserved orchestrator-only skills

- Tier 3 agents (oracle*, explorer*, librarian*, scout, validator,
  gist, wildcard, observer, council, councillor) default non-SP * deny.
- Tier 1/2 (orchestrator*, fixer*, designer*, laborer) keep * allow.
- best-of-n-with-judge and update-memory reserved for orchestrator/
  orchestrator-beta only; deny on every other agent regardless of *
  policy.
- update-memory is a placeholder for an upcoming memory-layer skill."
```

---

### Task 7: Modify `index.ts` (wire restricted MCP denies)

**Files:**
- Modify: `src/index.ts:586-613` (the per-agent MCP permission emission loop)

- [ ] **Step 7.1: Write failing integration test**

Open `src/agents/index.test.ts`. Add new section:

```ts
describe('getAgentConfigs — restricted MCP blacklist', () => {
  test('oracle has windows-mcp_*, chrome-devtools_*, playwright_* denied', () => {
    const configs = getAgentConfigs();
    const oraclePerm = (configs.oracle.permission as Record<string, unknown>) ?? {};
    expect(oraclePerm['windows-mcp_*']).toBe('deny');
    expect(oraclePerm['chrome-devtools_*']).toBe('deny');
    expect(oraclePerm['playwright_*']).toBe('deny');
  });

  test('fixer has no restricted MCP denies (operator)', () => {
    const configs = getAgentConfigs();
    const fixerPerm = (configs.fixer.permission as Record<string, unknown>) ?? {};
    expect(fixerPerm['windows-mcp_*']).toBeUndefined();
    expect(fixerPerm['chrome-devtools_*']).toBeUndefined();
    expect(fixerPerm['playwright_*']).toBeUndefined();
  });

  test('librarian has windows-mcp_* deny but not chrome/playwright (mixed operator)', () => {
    const configs = getAgentConfigs();
    const libPerm = (configs.librarian.permission as Record<string, unknown>) ?? {};
    expect(libPerm['windows-mcp_*']).toBe('deny');
    expect(libPerm['chrome-devtools_*']).toBeUndefined();
    expect(libPerm['playwright_*']).toBeUndefined();
  });

  test('explorer-alpha (variant) inherits explorer denies', () => {
    const configs = getAgentConfigs();
    const epAlpha = (configs['explorer-alpha']?.permission as Record<string, unknown>) ?? {};
    expect(epAlpha['windows-mcp_*']).toBe('deny');
    expect(epAlpha['chrome-devtools_*']).toBe('deny');
    expect(epAlpha['playwright_*']).toBe('deny');
  });

  test('wildcard has all 3 restricted MCPs denied', () => {
    const configs = getAgentConfigs();
    const wcPerm = (configs.wildcard?.permission as Record<string, unknown>) ?? {};
    expect(wcPerm['windows-mcp_*']).toBe('deny');
    expect(wcPerm['chrome-devtools_*']).toBe('deny');
    expect(wcPerm['playwright_*']).toBe('deny');
  });
});
```

- [ ] **Step 7.2: Run, verify FAIL**

Run: `bun test src/agents/index.test.ts`

Expected: FAIL — restricted MCP denies are not yet emitted.

> NOTE: These tests assert against `getAgentConfigs()` output, but that function currently does NOT call into the MCP rule emission (which happens in `src/index.ts`'s `config` hook). So the test target is wrong — these need to test through the plugin's `config` hook OR we need to move the rule emission into `getAgentConfigs`.
>
> **Decision:** Move the restricted MCP rule emission into `getAgentConfigs`. The OMO 3 rule emission stays in `src/index.ts` (it depends on `existingPermissions` and the runtime `agents` map). Restricted MCP denies don't depend on jsonc state — they're pure agent-name → blacklist lookup — so they belong in `getAgentConfigs`.

- [ ] **Step 7.3: Wire restricted denies into `getAgentConfigs`**

Open `src/agents/index.ts`. Find the loop in `getAgentConfigs` (around line 492-526). Modify to also apply restricted MCP denies:

```ts
import { getRestrictedMcpDenies } from '../config/agent-mcp-blacklist';

// ... inside getAgentConfigs(), after the existing `applyClassification(a.name, sdkConfig);` line:

    // Apply closed-set restricted MCP blacklist (windows-mcp/chrome-devtools/playwright).
    // Operator agents (fixer*/orchestrator*/laborer/designer*[/librarian*]) get nothing emitted.
    // Non-operator agents get explicit deny rules.
    const restrictedDenies = getRestrictedMcpDenies(a.name);
    if (restrictedDenies.length > 0) {
      const existingPerm = (sdkConfig.permission ?? {}) as Record<string, unknown>;
      for (const mcp of restrictedDenies) {
        const sanitized = mcp.replace(/[^a-zA-Z0-9_-]/g, '_');
        existingPerm[`${sanitized}_*`] = 'deny';
      }
      sdkConfig.permission = existingPerm as typeof sdkConfig.permission;
    }
```

- [ ] **Step 7.4: Run, verify PASS**

Run: `bun test src/agents/index.test.ts`

Expected: all pass.

- [ ] **Step 7.5: Commit**

```bash
git add src/agents/index.ts src/agents/index.test.ts
git commit -m "feat(agents): emit restricted MCP denies in getAgentConfigs

windows-mcp, chrome-devtools, playwright are denied for non-operator
agents via the new closed-set blacklist. Operator agents are left
untouched so future new MCPs auto-inherit allow without per-agent
config changes."
```

---

### Task 8: Modify base agent factories (oracle, fixer, designer, explorer, librarian, observer, council)

**Files:**
- Modify: `src/agents/oracle.ts:40-49`
- Modify: `src/agents/fixer.ts:59-68`
- Modify: `src/agents/designer.ts` (similar)
- Modify: `src/agents/explorer.ts` (similar)
- Modify: `src/agents/librarian.ts` (similar)
- Modify: `src/agents/observer.ts` (similar)
- Modify: `src/agents/council.ts` (similar)

> Note: `councillor.ts` already has its lockdown; do not modify.
> Note: `laborer` is a custom agent (no factory file); its denies go in jsonc/markdown.

- [ ] **Step 8.1: Write failing tests for each base agent**

Add to `src/agents/index.test.ts` under a new `describe`:

```ts
describe('base agent factory tool denies', () => {
  test('oracle has edit/write/bash/task/todowrite deny', () => {
    const agents = createAgents();
    const oracle = agents.find((a) => a.name === 'oracle');
    expect(oracle).toBeDefined();
    const perm = (oracle?.config.permission as Record<string, string>) ?? {};
    expect(perm.edit).toBe('deny');
    expect(perm.write).toBe('deny');
    expect(perm.bash).toBe('deny');
    expect(perm.task).toBe('deny');
    expect(perm.todowrite).toBe('deny');
  });

  test('explorer has edit/write/bash/task/todowrite deny', () => {
    const agents = createAgents();
    const explorer = agents.find((a) => a.name === 'explorer');
    expect(explorer).toBeDefined();
    const perm = (explorer?.config.permission as Record<string, string>) ?? {};
    expect(perm.edit).toBe('deny');
    expect(perm.write).toBe('deny');
    expect(perm.bash).toBe('deny');
    expect(perm.task).toBe('deny');
    expect(perm.todowrite).toBe('deny');
  });

  test('librarian has edit/write/bash/task/todowrite deny', () => {
    const agents = createAgents();
    const librarian = agents.find((a) => a.name === 'librarian');
    expect(librarian).toBeDefined();
    const perm = (librarian?.config.permission as Record<string, string>) ?? {};
    expect(perm.edit).toBe('deny');
    expect(perm.write).toBe('deny');
    expect(perm.bash).toBe('deny');
    expect(perm.task).toBe('deny');
    expect(perm.todowrite).toBe('deny');
  });

  test('observer has edit/write/bash/task/todowrite deny', () => {
    const agents = createAgents();
    const observer = agents.find((a) => a.name === 'observer');
    expect(observer).toBeDefined();
    const perm = (observer?.config.permission as Record<string, string>) ?? {};
    expect(perm.edit).toBe('deny');
    expect(perm.write).toBe('deny');
    expect(perm.bash).toBe('deny');
    expect(perm.task).toBe('deny');
    expect(perm.todowrite).toBe('deny');
  });

  test('council has edit/write/bash/todowrite deny but task allow (dispatches councillor)', () => {
    const agents = createAgents();
    const council = agents.find((a) => a.name === 'council');
    expect(council).toBeDefined();
    const perm = (council?.config.permission as Record<string, string>) ?? {};
    expect(perm.edit).toBe('deny');
    expect(perm.write).toBe('deny');
    expect(perm.bash).toBe('deny');
    expect(perm.todowrite).toBe('deny');
    // task is allowed (not denied) — council dispatches councillors
    expect(perm.task).not.toBe('deny');
  });

  test('fixer has task deny (no further delegation)', () => {
    const agents = createAgents();
    const fixer = agents.find((a) => a.name === 'fixer');
    expect(fixer).toBeDefined();
    const perm = (fixer?.config.permission as Record<string, string>) ?? {};
    expect(perm.task).toBe('deny');
    // implementer keeps write/edit/bash
    expect(perm.write).not.toBe('deny');
    expect(perm.edit).not.toBe('deny');
    expect(perm.bash).not.toBe('deny');
  });

  test('designer has task deny (same shape as fixer)', () => {
    const agents = createAgents();
    const designer = agents.find((a) => a.name === 'designer');
    expect(designer).toBeDefined();
    const perm = (designer?.config.permission as Record<string, string>) ?? {};
    expect(perm.task).toBe('deny');
    expect(perm.write).not.toBe('deny');
    expect(perm.edit).not.toBe('deny');
    expect(perm.bash).not.toBe('deny');
  });
});
```

- [ ] **Step 8.2: Run, verify FAIL**

Run: `bun test src/agents/index.test.ts`

Expected: FAIL — factories don't set `config.permission` today.

- [ ] **Step 8.3: Modify `src/agents/oracle.ts`**

Replace lines 40-49 (the return block of `createOracleAgent`):

```ts
  return {
    name: 'oracle',
    description:
      'Strategic technical advisor. Use for architecture decisions, complex debugging, code review, simplification, and engineering guidance.',
    config: {
      model,
      temperature: 0.1,
      prompt,
      permission: {
        edit: 'deny',
        write: 'deny',
        bash: 'deny',
        task: 'deny',
        todowrite: 'deny',
      },
    },
  };
```

- [ ] **Step 8.4: Modify `src/agents/fixer.ts`**

Replace lines 59-68 (the return block of `createFixerAgent`):

```ts
  return {
    name: 'fixer',
    description:
      'Fast implementation specialist. Receives complete context and task spec, executes code changes efficiently.',
    config: {
      model,
      temperature: 0.2,
      prompt,
      permission: {
        task: 'deny',
      },
    },
  };
```

- [ ] **Step 8.5: Modify `src/agents/designer.ts`**

Find the return block in `createDesignerAgent`. Add `permission: { task: 'deny' }` to the `config` object (same shape as fixer above).

- [ ] **Step 8.6: Modify `src/agents/explorer.ts`**

Find the return block in `createExplorerAgent`. Add to `config`:

```ts
permission: {
  edit: 'deny',
  write: 'deny',
  bash: 'deny',
  task: 'deny',
  todowrite: 'deny',
},
```

- [ ] **Step 8.7: Modify `src/agents/librarian.ts`**

Same as explorer — full read-only `permission` block.

- [ ] **Step 8.8: Modify `src/agents/observer.ts`**

Same as explorer.

- [ ] **Step 8.9: Modify `src/agents/council.ts`**

Add to `config`:

```ts
permission: {
  edit: 'deny',
  write: 'deny',
  bash: 'deny',
  todowrite: 'deny',
  // NOTE: task is allow — council dispatches councillor subagents
  council_session: 'allow',
},
```

(Verify the `council_session: 'allow'` is consistent with what `applyDefaultPermissions` does; if there's a conflict, set it here only and remove the override in applyDefaultPermissions.)

- [ ] **Step 8.10: Run, verify PASS**

Run: `bun test src/agents/index.test.ts`

Expected: all pass.

- [ ] **Step 8.11: Commit**

```bash
git add src/agents/oracle.ts src/agents/fixer.ts src/agents/designer.ts src/agents/explorer.ts src/agents/librarian.ts src/agents/observer.ts src/agents/council.ts src/agents/index.test.ts
git commit -m "feat(agents): add base-agent factory tool denies per redesign spec

- oracle/explorer/librarian/observer: full read-only (deny edit/write/bash/task/todowrite)
- fixer/designer: deny task only
- council: deny edit/write/bash/todowrite, keep task allow (dispatches councillor)
- councillor: unchanged (already locked down)
- laborer: handled in jsonc (custom agent, not in factory)

Closes the prompt-vs-code gap where built-in oracle prompt declared
READ-ONLY but the code never enforced it."
```

---

### Task 9: Add comprehensive integration tests in `agents/index.test.ts`

**Files:**
- Modify: `src/agents/index.test.ts` (add a final `describe` summarizing the spec)

> Note: most assertions added in Tasks 5-8. This task adds a final spec-coverage test ensuring all 31 agents resolve to expected high-level shapes.

- [ ] **Step 9.1: Add summary test**

Append to `src/agents/index.test.ts`:

```ts
describe('permission redesign — spec coverage summary', () => {
  test('reserved skills are denied on all non-orchestrator agents', () => {
    const configs = getAgentConfigs();
    const reservedSkills = ['best-of-n-with-judge', 'update-memory'];
    const orchestratorAgents = ['orchestrator', 'orchestrator-beta'];

    for (const [agentName, agentConfig] of Object.entries(configs)) {
      const perm = (agentConfig.permission as Record<string, unknown>) ?? {};
      const skillPerm = (perm.skill as Record<string, string>) ?? {};
      for (const reserved of reservedSkills) {
        if (orchestratorAgents.includes(agentName)) {
          expect(skillPerm[reserved]).toBe('allow');
        } else {
          expect(skillPerm[reserved]).toBe('deny');
        }
      }
    }
  });

  test('all tier-3 agents have * deny on non-SP skills', () => {
    const configs = getAgentConfigs();
    const tier3 = [
      'oracle', 'oracle-alpha', 'oracle-beta', 'oracle-gamma', 'oracle-delta',
      'explorer', 'explorer-alpha', 'explorer-beta',
      'librarian', 'librarian-alpha', 'librarian-beta',
      'observer', 'council', 'councillor',
      'scout', 'validator', 'gist', 'wildcard',
    ];
    for (const name of tier3) {
      if (!configs[name]) continue; // skip if agent disabled in config
      const skillPerm = ((configs[name].permission as Record<string, unknown>)?.skill as Record<string, string>) ?? {};
      expect(skillPerm['*']).toBe('deny');
    }
  });

  test('all non-operator agents have all 3 restricted MCPs denied', () => {
    const configs = getAgentConfigs();
    const operatorBases = new Set(['fixer', 'orchestrator', 'laborer', 'designer']);
    const librarianOperatorMcps = new Set(['chrome-devtools', 'playwright']);
    for (const [agentName, agentConfig] of Object.entries(configs)) {
      const perm = (agentConfig.permission as Record<string, unknown>) ?? {};
      const base = agentName.split('-')[0];
      if (operatorBases.has(base)) {
        // operator family — patch should not emit any restricted denies
        expect(perm['windows-mcp_*']).toBeUndefined();
        expect(perm['chrome-devtools_*']).toBeUndefined();
        expect(perm['playwright_*']).toBeUndefined();
      } else if (base === 'librarian') {
        // librarian: only windows-mcp denied
        expect(perm['windows-mcp_*']).toBe('deny');
        expect(perm['chrome-devtools_*']).toBeUndefined();
        expect(perm['playwright_*']).toBeUndefined();
      } else {
        // all other agents: all 3 denied
        expect(perm['windows-mcp_*']).toBe('deny');
        expect(perm['chrome-devtools_*']).toBe('deny');
        expect(perm['playwright_*']).toBe('deny');
      }
    }
  });
});
```

- [ ] **Step 9.2: Run, verify PASS**

Run: `bun test src/agents/index.test.ts`

Expected: all pass.

- [ ] **Step 9.3: Commit**

```bash
git add src/agents/index.test.ts
git commit -m "test(agents): add spec-coverage summary for permission redesign

Locks the contract for all 31 agents in three high-level invariants:
reserved skill exclusivity, tier-3 * deny, and operator-only restricted MCPs."
```

---

## Phase B — Verification

### Task 10: Full regression + build

- [ ] **Step 10.1: Run full test suite**

```bash
cd C:\Users\Administrator\.config\opencode\oh-my-opencode-slim-local
bun test
```

Expected: all tests pass. Report any failures and fix before continuing.

- [ ] **Step 10.2: Run TypeScript type check**

```bash
bunx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 10.3: Run build**

```bash
bun run build
```

Expected: clean build, no warnings beyond benign ones.

- [ ] **Step 10.4: Commit if any incidental fixes were made**

If steps 10.1-10.3 surfaced any issues you fixed:

```bash
git add -A
git commit -m "fix: incidental fixes surfaced by full regression"
```

---

## Phase C — Live deployment

### Task 11: Update variant markdown files (write, todowrite to deny)

> Each file currently has a `permission` block with `edit: deny, bash: deny, task: deny`. We APPEND `write: deny, todowrite: deny`.

**Files:**
- Modify (12 files):
  - `~/.config/opencode/agents/oracle-alpha.md`
  - `~/.config/opencode/agents/oracle-beta.md`
  - `~/.config/opencode/agents/oracle-gamma.md`
  - `~/.config/opencode/agents/oracle-delta.md`
  - `~/.config/opencode/agents/explorer-alpha.md`
  - `~/.config/opencode/agents/explorer-beta.md`
  - `~/.config/opencode/agents/librarian-alpha.md`
  - `~/.config/opencode/agents/librarian-beta.md`
  - `~/.config/opencode/agents/scout.md`
  - `~/.config/opencode/agents/validator.md`
  - `~/.config/opencode/agents/gist.md`
  - `~/.config/opencode/agents/wildcard.md`

- [ ] **Step 11.1: Update `oracle-alpha.md`**

Locate lines 5-9 (the permission block). Change FROM:

```yaml
permission:
  edit: deny
  bash: deny
  task: deny
```

TO:

```yaml
permission:
  edit: deny
  write: deny
  bash: deny
  task: deny
  todowrite: deny
```

- [ ] **Step 11.2: Repeat exact same change for the remaining 11 files**

Files: `oracle-beta.md`, `oracle-gamma.md`, `oracle-delta.md`, `explorer-alpha.md`, `explorer-beta.md`, `librarian-alpha.md`, `librarian-beta.md`, `scout.md`, `validator.md`, `gist.md`, `wildcard.md`.

For each: open, locate `permission:` block, append `write: deny` after the last existing entry, and append `todowrite: deny`.

- [ ] **Step 11.3: Sanity check**

```bash
cd ~/.config/opencode/agents
grep -l "write: deny" *.md | sort
grep -l "todowrite: deny" *.md | sort
```

Expected: both should list exactly the 12 files above.

```bash
grep -L "write: deny" oracle-*.md explorer-*.md librarian-*.md scout.md validator.md gist.md wildcard.md
```

Expected: empty output (every restricted variant has it).

- [ ] **Step 11.4: Commit**

User config files may live outside the patch-kit git repo; if so, skip the commit step here. If `~/.config/opencode/` is itself a git repo, commit:

```bash
cd ~/.config/opencode
git add agents/oracle-*.md agents/explorer-*.md agents/librarian-*.md agents/scout.md agents/validator.md agents/gist.md agents/wildcard.md
git commit -m "agents: add write/todowrite to deny on tier-3 variants per permission redesign"
```

---

### Task 12: Cleanup `oh-my-opencode-slim.jsonc`

**Files:**
- Modify: `C:\Users\Administrator\.config\opencode\oh-my-opencode-slim.jsonc`

> The closed-set MCP blacklist now handles `windows-mcp`, `chrome-devtools`, `playwright` automatically. Any legacy `mcps:` lines in jsonc that explicitly listed these are now redundant. Remove them.

- [ ] **Step 12.1: Read the current jsonc**

```bash
cat C:\Users\Administrator\.config\opencode\oh-my-opencode-slim.jsonc | grep -n "windows-mcp\|chrome-devtools\|playwright"
```

Expected: list of jsonc lines that mention these MCPs.

- [ ] **Step 12.2: For each agent block in jsonc, remove redundant restricted-MCP entries from `mcps:`**

Specifically:
- Operator agents (`fixer*`, `orchestrator*`, `laborer`, `designer*`, `librarian*` for chrome/playwright): if their `mcps:` list contains `windows-mcp`, `chrome-devtools`, or `playwright`, remove those entries. Keep `websearch`, `context7`, `grep_app`.
- Non-operator agents: same — remove if listed (they shouldn't be, but just in case).

> **Do NOT remove `websearch`, `context7`, or `grep_app`.** These are the OMO 3 and remain whitelist-managed.

- [ ] **Step 12.3: Verify**

```bash
grep -n "windows-mcp\|chrome-devtools\|playwright" C:\Users\Administrator\.config\opencode\oh-my-opencode-slim.jsonc
```

Expected: no matches inside `mcps:` arrays. (Matches in comments or descriptions are fine.)

- [ ] **Step 12.4: Commit (if jsonc is in a git repo)**

```bash
cd ~/.config/opencode
git add oh-my-opencode-slim.jsonc
git commit -m "config: remove redundant restricted-MCP entries (now handled by patch blacklist)"
```

---

### Task 13: Restart OpenCode + smoke test

- [ ] **Step 13.1: Restart OpenCode**

Quit and relaunch your OpenCode session. Required because the plugin is not hot-reloadable.

- [ ] **Step 13.2: Verify plugin init**

Tail the latest plugin log:

```bash
$logDir = 'C:\Users\Administrator\.local\share\opencode'
$latest = Get-ChildItem -LiteralPath $logDir -Filter 'oh-my-opencode-slim*.log' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Get-Content -LiteralPath $latest.FullName -Tail 30
```

Expected:
- `[plugin] health check passed` line
- No `INIT FAILED` or stack trace

- [ ] **Step 13.3: Smoke test — oracle should not have bash**

In an OpenCode session:

```
@oracle hello, please run 'gh --version' via bash
```

Expected: oracle reports it cannot use bash and asks the orchestrator to run the command instead.

- [ ] **Step 13.4: Smoke test — wildcard cannot load simplify**

```
@wildcard please use the simplify skill to clean up this code: <paste>
```

Expected: wildcard reports the skill is not available; offers contrarian ideation instead.

- [ ] **Step 13.5: Smoke test — only orchestrator can call best-of-n-with-judge**

```
@fixer please use the best-of-n-with-judge skill to ...
```

Expected: fixer reports the skill is not available.

- [ ] **Step 13.6: Smoke test — fixer/designer have RCR access (used during code-review-receiving)**

```
@fixer use the receiving-code-review skill on the following review feedback: <paste>
```

Expected: fixer loads RCR and processes the feedback.

- [ ] **Step 13.7: Document results**

If any smoke test failed, return to the relevant task and fix. Commit `live verification: PASS` evidence into a CHANGELOG draft note for Task 16.

---

## Phase D — Docs + version

### Task 14: Update `opencode-config/README.md`

**Files:**
- Modify: `D:\BB84.ai\general_work\omo-slim-superpowers-patch-kit\opencode-config\README.md`

- [ ] **Step 14.1: Locate the "non-superpowers skills preserved" section (lines ~109-114)**

This currently says non-SP skills are preserved/untouched. That contradicts the new reserved-skill mechanism.

- [ ] **Step 14.2: Replace with new content**

Change to:

```markdown
### Skills

- **Superpowers skills**: per-agent allowlist managed by `superpowers-policy.ts`.
- **OMO custom + recommended skills** (codemap, simplify, agent-browser): per-agent allowlist in `custom-skills.ts` / `skills.ts`.
- **Reserved orchestrator-only skills**: `best-of-n-with-judge`, `update-memory`. Only `orchestrator` and `orchestrator-beta` may invoke. All other agents are explicitly denied. List managed in `orchestrator-only-skills.ts`.
- **Other skills**: governed by per-agent tier policy in `agent-tier-policy.ts`. Tier-1 (orchestrator) and Tier-2 (fixer/designer/laborer) default to `* allow`; Tier-3 (oracle, explorer, librarian, observer, council, councillor, scout, validator, gist, wildcard) default to `* deny`.
```

- [ ] **Step 14.3: Commit**

```bash
cd D:\BB84.ai\general_work\omo-slim-superpowers-patch-kit
git add opencode-config/README.md
git commit -m "docs: update permission model section per redesign"
```

---

### Task 15: Update patch-kit docs

**Files:**
- Modify: `D:\BB84.ai\general_work\omo-slim-superpowers-patch-kit\docs\architecture.md`
- Modify: `D:\BB84.ai\general_work\omo-slim-superpowers-patch-kit\docs\verify.md`

- [ ] **Step 15.1: Add "Permission Model" section to `architecture.md`**

Append (or insert at appropriate location):

```markdown
## Permission Model

The patch-kit governs per-agent permissions across three resource classes via a 3-layer overlay (patch code → markdown → jsonc). For full design rationale, capability tiers, and per-agent matrix see [docs/specs/2026-05-05-permission-redesign.md](specs/2026-05-05-permission-redesign.md).

Key invariants enforced by patch:

- **Tier-3 read-only agents** (oracle*, explorer*, librarian*, observer, council, councillor, scout, validator, gist, wildcard) deny `edit`, `write`, `bash`, `task`, `todowrite`.
- **Restricted MCPs** (windows-mcp, chrome-devtools, playwright) are denied for non-operator agents via closed-set blacklist in `src/config/agent-mcp-blacklist.ts`.
- **Reserved skills** (`best-of-n-with-judge`, `update-memory`) are allowed only for `orchestrator`/`orchestrator-beta` via `src/config/orchestrator-only-skills.ts`.
- **Other third-party MCPs** (gemini-tools, gmail, future): untouched. New MCPs are implicit-allow unless added to the blacklist.
```

- [ ] **Step 15.2: Update `verify.md`**

Add a new section at the appropriate place:

```markdown
## Permission posture verification (post v1.4.0)

After applying v1.4.0 patches, the following checks should pass:

```bash
# Oracle has no bash
@oracle "run 'echo hello' via bash"
# Expected: oracle reports it cannot use bash

# Wildcard has * deny on non-SP skills
@wildcard "use simplify skill"
# Expected: wildcard reports skill not available

# Reserved skill orchestrator-only
@fixer "use best-of-n-with-judge"
# Expected: fixer reports skill not available

# Operator MCP availability
@fixer "use windows-mcp to run a Windows command"
# Expected: fixer can use windows-mcp (operator class)

# Non-operator MCP denial
@oracle "use chrome-devtools to inspect a page"
# Expected: oracle reports tool not available
```
```

- [ ] **Step 15.3: Commit**

```bash
cd D:\BB84.ai\general_work\omo-slim-superpowers-patch-kit
git add docs/architecture.md docs/verify.md
git commit -m "docs: document permission model + verification checks for v1.4.0"
```

---

### Task 16: CHANGELOG entry

**Files:**
- Modify: `D:\BB84.ai\general_work\omo-slim-superpowers-patch-kit\CHANGELOG.md`

- [ ] **Step 16.1: Add v1.4.0 entry at top**

```markdown
## v1.4.0 — 2026-05-05

### Added
- Closed-set restricted-MCP blacklist (`src/config/agent-mcp-blacklist.ts`). `windows-mcp`, `chrome-devtools`, `playwright` are now auto-denied for non-operator agents. Future restricted MCPs require only a single line addition.
- Reserved orchestrator-only skill mechanism (`src/config/orchestrator-only-skills.ts`). `best-of-n-with-judge` and `update-memory` (placeholder) are now exclusive to `orchestrator` and `orchestrator-beta`.
- Per-agent tier policy (`src/cli/agent-tier-policy.ts`). Tier-3 read-only agents default to `* deny` for non-SP skills; tier-1/2 default to `* allow`.
- Tool deny rules in base agent factories (oracle/explorer/librarian/observer/council fully read-only; fixer/designer deny task only).

### Changed
- Oracle Superpowers allowlist tightened to `systematic-debugging` only. Removed `verification-before-completion` (mismatched: oracle reviews, doesn't claim completion) and `receiving-code-review` (mismatched: oracle gives reviews, doesn't receive them).
- `receiving-code-review` added to `fixer` and `designer` (the actual receivers of code review).
- `simplify` custom skill moved from `oracle` to `fixer` (oracle is read-only post-redesign and cannot land changes).
- Tier-3 markdown agents (oracle*, explorer*, librarian*, scout, validator, gist, wildcard) now deny `write` and `todowrite` in addition to `edit`/`bash`/`task`.

### Removed
- Redundant `windows-mcp`/`chrome-devtools`/`playwright` listings in operator-class jsonc agent `mcps:` arrays. The closed-set blacklist now handles these implicitly.

### Internal
- Spec: `docs/specs/2026-05-05-permission-redesign.md`
- Plan: `docs/plans/2026-05-05-omo-permission-redesign.md`
```

- [ ] **Step 16.2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: changelog entry for v1.4.0 permission redesign"
```

---

## Phase E — Patch-kit publish (OPTIONAL)

> Run only after Phase A-D are green and live-verified. This packages the changes for downstream consumers.

### Task 17: Snapshot sync + patch generation + version bump

- [ ] **Step 17.1: Sync live source to patch-kit snapshot**

```bash
cd D:\BB84.ai\general_work\omo-slim-superpowers-patch-kit

# (Use whatever snapshot sync script the patch-kit already has — likely under scripts/)
# Example:
bun run scripts/sync-snapshot.ts
```

If no script exists, manually copy the modified files from `~/.config/opencode/oh-my-opencode-slim-local/src/` to `snapshots/oh-my-opencode-slim/src/`.

- [ ] **Step 17.2: Generate the new patch file**

```bash
# Use existing patch generation pipeline:
bun run scripts/generate-patch.ts --base v1.3.0 --output patches/oh-my-opencode-slim/0006-permission-redesign.patch
```

- [ ] **Step 17.3: Bump version to v1.4.0**

Update `package.json` version, plus any other version files the patch-kit uses.

- [ ] **Step 17.4: Tag release**

```bash
git add -A
git commit -m "chore: bump to v1.4.0"
git tag v1.4.0
git push origin main --tags
```

(Skip the push if user has not requested publish.)

---

## Self-Review Notes

This plan was self-reviewed against the spec at `docs/specs/2026-05-05-permission-redesign.md`:

- **Spec coverage**: every section/requirement maps to a task. § 3.1 capability classes → Tasks 7-8. § 3.2 MCP allocation → Tasks 1, 7, 12. § 3.3 symmetric oracle → Tasks 4, 8, 11. § 3.4 read-only enforcement → Tasks 8, 11. § 3.5 reserved skills → Task 2, 6. § 3.6 misplaced skill cleanup → Tasks 4, 5. § 4 matrix → covered by integration tests in Task 9.
- **No placeholders**: every step has concrete code or commands. The only PLACEHOLDER in source is `update-memory` itself, which is intentional and documented as such.
- **Type consistency**: `getRestrictedMcpDenies`, `isReservedSkillAllowed`, `getDefaultNonSpPolicy`, `RESERVED_ORCHESTRATOR_ONLY_SKILLS` are referenced consistently across Tasks 1-9.

---

## Execution Handoff

**Plan complete and saved to `docs/plans/2026-05-05-omo-permission-redesign.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh `@fixer` subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using `executing-plans`, batched with checkpoints for review.

**Which approach?**
