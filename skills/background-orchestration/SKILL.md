---
name: background-orchestration
description: Use when orchestrating superpowers workflows on platforms with background (non-blocking) subagent dispatch. Teaches the orchestrator how to dispatch, wait for results, and proceed through phases in an async model.
---

# Background Orchestration for Superpowers Workflows

## When to Use

Use this skill when:
- The platform supports background/non-blocking subagent dispatch (e.g., OpenCode `task(background=true)`)
- You need to execute superpowers workflows (brainstorm -> plan -> implement -> review -> verify -> finish) on such a platform
- You are the **orchestrator** agent

## Core Principle

Superpowers phases have dependencies. `implement` must wait for `plan`. `review` must wait for `implement`. In a blocking model, the tool handled this for you. In a background model, **you** must enforce it explicitly.

## The Async Dispatch Pattern

### Phase 1: Dispatch

When entering a phase that requires subagent work (implement, review, parallel exploration):

1. Construct a **self-contained task packet** for each subagent:
   - Goal and acceptance criteria
   - Relevant plan/spec excerpts
   - File paths and constraints
   - Any prior phase outputs needed

2. Dispatch ALL independent tasks for this phase using the platform's background task tool:
   ```
   task(description="...", prompt="...", subagent_type="fixer", background=true)
   ```

3. Record each dispatched task: its ID, agent type, purpose, and which phase it belongs to.

4. **End your turn.** Do NOT poll. Do NOT loop. The system will reactivate you when results arrive.

### Phase 2: Collect

When your session receives synthetic completion messages (the platform injects them automatically):

1. Identify which phase each completion belongs to (from your records in Phase 1).
2. Check if ALL tasks for the current phase have completed.
3. If some are still running, wait for more completions (end turn).
4. If ALL tasks for the phase are done -> proceed to Phase 3.

### Phase 3: Gate Check

Before advancing to the next superpowers phase:

1. **Implement -> Review gate**: All implement tasks completed with DONE status -> dispatch review.
2. **Review -> Verify gate**: All review tasks returned approval -> run verification.
3. **Verify -> Finish gate**: Verification commands produce expected output -> declare completion.

If a gate fails:
- For implement failures: re-dispatch the failed task with corrected context.
- For review rejections: re-dispatch implement with reviewer feedback.
- For verification failures: fix the issue and re-verify.

## Parallelism Rules

| Can be parallel | Must be sequential |
|----------------|-------------------|
| Multiple independent implement tasks | implement before review |
| Multiple @explorer recon tasks | plan before implement |
| Multiple best-of-N candidate generators | review before verify |
| Multiple test files for different subsystems | verify before finish |

## Task Packet Template

When dispatching a background subagent, include:

```
Goal: [one-sentence objective]
Plan Context: [relevant plan section or summary]
Files: [list of files to work with, with paths]
Constraints: [coding standards, patterns to follow]
Prior Outputs: [results from previous phases needed]
Acceptance: [what "done" looks like]
```

The subagent must receive EVERYTHING it needs. There is no `read_session` to fetch missing context later.

## Phase State Tracking

Maintain a simple state record (mental or in a scratch file):

```
Phase: implement
Tasks:
  - job-abc: @fixer -> user-service.ts -> [RUNNING]
  - job-def: @fixer -> auth-service.ts -> [DONE]
Gate: waiting for job-abc
Next: review
```

Update this record each turn. It prevents you from losing track across multiple async cycles.

## Completion Declaration

Only declare the superpowers workflow COMPLETE after:
1. All phases have passed their gates
2. The verification phase produced passing evidence
3. You have fresh verification output (not cached from a previous session)
