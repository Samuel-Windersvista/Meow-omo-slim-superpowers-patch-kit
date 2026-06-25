# superpowers 工作流适配 OMO Slim v2.0.0 Background Orchestration 方案

> 议会裁决日期：2026-06-14
> 裁决方式：3 councillor 并行评审 → 综合裁定
> 共识强度：高度一致（3/3 推荐路径B，分歧仅在战术执行细节）

---

## 议会裁决：推荐方案 -- 路径B为主 + 薄层补丁保留

**不再将 7 个补丁全部移植到 OMO Slim v2.0.0 源码。** 正确的策略是将访问控制从工作流语义中分离，在不同的层维护二者。

### 核心判断

```
+==========================================+
|  裁决                                   |
+==========================================+
|  路线:       B主A辅（混合方案）           |
|  OMO Slim:   缩回"代理与权限承载层"       |
|  patch-kit:  保留静态策略（技能/MCP门控）  |
|  superpowers: 接管工作流语义适配           |
+==========================================+
```

### 为什么不是路径A（移植全部补丁）

1. **补丁 0007 整体失效**：preroute hook 依赖 `tool.execute.before` 中的 `task` 工具，v2.0.0 中该工具已移除。即使强行移植，最终仍需在 superpowers 层重写工作流。
2. **上下文切换的根本断裂**：`subtask` 的阻塞语义是 v1.x 整个补丁工具的隐含假设。v2.0.0 用 `BackgroundJobBoard` 替代后，0004 的 shadow agent 机制、0007 的 preroute 决策逻辑都变为死代码。
3. **维护成本指数增长**：`src/index.ts` 在 v2.0.0 中被大幅重写（Divoom→Companion, SessionManager→BackgroundJobBoard），有 4 个补丁依赖这个入口点。每次上游升级都需要重新定位，形成永久维护负担。
4. **根本矛盾**：即使 7 个补丁全部打上，superpowers 的 `subagent-driven-development` 技能仍然因为 `subtask` 工具消失而无法工作。路径A最终殊途同归。

---

## 推荐架构：三层分离

```
OpenCode Runtime
  ├── oh-my-opencode-slim v2.0.0  (纯净上游，只维护 agent factory / routing / fallback)
  ├── superpowers-omo-adapter       (薄适配层，承载原 patch-kit 的静态策略)
  │   ├── policy/                   (技能门控 + MCP门控 + 权限分层 + 保留技能)
  │   ├── bridge/                   (prompt bridge 文本，移除 subtask 语义)
  │   └── fallback/                 (冷却追踪，独立模块)
  └── superpowers (技能包适配版)     (接管异步工作流状态机)
      ├── subagent-driven-development (重写：background agent 调度模型)
      ├── dispatching-parallel-agents  (适配：原生后台并行)
      ├── verification-before-completion (增强：worker层 + root层双层验证)
      └── using-superpowers           (更新：异步工作流术语)
```

### 各层职责

| 层 | 管什么 | 不管什么 |
|----|--------|---------|
| OMO Slim v2.0.0 | agent 定义、权限架构、MCP 暴露、模型路由、后台任务运行 | superpowers 技能语义、工作流顺序依赖 |
| superpowers-omo-adapter | 技能白名单、MCP 黑名单、Tier 权限层、prompt bridge、冷却 | 阶段依赖、异步 barrier、best-of-N 编排 |
| superpowers 技能包 | 阶段状态机、DAG 依赖关系、task packet 封装、异步 barrier、verification gate | 代理模型选择、MCP 可用性、限流处理 |

---

## 异步工作流状态机设计

### 核心矛盾

superpowers 的工作流是**有向无环图（DAG）**，其中大部分边是强依赖：

```
brainstorm → plan → implement → review → verify → finish
```

在 v1.x 中，orchestrator 调用 `subtask` 后阻塞等待，天然保证顺序。
在 v2.0.0 中，background subagent 是 fire-and-forget 的。

### 解决方案：显式阶段状态机

```
┌──────────────────────────────────────────────────┐
│  superpowers:background-workflow                  │
│                                                   │
│  state: {                                         │
│    currentPhase: 'implement',                     │
│    activeJobs: ['job-123', 'job-124'],            │
│    phaseOutputs: { plan: {...} },                 │
│    dependencies: {                                │
│      implement: ['plan'],                         │
│      review: ['implement'],                       │
│      verify: ['review'],                          │
│      finish: ['verify']                           │
│    }                                              │
│  }                                                │
│                                                   │
│  规则：                                            │
│  - 只有前驱全部完成，才能进入下一阶段              │
│  - 同一阶段内可并行多个任务（best-of-N）           │
│  - 阶段完成后收集所有结果，写入 phaseOutputs       │
│  - 失败阶段自动重试（新 job，不恢复旧 session）    │
└──────────────────────────────────────────────────┘
```

### 编排器在派发后的行为

**不是轮询。** 轮询浪费 token 且违背后台模型初衷。
**不是闲等。** 编排器在派发完后应该**结束当前轮次**。

```
orchestrator 派发 implement @fixer
  → 记录 job ID、阶段、输入上下文
  → 结束当前 turn
  → (background agent 异步执行)
  → OpenCode 产生 completion event
  → adapter 更新阶段状态
  → adapter 向 orchestrator 会话注入系统消息："implement 完成，结果如下，请继续 review"
  → orchestrator 读取状态，继续下一阶段
```

### 上下文传递（替代 read_session）

v1.x 中 `subtask` 的 `read_session` 机制让子代理能读取父会话。background subagent 没有等价工具。

**解决方案：显式 Task Packet**

```
taskPacket = {
  goal: "实现用户管理模块的 CRUD 接口",
  plan: { ... 来自 plan 阶段的输出 ... },
  constraints: ["使用 TypeScript", "遵循已有代码风格"],
  files: ["src/users/service.ts", "src/users/types.ts"],
  priorOutputs: { plan: {...} },
  acceptanceCriteria: ["所有测试通过", "类型检查无误"],
  maxRetries: 2
}
```

所有 background job 的初始 prompt 必须包含自给自足的 task packet。不做"子代理自己去读父会话"的假设。

### 并发策略

| 场景 | 并发方式 |
|------|---------|
| best-of-N implement | N 个 fixer-* 并行派发，全部完成后 judge 裁定 |
| 独立探索 | 多个 @explorer 并行搜索不同目录 |
| 多文件实施 | 按文件夹拆分，并行派发多个 @fixer |
| implement + review | **不能并发**，review 依赖 implement 输出 |
| plan + implement | **不能并发**，implement 依赖 plan 输出 |

---

## 薄层补丁保留清单

以下补丁的功能仍然有价值，保留但降为新适配层：

| 原补丁 | 功能 | 在新架构中的位置 | 改动量 |
|--------|------|-----------------|--------|
| 0001 | Superpowers 技能门控 | superpowers-omo-adapter/policy/ | 几乎不变，独立模块 |
| 0002 | OMO MCP 门控 | 同上 | `grep_app` → `gh_grep` |
| 0003 | 变体代理名解析 | 同上 | 不变 |
| 0004 | orchestrator 前缀匹配 | 同上（仅策略部分） | 移除 shadow agent 逻辑 |
| 0005 | Anthropic 冷却追踪 | superpowers-omo-adapter/fallback/ | cooldowns.ts 独立模块，不变 |
| 0006 | 权限重新设计 | superpowers-omo-adapter/policy/ | agent factories 不变，补 cancel_task deny |
| **0007** | orchestrator pivot | **移除** | preroute 在 background model 下无意义 |

---

## 实施路线图

### 阶段 0：前置验证（0 周，阻塞条件）

在投入工程前，必须验证三个前提：

1. **上下文继承**：background subagent 能否正常接收和利用父会话提供的 task packet？
2. **完成回调**：OpenCode 是否提供稳定的 background job completion 事件机制？
3. **verification gate**：能否在 orchestrator 层可靠地执行最终验证（不等同于 worker 自验证）？

**如果三项中任何一项不成立，暂缓推进，等待 OMO Slim v2.0.1+ 或 OpenCode background subagent 稳定化。**

### 阶段 1：薄适配层（1-2 周）

1. 从 patch-kit 提取 `superpowers-policy.ts`、`agent-tier-policy.ts`、`agent-mcp-blacklist.ts`、`orchestrator-only-skills.ts` → 放入 `superpowers-omo-adapter`
2. 将 `grep_app` 全局替换为 `gh_grep`
3. 为所有 agent factory denial 块追加 `cancel_task: 'deny'`
4. 将 `cooldowns.ts` 作为独立模块放入适配层

### 阶段 2：Prompt Bridge 重写（3-5 天）

1. `orchestrator_append.md`：完全重写，描述异步调度模型
2. 其余 7 个 bridge：术语审查，`subtask` → `task`，移除 `read_session`/`auto_continue` 引用
3. 新增 worker bridge 指令：自包含上下文处理、task packet 解析

### 阶段 3：Superpowers 技能适配（2-4 周，需上游协调）

1. `subagent-driven-development`：重写为 background agent 调度模型 + 异步 barrier
2. `dispatching-parallel-agents`：适配原生并行语义
3. `using-superpowers`：更新术语和流程描述
4. `verification-before-completion`：拆分为 worker 层 + root 层双层验证

### 阶段 4：异步状态机（2-3 周）

1. 实现 `superpowers:background-workflow` 技能
2. 实现 phase state manager（持久化到 `~/.config/opencode/.superpowers-workflow-state.json`）
3. 实现 best-of-N 异步收集与裁定

---

## 风险评估

| 风险 | 严重度 | 缓解措施 |
|------|--------|---------|
| OpenCode background subagent 实验性不稳定 | 高 | 等待 v2.0.1+；阶段0前置验证 |
| superpowers 上游不接受异步适配 | 高 | 先在 fork 中验证，再提出上游 PR |
| 无 read_session 导致上下文断裂 | 中 | 强制 task packet 模式；适配层自动注入父会话摘要 |
| 完成回调机制不确定 | 高 | 阶段0中确认；如无回调则需最小间隔轮询（退化方案） |
| 状态持久化在 OpenCode 重启时丢失 | 中 | 文件系统持久化；启动时恢复状态 |
| 长 prompt 导致 token 成本上升 | 低 | task packet 精简策略；只传必要上下文 |

---

## 与"继续补丁"方案的对比

| 维度 | 路径A（移植 7 补丁） | 路径B（混合架构） |
|------|---------------------|-------------------|
| 初始工作量 | 15-30 小时 | 3-6 周（但产出独立可复用） |
| 每次 OMO 升级成本 | 高（需重新定位补丁） | 低（适配层独立演进） |
| superpowers 工作流可用性 | 移植后仍不可用（需额外适配） | 内置异步支持 |
| 维护负担 | 随上游发布指数增长 | 固定 |
| 对上游侵入性 | 高（18 个文件打补丁） | 低（OMO 保持纯净） |
| best-of-N 自然度 | 需模拟并行 | 原生并行支持 |
| 回滚难度 | 中 | 低（移除适配层即可） |

---

## 议会意见摘要

### Councillor alpha (deepseek-v4-pro) 意见

> **"补丁工具包从来都不是关于 subtask 的。7 个补丁控制的是访问控制，不是工作流执行方式。15 个新文件零依赖 subtask，可直接放入 v2.0.0。src/index.ts 的 4 个集成点是唯一需要重定位的。"**
>
> 推荐将 patch-kit 拆分为"保留在 patch-kit 中（访问控制）"和"移至 superpowers（工作流适配）"两部分。强调先安装 15 个独立文件（1小时），再处理 index.ts（4-8小时），最后处理 superpowers 上游适配。

### Councillor beta (k2p7) 意见

> **"不要再把 OMO Slim 源码当画布。v2.0.0 的改动是把子任务调度权从 OMO Slim 收回给 OpenCode 原生运行时。0007 的 preroute 和 0004 的 shadow agent 在 v2.0.0 下是死代码。"**
>
> 推荐创建独立的 `superpowers-omo-adapter` 插件，包含 policy/、bridge/、fallback/、workflow/ 四个模块。强调事件驱动回调优于轮询，task packet 优于 read_session。

### Councillor gamma (gpt-5.4) 意见

> **"不是路径A，也不是纯路径B，而是 B主A辅。重写 superpowers 对子代理/并发的认知，保留薄 patch-kit 做静态策略。"**
>
> 强调前置验证三条件（上下文继承、完成事件、verification gate），三者成立再推进。对 read_session 消失的判断最审慎，认为这是最大风险之一。

### 共识总结：一致（3/3）

三位 councillor 在核心问题上完全一致：
- 不推荐路径A（移植全部补丁到 v2.0.0 源码）
- 推荐路径B为主，保留薄层静态策略
- 异步工作流状态机是正确方向
- subtask 语义必须从 superpowers 技能包侧适配
- 等待 v2.0.0 稳定化后再投入工程

---

*Vault-Tec 议会裁决编号: 2287-OC-4111-B*
*下次审查: OMO Slim v2.0.1 发布后或 BackgroundJobBoard 退出实验阶段后*
*Remember: A better future, underground!*
