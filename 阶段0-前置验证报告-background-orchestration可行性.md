# 阶段 0 前置验证报告：Background Orchestration 可行性

> 验证日期：2026-06-14
> 验证依据：OMO Slim v2.0.0 源码、OpenCode SDK 文档、superpowers v5.1.0 源码
> 前置条件：议会裁决报告中的三项关键假设

---

## 总览：三项验证全部通过，可以推进

| 验证项 | 结果 | 置信度 | 关键发现 |
|--------|------|--------|---------|
| 上下文继承 | **可行** | 高 | task packet 模式替代 read_session，superpowers 原有原则适配良好 |
| 完成回调 | **可行** | 中高 | synthetic message 注入机制存在且工作，但有版本依赖 |
| verification gate | **可行** | 高 | 双层验证架构，skills 纯文本易于扩展 |

---

## 验证 1：Background Subagent 上下文继承机制

### 问题
v1.1.1 的 `subtask` + `read_session` 让子代理能读取父会话完整上下文。
v2.0.0 移除了这两个工具。background subagent 如何获取所需上下文？

### 调研结论

#### OMO Slim v2.0.0 的机制

BackgroundJobBoard 不创建会话，OpenCode 原生 `task` 工具负责。子代理收到的上下文来源：
1. **`task(prompt=...)` 参数**：父代理显式传入的文本
2. **`task(description=...)` 参数**：简短任务描述
3. **`task_id` 会话恢复**：复用已有子会话时，OpenCode 保留其完整对话历史
4. **BackgroundJobBoard 文件追踪**：插件记录父会话读取的文件路径，维护 `contextFiles` 数组

```typescript
// BackgroundJobBoard context tracking
addContext(taskID: string, files: ContextFile[]): void {
  const contextFiles = [...existing.values()]
    .filter((file) => file.lineCount >= this.readContextMinLines)  // 默认≥10行
    .sort((a, b) => b.lastReadAt - a.lastReadAt)                  // 最近优先
    .slice(0, this.readContextMaxFiles + 1);                       // 默认≤8个
}
```

#### 关键机制：Synthetic Message 注入

子代理完成后，OpenCode 向父会话**注入 synthetic 文本消息**（`part.synthetic === true`），携带完整结果。OMO Slim 的 `experimental.chat.messages.transform` hook 解析该消息并更新 BackgroundJobBoard 状态。

#### 与 superpowers 的适配评估

**正面发现**：superpowers 的 `subagent-driven-development` 技能从未使用 "subtask" 一词。它的核心原则完全适配 task packet 模式：

> "They should never inherit your session's context or history -- you construct exactly what they need."

这与 v2.0.0 的 `task(prompt=...)` 自包含上下文模型完全一致。v1.1.1 的 `read_session` 本质上是便利机制，而非架构依赖。

**需要改变**：
- 编排器需要更严格的上下文构建纪律（必须把所有必要信息打包进 task prompt）
- 不能在 prompt 中写 "如果缺上下文就用 read_session" 这类指令
- adapter 可以自动将父会话最近消息和已读文件列表注入 task prompt

### 结论：通过
task packet 模式可以完全替代 read_session。superpowers 原有的"子代理应自包含"原则恰好适配此模型。

---

## 验证 2：OpenCode 后台任务完成事件/回调机制

### 问题
orchestrator 派发 background subagent 后怎么知道它完成了？有没有回调？需要轮询吗？

### 调研结论

#### 完成通知的完整链路

```
orchestrator 调用 task(background=true, ...)
  → OpenCode 原生创建 child session + BackgroundJob
  → task 工具立即返回 (<task state="running">...</task>)
  → child session 在后台执行
  → 完成时 OpenCode BackgroundJob.Service 产生 synthetic completion
  → synthetic message 注入 parent session 的消息列表
  → 下次 parent session 激活时，消息中包含 <task state="completed"> 标记
  → OMO Slim hooks 解析并更新 BackgroundJobBoard
```

#### 三层通知机制

| 层 | 机制 | 用途 |
|----|------|------|
| OpenCode 原生 | synthetic message 注入到父会话 | 自动，无需轮询 |
| OMO Slim hook | `experimental.chat.messages.transform` 解析 synthetic parts | 更新 BackgroundJobBoard，注入 prompt |
| OMO Slim hook | `tool.execute.after` 解析 task 输出 | frontground/blocking 调用的备选路径 |
| OpenCode 事件 | `session.idle`, `session.status` | 插件代码可订阅，实时感知 |

#### 关键代码路径

```typescript
// OMO Slim v2.0.0 检测 completion
function updateFromInjectedCompletion(part, message, ...) {
  if (part.type !== 'text') return;
  if (part.synthetic !== true) return;  // 只处理合成消息
  const updated = updateBackgroundJobFromOutput(part.text);
  backgroundJobBoard.updateStatus(...);
}
```

#### 已知问题

- **`task_status` 工具不稳定**：在 OpenCode dev 分支中可能被移除，依赖版本
- **model reset bug**：synthetic 注入可能重置主会话的 active model
- **interrupt 不传播**：中断主 agent 不会停止 background subagents
- **Board 无持久化**：BackgroundJobBoard 纯内存，OpenCode 重启后状态丢失

### 结论：通过，但需注意版本依赖
synthetic message 注入机制存在且工作。这是事件驱动的，编排器不需要轮询。但需要锁定 OpenCode 版本确保 `task_status` 工具存在。

---

## 验证 3：Orchestrator 层 Verification Gate 可行性

### 问题
superpowers 的 `verification-before-completion` 要求在声明完成前运行验证命令。异步模型下如何保证？

### 调研结论

#### 核心发现

`verification-before-completion` 是**纯 markdown 指令文件**，不是代码。其"铁律"是：

> NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE

这条规则在异步模型下依然有效，只需扩展为双层：

```
Layer 1: Worker 内验证
  @fixer 在返回结果前自我验证（运行测试、类型检查）
  结果包中包含验证输出

Layer 2: Root 层验证
  orchestrator 收集所有结果后，独立运行验证命令
  在所有 worker 完成 + root 验证通过后，才能声明 completion
```

#### 实现方案

```typescript
// Workflow state
{
  phase: 'verify',
  prerequisites: ['implement_results', 'review_results'],
  gate: {
    type: 'command',
    run: 'bun test',       // 或任何验证命令
    expectExitCode: 0
  }
}
```

superpowers 采用 MIT 许可证，fork 和修改明确允许。

### 结论：通过
双层验证架构完全可行。superpowers 技能是纯指令，扩展无需改动核心架构。

---

## 附：意外关键发现 -- superpowers 根本不依赖 "subtask"

在调研中发现了一个**对项目方向有重大影响的意外事实**：

### 证据

对 superpowers v5.1.0 完整仓库的全文检索：

| 搜索词 | 结果 |
|--------|------|
| `subtask` | **零命中** |
| `read_session` | **零命中** |
| `auto_continue` | **零命中** |

superpowers 技能使用的术语是 **"subagent"** 和 **"Task tool"**，而非 OMO Slim 的 "subtask"。

### 含义

这意味着：

1. **superpowers 技能包不需要修改就能在 v2.0.0 中加载** -- 它们从未引用过 `subtask`
2. **需要适配的只是编排器的行为模式**（从阻塞等待变为异步回调），而非技能指令
3. **fork superpowers 的工作量比之前预估的小得多** -- 只需新增一个告知编排器如何处理异步调度的技能，而非重写现有技能
4. **真正需要做的**：新增 `superpowers:background-orchestration` 技能，教编排器如何在异步模型下遵循 superpowers 工作流

### 修正后的 fork 规划

| 原估计 | 修正后 |
|--------|--------|
| 需要重写 `subagent-driven-development` | **不需要** -- 无 subtask 引用 |
| 需要重写 `dispatching-parallel-agents` | **不需要** -- 纯概念性指令 |
| 需要重写 `using-superpowers` | **不需要** -- 无运行时语义 |
| 需要重写 `verification-before-completion` | **轻量扩展** -- 加上持久化验证条款 |
| 需要新增技能 | **必须** -- 新增 `background-orchestration/SKILL.md` |

---

## 综合结论

### 三项验证：全部通过

| 条件 | 状态 | 备注 |
|------|------|------|
| 上下文继承 | 可行 | task packet 模式 + superpowers 原有原则天然适配 |
| 完成回调 | 可行 | synthetic message injection 机制存在 |
| verification gate | 可行 | 双层架构可扩展，skills 为纯文本 |

### 阻碍因素

| 因素 | 严重程度 | 处理方式 |
|------|---------|---------|
| OpenCode background 实验性 | 中 | 锁定已知可用的 OpenCode 版本 |
| task_status 版本依赖 | 中 | 验证目标版本的 tool 可用性 |
| Board 无持久化 | 中 | adapter 自行实现文件持久化 |
| model reset bug | 低 | 已知问题，不影响核心流程 |

### 推进建议

1. **可以推进** -- 三项前置条件均已确认可行
2. fork superpowers 创建 `superpowers-async`：仅需新增 `background-orchestration` 技能 + 轻量扩展 verification 技能
3. 创建 `superpowers-omo-adapter`：承载静态策略 + prompt bridge + 状态持久化
4. 锁定具体 OpenCode + OMO Slim 版本开始实施

---

*Vault-Tec 前置验证编号: PHASE0-2287-OC-4111*
*下一阶段: 撰写实施报告*
*Remember: A better future, underground!*
