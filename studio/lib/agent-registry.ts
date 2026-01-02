/**
 * Agent Registry - Explicit imports of all agents
 * 
 * Since Next.js can't dynamically import TS files from outside the app,
 * we explicitly import and register agents here.
 * 
 * Add your agents here as you create them!
 */

import { YouTubeResearchAgentNode } from '../../tutorials/youtube-research-agent/youtube-research-agent';

// Type for agent node classes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AgentNodeClass = new (...args: any[]) => any;

/**
 * Registry of all available agent node classes
 * Key: agent ID (must match metadata.json)
 */
export const AGENT_REGISTRY: Record<string, AgentNodeClass> = {
  'youtube-research': YouTubeResearchAgentNode,
};

/**
 * Get agent node class by ID
 */
export function getAgentNodeClass(agentId: string): AgentNodeClass {
  const NodeClass = AGENT_REGISTRY[agentId];
  
  if (!NodeClass) {
    throw new Error(
      `Agent not found in registry: ${agentId}\n` +
      `Available agents: ${Object.keys(AGENT_REGISTRY).join(', ')}\n` +
      `Make sure to add your agent to studio/lib/agent-registry.ts`
    );
  }
  
  return NodeClass;
}

/**
 * Check if agent is registered
 */
export function isAgentRegistered(agentId: string): boolean {
  return agentId in AGENT_REGISTRY;
}
