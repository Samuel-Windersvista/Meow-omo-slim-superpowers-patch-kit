# OMO Slim + Superpowers 补丁工具包

一个第三方补丁工具包，用于补丁本地可编辑的 `oh-my-opencode-slim` 检出，使其在 OpenCode 中与 `superpowers` 干净协作。

关于上游源码和许可证说明，参见 [`UPSTREAM.md`](./UPSTREAM.md) 和 [`UPSTREAM-LICENSE-oh-my-opencode-slim.txt`](./UPSTREAM-LICENSE-oh-my-opencode-slim.txt)。

## 快速开始

告诉 OpenCode：Fetch and follow instructions from https://github.com/BB-84C/omo-slim-superpowers-patch-kit/blob/main/docs/install.md

## 本仓库的用途

本工具包适用于希望实现以下目标的用户：

- `superpowers` 保持为工作流/控制层
- `oh-my-opencode-slim` 提供专业子代理和按代理模型路由
- 仅对 `superpowers` 技能和 OMO 管理的 MCP 进行选择性限制
- 自定义技能和自定义 MCP 不受影响
- 从 `orchestrator` 到 `orchestrator-beta` 的自动重试切换
- 一个手动 GPT 根 `orchestrator-delta`，不含 beta 回退语义

## 已验证版本

已通过以下版本验证：

- `superpowers v5.1.0`
- `oh-my-opencode-slim v1.1.0`

## 本工具包补丁的内容

本补丁工具包以七种方式修改 OMO Slim：

1. **仅 Superpowers 技能门控** (0001)：仅限制 Superpowers 技能。
2. **仅 OMO 管理 MCP 门控** (0002)：仅限制 OMO 内置项（`websearch`、`context7`、`grep_app`）。
3. **Best-of-N 代理名解析** (0003)：变体如 `fixer-alpha` 通过后缀剥离继承基础策略。
4. **Orchestrator 前缀匹配** (0004)：`orchestrator-*` 根继承主模式 prompt 和根姿态。
5. **Anthropic 感知冷却追踪** (0005)：持久化 reset-header 冷却时间并跳过冷却中的模型。
6. **代理权限重新设计** (0006)：强制只读 Tier-3 代理、受限 MCP 黑名单、保留根专属技能、深度权限合并。
7. **最终 orchestrator pivot 清理** (0007)：使 beta 成为唯一的自动 pivot/回退强制根，添加仅手动 delta，移除调试/降级开关，构建前清理 `dist/`。

重要的最终行为：

- 自动重试 pivot 严格为 `orchestrator` -> `orchestrator-beta`。
- `orchestrator-beta` 是唯一强制 Anthropic 主模型子任务使用 `__task_fallback` 影子的根身份。
- `orchestrator-delta` 仅手动使用且不强制子任务回退。
- 可访问保留技能（`best-of-n-with-judge`、`update-memory`）的代理仅限 `orchestrator`、`orchestrator-beta` 和 `orchestrator-delta`。
- 强制降级覆盖和调试重试探测命令不作为支持的公开控件。

## 可选：Best-of-N + 快速通道示例配置

可选的 `opencode-config/` 子树展示了维护者的配置：

- 16 个变体代理用于并行候选生成和审查
- 4 个工具代理（`scout`、`validator`、`gist`、`wildcard`）
- `orchestrator-beta` 作为自动 pivot 目标
- `orchestrator-delta` 作为手动 GPT 根
- `best-of-n-with-judge` 编排技能

## 本工具包不做什么

- 不用 OMO Slim 替换 Superpowers。
- 不把 OMO Slim 变成工作流控制器。
- 不替换 OpenCode 本身。
- 不管理认证、密钥或会话数据。
- 不覆盖已有 MCP 配置块，除非你选择手动合并。
- 不将临时调试/探测命令发布为受支持的控件。

## 仓库结构

- `patches/` — 应用于上游 OMO Slim 的补丁文件
- `snapshots/` — 已验证的修改后源文件，供手动对照
- `config-templates/` — 基于维护者配置文件的模板配置
- `prompt-bridges/` — 每个代理的 Superpowers 感知追加 prompt
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

详见 `docs/verify.md` 的详细探测方法。

## 回滚

如需撤销此集成：

1. 从 `opencode.json` 中移除补丁后的 OMO Slim 插件条目
2. 恢复你之前的 `oh-my-opencode-slim.jsonc`
3. 移除 prompt bridge 文件
4. 可选删除本地补丁后的 OMO Slim 检出

详见 `docs/rollback.md` 的详细清单。

---

## 术语表

| 英文术语 | 中文解释 |
|---|---|
| **superpowers** | 一套 agentic 技能框架和软件开发方法论，作为工作流/控制器层存在于 OpenCode 之上 |
| **oh-my-opencode-slim (OMO Slim)** | OpenCode 的第三方插件，提供专业子代理（oracle / fixer / explorer 等）和按代理模型路由 |
| **OpenCode** | 本补丁工具包运行于其上的 AI 编程助手平台 |
| **patch kit / 补丁工具包** | 本仓库——一组通过修改 OMO Slim 源码使其与 superpowers 协作的补丁集 |
| **MCP** | Model Context Protocol，模型上下文协议。OpenCode 中连接外部工具（如网页搜索、浏览器自动化）的插件机制 |
| **skill gating / 技能门控** | 控制哪些代理可以访问哪些 superpowers 技能的权限机制 |
| **orchestrator** | OpenCode 中的主控制器代理，负责工作流编排、委派子代理和决策 |
| **orchestrator-beta** | orchestrator 的自动回退变体，当主 orchestrator 模型限流时自动切换；是唯一强制 Anthropic 主模型子任务回退的根身份 |
| **orchestrator-delta** | 纯手动 GPT 根代理，无自动回退语义，用户需手动切换 |
| **best-of-N** | 一种并行生成策略：同时派发 N 个变体代理生成候选方案，再由审查代理裁定最优结果 |
| **agent factory / 代理工厂** | 创建代理定义的工厂函数（如 `createFixerAgent()`），返回包含 prompt、权限、温度等配置的代理对象 |
| **foreground-fallback / 前台回退** | 当交互式会话遭遇限流错误时，自动切换到模型链中下一个可用模型的运行时机制 |
| **cooldown / 冷却追踪** | 记录模型限流后的重置时间，跨会话持久化，避免在新会话中反复尝试已知已限流的模型 |
| **pivot / 切换** | 特指 orchestrator 从 Anthropic 模型自动切换到 GPT 模型（orchestrator-beta）的一次性操作 |
| **prompt bridge / prompt 桥接** | 追加到每个代理系统 prompt 中的文本文件，使代理了解 superpowers 工作流约定 |
| **snapshot / 快照** | 补丁应用后的源文件副本，用于人工对照验证补丁是否正确应用 |
| **permission deny block / 权限拒绝块** | agent factory 中 `permission: { edit: 'deny', write: 'deny', ... }` 配置，限制代理的可用工具 |
| **tier / 代理层级** | 代理按能力分类：Tier-1（orchestrator，全能）、Tier-2（fixer / designer / laborer，可实现）、Tier-3（oracle / explorer / librarian / observer，只读） |
| **subtask / 子任务** | OpenCode 中由主代理派发到子代理的独立工作单元 |
| **variant agent / 变体代理** | 基于基础代理名加后缀的衍生代理（如 `fixer-alpha`、`oracle-gamma`），通过后缀剥离继承基础代理策略 |
| **suffix stripping / 后缀剥离** | 将变体代理名还原为基础代理名的机制（`fixer-alpha` -> `fixer`），使其继承基础代理的权限和技能白名单 |
| **prefix matching / 前缀匹配** | 识别以 `orchestrator` 开头的所有代理名（`orchestrator`、`orchestrator-beta` 等），使它们共享根代理行为 |
| **rate-limit / 限流** | API 提供商对模型调用频率或额度施加的限制，触发 429 HTTP 状态码或 `isRetryable` 错误标记 |
| **exponential backoff / 指数退避** | OpenCode 原生在遇到限流时递增等待时间的重试策略；冷却追踪机制绕过了对已知已限流模型的这种低效重试 |
| **preroute / 预路由** | 在子任务创建前检查当前根代理身份并决定是否需要重写目标代理或阻止操作 |
| **task fallback shadow / 任务回退影子** | 当 Anthropic 主模型不可用时，自动生成的隐藏备用代理配置（`__task_fallback`），用于接管子任务 |
| **blacklist / 黑名单** | 封闭的受限 MCP 集合（`windows-mcp`、`chrome-devtools`、`playwright`），非操作员代理自动被拒绝访问 |
| **reserved skills / 保留技能** | 仅 orchestrator 根代理可用的技能（`best-of-n-with-judge`、`update-memory`），其他所有代理显式拒绝 |
| **deep merge / 深度合并** | 递归合并配置对象（特别是 `permission.skill`），避免浅合并导致的嵌套权限丢失 |
| **shallow merge / 浅合并** | 仅合并对象第一层的属性，嵌套对象被整体替换——本补丁工具包修复了由此导致的权限静默丢失问题 |
| **rollback / 回滚** | 撤销补丁工具包集成的操作流程，恢复原始的 OMO Slim 配置 |
| **Anthropic** | AI 模型提供商，旗下模型包括 Claude Opus、Claude Sonnet 等；其 API 在限流时返回特定的重置时间头 |
| **GPT** | OpenAI 的 Generative Pre-trained Transformer 模型系列，在本项目中常作为 Anthropic 模型限流后的回退选择 |
| **dist /** | 构建产物目录，包含编译后的 JavaScript 文件（`index.js`）和 TypeScript 声明文件（`.d.ts`） |
| **TypeScript declaration** | `.d.ts` 类型声明文件，为 JavaScript 使用者提供类型信息，由 `tsc --emitDeclarationOnly` 生成 |
| **Divoom** | v1.1.0 新增的像素屏设备集成功能，在代理活动时显示状态动画 |
| **session goal / 会话目标** | v1.1.0 新增的会话目标追踪钩子 |
| **task session manager / 任务会话管理器** | v1.1.0 新增的模块，管理子任务会话的创建和生命周期 |
| **runtime preset / 运行时预设** | v1.1.0 新增的 `/preset` 命令支持，可在不修改配置文件的情况下切换代理模型 |
| **TUI state / 终端 UI 状态** | v1.1.0 新增的终端界面状态管理，在 OpenCode TUI 中显示代理和模型信息 |
