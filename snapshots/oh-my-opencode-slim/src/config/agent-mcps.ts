import {
  type AgentName,
  getAgentOverride,
  McpNameSchema,
  type PluginConfig,
} from '.';
import { getRestrictedMcpDenies } from './agent-mcp-blacklist';

/** Default MCPs per agent - "*" means all MCPs, "!item" excludes specific MCPs */

export const DEFAULT_AGENT_MCPS: Record<AgentName, string[]> = {
  orchestrator: ['*', '!context7'],
  designer: [],
  oracle: [],
  librarian: ['websearch', 'context7', 'gh_grep'],
  explorer: [],
  fixer: [],
  observer: [],
  council: [],
  councillor: [],
};

/**
 * Parse a list with wildcard and exclusion syntax.
 */
export function parseList(items: string[], allAvailable: string[]): string[] {
  if (!items || items.length === 0) {
    return [];
  }

  const allow = items.filter((i) => !i.startsWith('!'));
  const deny = items.filter((i) => i.startsWith('!')).map((i) => i.slice(1));

  if (deny.includes('*')) {
    return [];
  }

  if (allow.includes('*')) {
    return allAvailable.filter((item) => !deny.includes(item));
  }

  return allow.filter(
    (item) => !deny.includes(item) && allAvailable.includes(item),
  );
}

/**
 * Get available MCP names from schema and config.
 */
export function getAvailableMcpNames(config?: PluginConfig): string[] {
  const builtinMcps = McpNameSchema.options;
  const disabled = new Set(config?.disabled_mcps ?? []);
  return builtinMcps.filter((name) => !disabled.has(name));
}

/**
 * Get the MCP list for an agent (from config or defaults).
 */
export function getAgentMcpList(
  agentName: string,
  config?: PluginConfig,
): string[] {
  const agentConfig = getAgentOverride(config, agentName);
  if (agentConfig?.mcps !== undefined) {
    return agentConfig.mcps;
  }

  const defaultMcps = DEFAULT_AGENT_MCPS[agentName as AgentName];
  return defaultMcps ?? [];
}

/**
 * Build a complete MCP permission rules map for an agent.
 *
 * For each MCP in `allMcpNames`, creates an `allow`|`deny` entry keyed by
 * `{mcpName}_*`. Then injects restricted MCP deny overrides from the
 * patch-kit v2 blacklist, ensuring that restricted third-party MCPs are
 * always denied even when the agent's explicit allow-list would otherwise
 * include them.
 *
 * @param agentName  - Agent name (possibly suffixed, e.g. `fixer-alpha`)
 * @param allMcpNames - All MCP names known to the system
 * @param allowedMcps - MCP names the agent is allowed to use (pre-parsed)
 */
export function buildAgentMcpPermissionRules(
  agentName: string,
  allMcpNames: string[],
  allowedMcps: string[],
): Record<string, 'allow' | 'deny'> {
  const permissions: Record<string, 'allow' | 'deny'> = {};

  for (const mcpName of allMcpNames) {
    const sanitizedMcpName = mcpName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const permissionKey = `${sanitizedMcpName}_*`;
    permissions[permissionKey] = allowedMcps.includes(mcpName) ? 'allow' : 'deny';
  }

  // --- patch-kit v2: restricted MCP deny rules ---
  const restrictedDenies = getRestrictedMcpDenies(agentName);
  for (const mcpName of restrictedDenies) {
    permissions[`${mcpName}_*`] = 'deny';
  }
  // --- end patch-kit v2 ---

  return permissions;
}
