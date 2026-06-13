# 变更日志

## 2026-06-14 — v2.0.0

### 重大变更：目标 OMO Slim v2.0.0 + 架构简化

- **上游版本升级**：目标 oh-my-opencode-slim v2.0.0（原 v1.1.1）
- **架构简化**：
  - 移除 preroute 决策逻辑（0007，v2.0.0 的 background subagent 模型使其不再需要）
  - 移除 shadow agent 注册（0004 中的 task fallback 部分，OpenCode 原生处理）
  - MCP 名迁移：`grep_app` -> `gh_grep`
  - Config 键迁移：`sessionManager` -> `backgroundJobs`
- **新增**：`background-orchestration` companion skill，教会编排器在异步 background subagent 模型下执行 superpowers 工作流
- **新增**：所有非 orchestrator 代理的 `cancel_task: 'deny'` 权限
- **修复**：prompt bridges 扩展，添加异步调度和自验证指令
- **确认**：superpowers v5.1.0 技能包零 `subtask` 引用，无需任何修改即可在 v2.0.0 上运行
- **确认**：15 个独立策略文件零依赖 subtask，直接从 v1.1.1 移植

### 移除

- 移除 `oh-my-opencode-slim-patched/` 目录（旧 v1.1.1 检出）
- 移除 7 个旧版单独补丁文件
- 移除旧版 v1.1.1 快照
- 移除 preroute-decision 模块

### 仓库结构

- 补丁文件：单一合并补丁 `0000-combined-v2.0.0.patch`
- 快照：22 个关键 patched 源文件（含 package.json）
- 新增：`skills/background-orchestration/`

---

## 2026-05-15 — v1.8.0

- 补丁基准版本升级至 `oh-my-opencode-slim v1.1.1`
- 全部 7 个补丁针对 v1.1.1 上游源码重新生成
- snapshots 更新为 v1.1.1 打补丁后的完整状态

## 2026-05-15 — v1.7.0

- 上游版本升级至 oh-my-opencode-slim v1.1.0 和 superpowers v5.1.0

## 2026-05-08 — v1.6.0

- 发布补丁 0007-final-orchestrator-pivot-cleanup.patch
- 添加 orchestrator-delta 作为手动 GPT 根

## 2026-05-07 — v1.5.0

- orchestrator pivot 自动化改进

## 2026-05-05 — v1.4.0

- 封闭集受限 MCP 黑名单
- 保留 orchestrator 专属技能机制
- 按代理层级策略
- 工具拒绝规则
- 深度权限合并修复

## 2026-05-05 — v1.3.0

- Anthropic 感知冷却追踪

## 2026-05-05 — v1.2.0

- Orchestrator 前缀匹配

## 2026-05-04 — v1.1.0

- Best-of-N + 快速通道扩展

## 2026-04-22 — v1.0.0

- 初始公开补丁工具包仓库搭建
