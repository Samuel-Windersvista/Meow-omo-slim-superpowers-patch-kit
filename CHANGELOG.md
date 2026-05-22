# 变更日志

## 2026-05-15 — v1.8.0

### 变更
- 补丁基准版本升级至 `oh-my-opencode-slim v1.1.1`。
- 全部 7 个补丁针对 v1.1.1 上游源码重新生成。
- snapshots 更新为 v1.1.1 打补丁后的完整状态。
- 合并补丁重命名为 `0000-combined-v1.1.1.patch`。
- 补丁文件统一为 UTF-8 without BOM 编码，路径改为相对路径。
- README / install.md / COMPATIBILITY.md / UPSTREAM.md 版本号同步更新。

### 修复
- README 技能/代理混淆修正。
- 5 个 base prompt 文件中移除与 bridge append 重复的段落。
- 2 个快照测试断言更新为匹配补丁后策略。
- install.md 标注补丁 0003 为可选。
- verify.md 补充探测命令预期结果标注。
- UPSTREAM.md / COMPATIBILITY.md 新增 superpowers 上游信息。
- rollback.md 补充恢复配置的具体 JSON 字段。
- explorer-alpha/beta agent 描述修正。

## 2026-05-15 — v1.7.0

### 变更
- **上游版本升级**：目标 oh-my-opencode-slim v1.1.0（原 v1.0.1）和 superpowers v5.1.0（原 v5.0.7）。
- 补丁 0001-0007 已针对 v1.1.0 源码重新生成。v1.1.0 已内置多项上游新增功能（agent factory 文件、system-collapse、divoom 管理器、subtask 工具、会话目标、foreground-fallback 改进）；补丁现仅注入剩余差异，而非重新创建已有文件。
- `0002` 不再创建 `system-collapse.ts`/`system-collapse.test.ts`（v1.1.0 已自带）。
- Agent factory 补丁 (0006) 现为 v1.1.0 已有 factory 添加 permission deny 块，而非替换它们。
- `0005` 和 `0007` 的 foreground-fallback 变更与 v1.1.0 改进的 abort/error 处理合并。
- `0007` orchestrator pivot 现与 v1.1.0 的 task session manager 和 subtask 基础设施共存。
- 所有快照已更新为反映 v1.1.0 + 完整补丁集。

### 修复
- `src/index.ts` 补丁块已重新定位到 v1.1.0 大幅重构的插件入口点。
- 构建脚本已更新为包含与 v1.1.0 新构建链兼容的 `clean:dist` 步骤。
- TypeScript 声明生成通过 v1.1.0 扩展的类型表面。

## 2026-05-08 — v1.6.0

### 新增
- 发布补丁 `0007-final-orchestrator-pivot-cleanup.patch` 用于最终验证的 orchestrator pivot 行为。
- 在公开配置模板中添加 `orchestrator-delta` 作为手动 GPT 根，无回退强制语义。
- 最终 pivot 源文件、测试、`package.json` 和 clean-build 脚本的快照覆盖。
- beta/delta pivot 清理的最终设计和计划文档。

### 变更
- 自动重试 pivot 严格为 `orchestrator` -> `orchestrator-beta`（具体模型由用户在 bridge JSON 中配置决定）。
- 新的子任务预路由仅依赖于当前根身份为 `orchestrator-beta`。
- 保留的 orchestrator 专属技能现允许 `orchestrator`、`orchestrator-beta` 和 `orchestrator-delta`。
- `bun run build` 现先运行 `clean:dist`，使残留的已删除 `dist/` 文件不会在重建后继续存在。

### 移除
- 从最终公开行为中移除强制降级覆盖和调试重试探测表面。
- 移除已废弃调试根探测的过时公开指导文档。

## 2026-05-07 — v1.5.0

### 新增
- `src/utils/orchestrator-identity.ts` 用于根身份常量和辅助函数。
- `ForegroundFallbackManager.pivotOrchestrator()` 用于一次性 `orchestrator` -> `orchestrator-beta` 重放。
- 当 beta pivot 模式遇到 Anthropic 主子任务的 `task_id` 时恢复 `task` 阻塞。

### 变更
- 任务预路由查询当前根代理名而非单独的降级标志。

### 移除
- 移除单独的降级根集合和自动清除行为。

### 修复
- 根自动 pivot 为每会话单向；返回 `orchestrator` 需手动操作。
- 子任务预路由现查询根身份，避免之前过时标志的竞态条件。

### 内部
- 已被 v1.6.0 的最终公开文档取代。

## 2026-05-05 — v1.4.0

### 新增
- 封闭集受限 MCP 黑名单（`src/config/agent-mcp-blacklist.ts`）。`windows-mcp`、`chrome-devtools`、`playwright` 现对非操作员代理自动拒绝。未来受限 MCP 仅需添加一行。
- 保留 orchestrator 专属技能机制（`src/config/orchestrator-only-skills.ts`）。`best-of-n-with-judge` 和 `update-memory`（占位）现仅限 `orchestrator` 和 `orchestrator-beta` 使用。
- 按代理层级策略（`src/cli/agent-tier-policy.ts`）。Tier-3 只读代理对非 SP 技能默认为 `* deny`；tier-1/2 默认为 `* allow`。
- 基础 agent factory 中的工具拒绝规则（oracle/explorer/librarian/observer 只读；council 拒绝 edit/write/bash/todowrite 但保留 task 用于 councillor 分发；fixer/designer 仅拒绝 task）。

### 变更
- Oracle Superpowers 白名单收紧为仅 `systematic-debugging`。移除 `verification-before-completion`（不匹配：oracle 审查，不声明完成）和 `receiving-code-review`（不匹配：oracle 给出审查，不接收审查）。
- `receiving-code-review` 添加到 `fixer` 和 `designer`（实际的代码审查接收者）。
- `simplify` 自定义技能从 `oracle` 移至 `fixer`（oracle 在重新设计后为只读，无法落地变更）。
- Tier-3 markdown 代理（oracle*、explorer*、librarian*、scout、validator、gist、wildcard）现除 `edit`/`bash`/`task` 外还拒绝 `write` 和 `todowrite`。

### 移除
- 操作员级 jsonc agent `mcps:` 数组中冗余的 `windows-mcp`/`chrome-devtools`/`playwright` 列表。封闭集黑名单现已隐式处理这些。

### 修复
- `src/index.ts` 中的代理配置合并此前在代理级别为浅合并（`{...pluginAgent, ...existing}`），导致任何拥有包含自身 `permission:` 块的用户 markdown 文件的代理丢失插件发出的 `permission.skill` 映射。因此保留技能强制执行在每一个变体代理（`*-alpha/beta/gamma/delta`）和每一个工具代理（`scout`、`validator`、`gist`、`wildcard`）上静默失效。通过引入 `src/utils/merge-agent-config.ts` 修复，该模块深度合并 `permission` 和 `permission.skill`，同时保持所有其他字段浅合并。已验证通过 7 个测试的单元套件以及一次实时冒烟探测，修复后 `wildcard` 正确拒绝 `update-memory`。

### 内部
- 规格说明：`docs/specs/2026-05-05-permission-redesign.md`
- 计划：`docs/plans/2026-05-05-omo-permission-redesign.md`

## 2026-05-05 — v1.3.0

- 新增 **Anthropic 感知冷却追踪**（补丁 `0005-anthropic-cooldown-tracking.patch`）：
  - 新模块 `src/hooks/foreground-fallback/cooldowns.ts` 导出：
    - `parseAnthropicCooldown(headers)` — 从 `anthropic-ratelimit-requests-reset` / `anthropic-ratelimit-tokens-reset` / `anthropic-ratelimit-input-tokens-reset` / `anthropic-ratelimit-output-tokens-reset` 头中提取最晚的重置时间戳（大小写不敏感，格式错误的值静默跳过，无可识别头时返回 null）
    - `createCooldownStore({filePath?, nowFn?})` — 磁盘支持的 `Map<provider/model, resetEpochMs>`，采用原子临时文件重命名写入；构建时加载并自动清除过期条目；`set()` 时立即持久化
    - `getDefaultCooldownPath()` — `<getConfigDir()>/.omo-slim-cooldowns.json`（隐藏文件）
  - `ForegroundFallbackManager` 现接受可选的 `cooldowns` 第 4 个构造函数参数（默认为磁盘支持的存储）：
    - 在带有响应头的限流事件上，`captureCooldown()` 记录受影响模型的重置时间
    - 在 `tryFallback()` 中，链选择优先选择当前未处于冷却的未尝试模型；若所有模型都在冷却中，则回退到"第一个未尝试"（冷却为软提示，非硬阻塞）
    - 新增公开的 `getCooldownStore()` 访问器供下游消费者使用
  - `src/index.ts` 中的插件初始化现在**启动时模型选择**（在 `effectiveArrays` 循环中）使用相同的冷却存储：每个代理链中第一个非冷却模型被选为启动模型。这消除了每次新会话的第一条消息上 OpenCode 原生指数退避重试针对已知限流模型的约 30 秒浪费。
  - 新增 22 个测试，分布在 `cooldowns.test.ts`（17 个单元）和 `index.test.ts`（5 个集成）。全部 138 个 foreground-fallback + v1.0-1.2 回归测试在干净的 `omo-slim v1.0.1 + 0001+0002+0003+0004+0005` 上通过。
- 新增快照：`src/hooks/foreground-fallback/{index.ts,index.test.ts,cooldowns.ts,cooldowns.test.ts}`（0005 后）；更新 `src/index.ts`（0005 后）。
- 使用场景：在主 `orchestrator` 代理上注册模型数组（例如 `[opus-4-7, gpt-5.4]`）。当 Opus 的 5 小时滚动配额耗尽时：
  - **会话内**：第一条消息检测到 429 + 解析重置头 + 持久化冷却 + 在 gpt-5.4 上重放最后一条用户消息（后续回合零等待；opus 自动跳过）
  - **跨会话 / OpenCode 重启**：冷却通过 `~/.config/opencode/.omo-slim-cooldowns.json` 保留。下一个新会话直接在 gpt-5.4 上启动，绕过浪费的 30 秒重试风暴。当 Opus 的重置时间过后，后续会话正常恢复使用 Opus。
- 配置：仅 jsonc。未来模型切换为纯配置编辑——无需重新构建，无需重新生成补丁。冷却机制与 provider/model-id 无关；任何未来的 Anthropic 模型自动获得头解析。

## 2026-05-05 — v1.2.0

- 新增 **orchestrator 前缀匹配**（补丁 `0004-orchestrator-prefix-matching.patch`）：
  - `src/cli/superpowers-policy.ts` 中新增导出辅助函数 `isOrchestratorAgent(name)`，对任何以 `orchestrator` 开头的代理名返回 `true`（字面量 `orchestrator`、虚线后缀变体如 `orchestrator-beta`、无分隔符变体如 `orchestrator2`）。
  - OMO Slim 中所有四处硬编码的 `agentName === 'orchestrator'` 字符串相等检查均已泛化为使用 `isOrchestratorAgent()`：
    - `src/cli/superpowers-policy.ts` `getAllowedSuperpowersSkillsForAgent` — orchestrator 形态代理获得完整 superpowers 白名单
    - `src/agents/index.ts` `applyClassification` — orchestrator 形态代理获得 `mode = 'primary'`（在 OpenCode 的主代理选择器中可见）
    - `src/index.ts` post-file-tool nudge 钩子 — 对任何 orchestrator 形态会话触发
    - `src/index.ts` chat.system.transform 钩子 — 将字面量 orchestrator 的桥接 prompt 注入到每个 orchestrator 形态会话中，使变体行为一致
  - 使用场景：定义一个回退主 orchestrator（例如在不同模型上的 `orchestrator-beta`），使用户可以在主 orchestrator 模型限流时从 OpenCode 选择器切换代理，而无需重新运行整个 5 小时冷却时钟。
  - 权限、MCP 和 prompt 分别自动从 `applyDefaultPermissions`（自定义代理路径）和运行时钩子继承——除 `model` +（可选）`mcps` 外无需按变体配置。
  - `src/cli/superpowers-policy.test.ts` 中新增 5 个测试，覆盖字面量/虚线后缀/无分隔符后缀匹配及反例（名称中间包含 `orchestrator` 子串的不匹配）。
- 更新 `snapshots/oh-my-opencode-slim/src/cli/{superpowers-policy.ts,superpowers-policy.test.ts}`、`src/agents/index.ts`（新快照——v1.1.0 中缺失）和 `src/index.ts` 至 0004 后状态。
- 更新 `README.md`、`COMPATIBILITY.md`、`docs/architecture.md`、`docs/install.md`、`docs/verify.md` 加入补丁 0004 的安装/验证指导。
- 补丁 0004 **推荐所有安装使用**（非如 0003 的可选）：此变更纯粹是对已有字符串相等检查的泛化，不改变字面量 `orchestrator` 代理的行为。仅在你有意需要 orchestrator 形态名称（例如 `orchestrator-something`）不被视为 orchestrator 时才跳过。

## 2026-05-04

- 新增可选 **best-of-N + 快速通道扩展**：
  - 新补丁 `0003-best-of-n-agent-name-resolution.patch`：在 `src/cli/superpowers-policy.ts` 和 `src/cli/skills.ts` 中添加 `resolveBaseAgentName()` 后缀剥离，使变体代理（`fixer-alpha`、`oracle-gamma` 等）自动继承基础代理 superpowers 策略。为 `scout`、`validator`、`gist`、`wildcard` 工具代理添加显式策略条目。
  - 新 `opencode-config/` 子树：维护者完整配置的可选示例镜像，包含 20 个 agent markdown 文件（16 个变体 + 4 个工具）、5 个共享基础 prompt 文件、`best-of-n-with-judge` 技能（SKILL.md + 3 个 prompt 模板）以及设计/计划文档。
  - 更新 `config-templates/oh-my-opencode-slim.superpowers-bridge.jsonc`：为 best-of-N + 工具代理新增 20 个带 model + variant + orchestratorPrompt 的代理条目。
  - 更新 `prompt-bridges/oracle_append.md`：新增"多候选审查（best-of-N 模式）"章节，教授 oracle 裁定格式。
  - 更新 `prompt-bridges/orchestrator_append.md`：新增"Best-of-N 感知"章节，教授控制器何时调用该技能。
  - 更新 `snapshots/oh-my-opencode-slim/src/cli/superpowers-policy.ts` 和 `snapshots/oh-my-opencode-slim/src/cli/skills.ts` 反映补丁 0003 后状态。
  - 更新 `README.md`、`docs/architecture.md`、`docs/install.md`、`docs/verify.md` 加入可选 best-of-N 安装/验证指导。
- Best-of-N 为可选功能。基础补丁工具包（补丁 0001 + 0002 + bridges + 基础代理模板）无需应用补丁 0003 或复制 `opencode-config/` 即可工作。

## 2026-04-22

- 初始公开补丁工具包仓库搭建
- 为已验证的本地 `superpowers + oh-my-opencode-slim` 集成添加基线项目元数据和兼容性说明
