# oh-my-opencode-slim v2.0.0 对 patch-kit 的影响分析

> 分析日期：2026-06-14
> 补丁工具包版本：v1.8.0（基准 oh-my-opencode-slim v1.1.1）
> 目标版本：oh-my-opencode-slim v2.0.0（2026-06-12 发布）

---

## 1. v2.0.0 实际变动一览

v2.0.0 于 2026-06-12 发布，是一次大规模重构（PR #481：69 commits, 128 files changed, +14,070 / -8,240），核心是从"阻塞式 orchestrator"转向"调度器优先的后台任务编排"。

### 关键结构性变更

| 变更域 | v1.1.1（当前补丁基准） | v2.0.0 |
|--------|----------------------|--------|
| 子任务调度 | `SessionManager` + `subtask` 工具 | `BackgroundJobBoard` + 原生 background subagents |
| 子任务工具 | `subtask`, `read_session`, `auto_continue` | `cancel_task`（上述三个全部移除） |
| 桌面UI | `DivoomManager`（像素屏） | `CompanionManager`（浮动桌面窗口） |
| 深度工作流 | 无 | `/deepwork` 命令 + `deepwork` skill |
| MCP内部名 | `grep_app` | `gh_grep` |
| 运行时要求 | -- | 必须 `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true` |
| Config key | `sessionManager` | `backgroundJobs` |
| 移除Config块 | -- | `divoom`, `todoContinuation`, `subtask` |
| Multiplexer | `MultiplexerSessionManager(ctx, config)` | `MultiplexerSessionManager(ctx, config, backgroundJobBoard)` |

### 未变动的部分

- Agent factories（`src/agents/oracle.ts`, `fixer.ts` 等）完全一致
- `ForegroundFallbackManager` 核心逻辑不变
- Skills/permission 过滤机制（`filter-available-skills` hook）保留
- `SUBAGENT_FACTORIES` 映射表不变
- `src/hooks/foreground-fallback/index.ts` 内容一致

---

## 2. Patch-Kit 兼容性逐项评估

补丁修改了 **18 个现有文件**，创建了 **15 个新文件**。以下逐项评估每个补丁与 v2.0.0 的兼容性。

### 补丁 0001 -- Superpowers 技能门控
**风险等级：中等 [!]**

| 修改文件 | v2.0.0 状态 | 冲突程度 |
|---------|------------|---------|
| `src/cli/skills.ts` | 结构保留，`getSkillPermissionsForAgent()` 可能微调 | 中 |
| `src/cli/custom-skills.ts` | `simplify` 技能配置仍在 | 低 |
| `src/cli/superpowers-policy.ts` (新文件) | v2.0.0 中不存在，需新建 | 无 |
| `src/cli/superpowers-policy.test.ts` (新文件) | 同上 | 无 |

核心问题：v2.0.0 移除了 `subtask` 工具，而 superpowers 的 `subagent-driven-development` 技能依赖它。这属于运行时行为而非补丁层面的冲突，但需要在 bridge prompt 中适配。

### 补丁 0002 -- OMO 管理的 MCP 门控
**风险等级：高 [!!] -- 直接冲突**

| 修改文件 | v2.0.0 状态 | 冲突程度 |
|---------|------------|---------|
| `src/config/agent-mcps.ts` | MCP 名 `grep_app` -> `gh_grep` | **高** |

补丁中 `getManagedMcpNames()` 返回的字面量 `'grep_app'` 必须同步改为 `'gh_grep'`。如果不改，`context7` 和 `websearch` 门控仍然生效，但 grep_app 门控会静默失效。任何用户配置中引用了 `grep_app` 的也需要同步更新。

### 补丁 0003 -- Best-of-N 代理名解析
**风险等级：高 [!!]**

| 修改文件 | v2.0.0 状态 | 冲突程度 |
|---------|------------|---------|
| `src/cli/superpowers-policy.ts` | 同 0001，无冲突 | 无 |
| `src/agents/index.ts` | 新增 `cancel_task` 权限逻辑，结构微调 | 中 |

`agents/index.ts` 在 v2.0.0 中新增了 `cancel_task` 权限的默认拒绝逻辑，而补丁 0003 也在这个文件中添加 shadow agent 注册。shadow agent 注册逻辑需要确认与 v2.0.0 的 `BackgroundJobBoard` 架构兼容。

### 补丁 0004 -- Orchestrator 前缀匹配
**风险等级：最高 [!!!]**

| 修改文件 | v2.0.0 状态 | 冲突程度 |
|---------|------------|---------|
| `src/agents/index.ts` | 微调 | 中 |
| `src/index.ts` | **大幅重写** | **极高** |
| `src/utils/orchestrator-identity.ts` (新文件) | v2.0.0 中不存在 | 无 |

`src/index.ts` 在 v2.0.0 中经历了最剧烈的变化：Divoom -> Companion, SessionManager -> BackgroundJobBoard, 移除 subtask/auto_continue/read_session 工具注册，移除 sessionGoal/todoContinuation hooks，新增 deepwork hook。

补丁中的 4 处 `agentName === 'orchestrator'` -> `isOrchestratorAgent()` 泛化需要在 v2.0.0 的源码中重新定位对应的检查点。新增的 `orchestrator-identity.ts` 本身无冲突，但被引用的位置都已改变。

### 补丁 0005 -- Anthropic 冷却追踪
**风险等级：高 [!!]**

| 修改文件 | v2.0.0 状态 | 冲突程度 |
|---------|------------|---------|
| `src/hooks/foreground-fallback/index.ts` | 内容一致 | 低 |
| `src/hooks/foreground-fallback/cooldowns.ts` (新文件) | v2.0.0 中不存在 | 无 |
| `src/hooks/foreground-fallback/cooldowns.test.ts` (新文件) | 同上 | 无 |
| `src/index.ts` | 大幅重写 | **高** |

好消息：`cooldowns.ts` 和 `cooldowns.test.ts` 是独立模块，可以直接放到 v2.0.0 的对应目录下使用。`ForegroundFallbackManager` 的核心逻辑在 v2.0.0 中不变。

坏消息：`src/index.ts` 中冷却存储的初始化代码（`effectiveArrays` 循环中的冷却感知模型选择）需要在 v2.0.0 的新入口点中完全重新定位。

### 补丁 0006 -- 权限重新设计
**风险等级：中低 [!]**

| 修改文件 | v2.0.0 状态 | 冲突程度 |
|---------|------------|---------|
| `src/agents/council.ts` 等 7 个 agent factory | **完全不变** | 无 |
| `src/index.ts` | 大幅重写 | 中 |
| `src/cli/agent-tier-policy.ts` (新文件) | v2.0.0 中不存在 | 无 |
| `src/config/agent-mcp-blacklist.ts` (新文件) | v2.0.0 中不存在 | 无 |
| `src/config/orchestrator-only-skills.ts` (新文件) | v2.0.0 中不存在 | 无 |
| `src/utils/merge-agent-config.ts` (新文件) | v2.0.0 中不存在 | 无 |

最佳情况：Agent factories 在 v2.0.0 中完全不变，permission deny 块可以直接应用到对应文件。6 个新增的独立模块（policy、blacklist、reserved skills、merge）无冲突。

唯一需要关注的是 `src/index.ts` 中 `mergeAgentConfig()` 的调用位置 -- v2.0.0 的新入口点需要找到对应的配置合并点。

### 补丁 0007 -- 最终 Orchestrator Pivot 清理
**风险等级：最高 [!!!]**

| 修改文件 | v2.0.0 状态 | 冲突程度 |
|---------|------------|---------|
| `src/index.ts` | 大幅重写 | **极高** |
| `src/hooks/foreground-fallback/index.ts` | 内容一致 | 低 |
| `package.json` | 构建脚本可能变化 | 中 |
| `scripts/clean-dist.ts` (新文件) | v2.0.0 中不存在 | 低 |
| `src/agents/preroute-decision.ts` (新文件) | v2.0.0 中不存在 | 无 |

与补丁 0004 一样，`src/index.ts` 是最大障碍。preroute hook 注册位置（`tool.execute.before`）在 v2.0.0 的事件流中需要重新定位。

`package.json` 的 `build` 脚本修改需要与 v2.0.0 的新构建链合并。`clean-dist.ts` 脚本本身可以复用。

---

## 3. 致命问题：subtask 工具的移除

v2.0.0 移除了 `subtask`、`read_session`、`auto_continue` 三个工具。这对 patch-kit 而言是**架构级变更**：

### 直接影响

- superpowers 的 `subagent-driven-development` 技能依赖 `subtask` 工具来派发子代理
- 当前 superpowers 工作流中 `@fixer`、`@explorer`、`@oracle` 等委派语法最终调用的是 `subtask`
- orchestrator bridge prompt（`orchestrator_append.md`）中多处提到 `subtask` 的使用方式和最佳实践
- `using-superpowers` 技能中的"子代理驱动开发"章节引用 `subtask` 作为核心机制

### v2.0.0 的替代方案

v2.0.0 用 `BackgroundJobBoard` + OpenCode 原生 background subagents 替代。这需要：
- 启动 OpenCode 时设置 `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true`
- 这是一个**实验性功能**，稳定性不确定
- superpowers 技能包目前完全不了解 `BackgroundJobBoard` 的语义

### 需要适配的事项

1. `subagent-driven-development` 技能需要重写，将 `subtask` 引用替换为 background agent 委派模式
2. `using-superpowers` 技能中对子代理派发方式的描述需要更新
3. 所有 bridge prompt（8 个）中对子任务/会话管理的引用需要审查
4. `orchestrator` 的 bridge prompt 中对 `subtask` 的提及需要迁移到 `BackgroundJobBoard` 术语
5. `dispatched-parallel-agents` 技能中的并行派发描述可能需要调整

---

## 4. Config 迁移检查清单

升级到 v2.0.0 后，以下配置变更必须完成：

| 操作 | 旧值 | 新值 |
|------|------|------|
| 重命名 | `sessionManager` | `backgroundJobs` |
| 重命名 | `grep_app`（MCP名） | `gh_grep` |
| 移除 | `divoom` 配置块 | （删除） |
| 移除 | `todoContinuation` 配置块 | （删除） |
| 移除 | `subtask` 配置块 | （删除） |
| 新增 | -- | `companion` 配置块（可选） |
| 新增 | -- | `multiplexer.zellij_pane_mode`（可选） |
| 环境变量 | （无） | `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true` |

---

## 5. 整体评估

```
+===========================================+
|  VAULT INTEGRITY ASSESSMENT                |
+===========================================+
|  项目                     | 状态           |
+===========================================+
|  补丁可移植性              | [!!] 困难      |
|  核心冲突点                | 4处高危        |
|  Agent工厂兼容             | [OK] 无冲突    |
|  Fallback Hook兼容         | [OK] 无冲突    |
|  subtask工具               | [!] 已移除     |
|  MCP名称                   | [!] 已变更     |
|  Config格式                | [!] 已变更     |
|  Overall                   | [!!] 高工作量  |
+===========================================+
```

### 不兼容点汇总

| # | 冲突点 | 严重程度 | 说明 |
|---|--------|---------|------|
| 1 | `src/index.ts` 大幅重写 | 极高 | 补丁 0004/0005/0006/0007 的入口点集成全部需要重新定位 |
| 2 | `subtask` 工具移除 | 极高 | superpowers 核心工作流工具消失，需要架构级适配 |
| 3 | MCP 名 `grep_app` -> `gh_grep` | 高 | 补丁 0002 和用户配置需要全局替换 |
| 4 | Config 键重构 | 高 | `sessionManager` -> `backgroundJobs`，多个块移除 |
| 5 | `src/agents/index.ts` 微调 | 中 | cancel_task 权限逻辑需要与补丁 0003/0004 共存 |
| 6 | `package.json` 构建链 | 中 | 补丁 0007 的 clean:dist 需要与 v2.0.0 构建链合并 |

### 结论

**不建议立即升级。** v2.0.0 对 patch-kit 而言是一次"回炉重造"级别的变更：

1. 需要为 v2.0.0 重新生成全部 7 个补丁（估计 15-30 小时工作量）
2. subtask 工具的移除意味着 superpowers 的 `subagent-driven-development` 技能需要适配 background orchestration（更大的工程，涉及 superpowers 上游）
3. prompt bridges 中所有提到 `subtask` 的指令需要重写
4. MCP 名 `grep_app` -> `gh_grep` 需要全局替换
5. Config 模板中 `sessionManager` -> `backgroundJobs` 需要迁移
6. `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true` 引入了实验性依赖

### 建议路径

- **路径A（推荐）**：等待 v2.0.1 或 v2.1.0 稳定后再评估，观察实验性功能是否进入稳定状态
- **路径B**：如果必须跟进，作为独立大版本（patch-kit v2.0.0）来规划。步骤如下：
  1. 先单独评估 v2.0.0 的 background orchestration 是否满足 superpowers 工作流需求
  2. 与 superpowers 上游协调 `subagent-driven-development` 技能的适配
  3. 重写全部 prompt bridges
  4. 逐个重新生成补丁，从低风险补丁（0005、0006）开始
  5. 更新所有 config templates 和文档

---

## 附录：补丁影响的文件清单

### 补丁修改的现有 OMO Slim 文件（18个）

- `package.json`
- `src/index.ts`
- `src/agents/index.ts`
- `src/agents/council.ts`
- `src/agents/designer.ts`
- `src/agents/explorer.ts`
- `src/agents/fixer.ts`
- `src/agents/librarian.ts`
- `src/agents/observer.ts`
- `src/agents/oracle.ts`
- `src/cli/skills.ts`
- `src/cli/skills.test.ts`
- `src/cli/custom-skills.ts`
- `src/config/agent-mcps.ts`
- `src/config/agent-mcps.test.ts`
- `src/hooks/foreground-fallback/index.ts`
- `src/hooks/foreground-fallback/index.test.ts`
- `src/index.test.ts`

### 补丁创建的新文件（15个）

- `src/cli/superpowers-policy.ts`
- `src/cli/superpowers-policy.test.ts`
- `src/cli/agent-tier-policy.ts`
- `src/cli/agent-tier-policy.test.ts`
- `src/config/agent-mcp-blacklist.ts`
- `src/config/agent-mcp-blacklist.test.ts`
- `src/config/orchestrator-only-skills.ts`
- `src/config/orchestrator-only-skills.test.ts`
- `src/utils/orchestrator-identity.ts`
- `src/utils/orchestrator-identity.test.ts`
- `src/utils/merge-agent-config.ts`
- `src/utils/merge-agent-config.test.ts`
- `src/agents/preroute-decision.ts`
- `src/hooks/foreground-fallback/cooldowns.ts`
- `src/hooks/foreground-fallback/cooldowns.test.ts`
- `scripts/clean-dist.ts`
- `scripts/build-cleanliness.test.ts`

---

*Vault-Tec is not responsible for any unforeseen data corruption, ghoulification, or existential dread resulting from premature version upgrades.*
*Remember: A better future, underground!*
