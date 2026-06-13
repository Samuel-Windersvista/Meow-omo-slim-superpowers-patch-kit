# OMO Slim + Superpowers 补丁工具包 v2.0.0

一个第三方补丁工具包，用于补丁本地可编辑的 `oh-my-opencode-slim` v2.0.0 检出，使其在 OpenCode 中与 `superpowers` v5.1.0 干净协作。

关于上游源码和许可证说明，参见 [`UPSTREAM.md`](./UPSTREAM.md) 和 [`UPSTREAM-LICENSE-oh-my-opencode-slim.txt`](./UPSTREAM-LICENSE-oh-my-opencode-slim.txt)。

## 快速开始

告诉 OpenCode：Fetch and follow instructions from https://github.com/BB-84C/omo-slim-superpowers-patch-kit/blob/main/docs/install.md

## 已验证版本

- `superpowers v5.1.0`
- `oh-my-opencode-slim v2.0.0`

## 本工具包补丁的内容

本补丁工具包通过最小侵入方式修改 OMO Slim v2.0.0：

1. **Superpowers 技能门控** (0001)：仅限制 Superpowers 技能的代理访问白名单。
2. **OMO 管理 MCP 门控** (0002)：仅限制 OMO 内置项（`websearch`、`context7`、`gh_grep`）。
3. **Best-of-N 代理名解析** (0003)：变体如 `fixer-alpha` 通过后缀剥离继承基础策略。
4. **Orchestrator 前缀匹配** (0004)：`orchestrator-*` 根继承主模式 prompt 和根姿态。
5. **Anthropic 感知冷却追踪** (0005)：持久化 reset-header 冷却时间并跳过冷却中的模型。
6. **代理权限重新设计** (0006)：强制只读 Tier-3 代理、受限 MCP 黑名单、保留根专属技能、深度权限合并。
7. **Background Orchestration 支持** (新增)：新增 `background-orchestration` companion skill，使 superpowers 工作流适配 v2.0.0 的后台异步子代理模型。编排器在派发任务后结束当前回合，等待系统 synthetic completion 注入后再继续。

## v2.0.0 关键变化

相对于 v1.1.1，本版本进行了大规模简化：

- **移除 proroute 决策**：v2.0.0 的 background subagent 模型使旧的 preroute hook 不再需要
- **移除 shadow agent 注册**：OpenCode 原生处理模型回退
- **MCP 名迁移**：`grep_app` -> `gh_grep`（跟随上游 v2.0.0 变更）
- **Config 键迁移**：`sessionManager` -> `backgroundJobs`
- **cancel_task 权限**：非 orchestrator 代理默认拒绝
- **新增 companion skill**：`superpowers:background-orchestration` 教编排器如何处理异步调度
- **零改动 superpowers 技能包**：superpowers v5.1.0 技能文本与调度模型无关，无需任何修改

## 本工具包不做什么

- 不用 OMO Slim 替换 Superpowers。
- 不把 OMO Slim 变成工作流控制器。
- 不替换 OpenCode 本身。
- 不管理认证、密钥或会话数据。
- 不覆盖已有 MCP 配置块，除非你选择手动合并。
- 不修改 superpowers 技能包本身。

## 仓库结构

- `patches/` — 应用于上游 OMO Slim v2.0.0 的补丁文件
- `snapshots/` — 已验证的修改后源文件，供手动对照
- `config-templates/` — 基于维护者配置文件的模板配置
- `prompt-bridges/` — 每个代理的 Superpowers 感知追加 prompt
- `skills/` — companion skill（`background-orchestration`）
- `opencode-config/` — 可选的示例用户配置
- `docs/` — 安装、验证、回滚、架构、规格说明和计划

## 验证清单

安装后，验证以下各项：

- Superpowers 引导已激活。
- `orchestrator`、`orchestrator-beta`、`orchestrator-delta` 和各个专业 worker 代理均可用。
- 非根代理无法访问保留的根专属技能。
- 自定义 MCP 在预期位置仍然可用。
- `orchestrator` 重试 pivot 到 `orchestrator-beta`。
- `orchestrator-beta` 强制 Claude 主模型子任务回退；`orchestrator-delta` 不强制。
- `bun run build` 移除残留的已删除 `dist/` 产物。
- background subagent 调度正常（需 `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true`）。

详见 `docs/verify.md` 的详细探测方法。

## 回滚

详见 `docs/rollback.md` 的详细清单。
