/**
 * Node Registration for YouTube Research Agent
 * 
 * Registers all nodes with the NodeRegistry for discovery by:
 * - Studio UI (node palette)
 * - AI agents (workflow composition)
 * - Documentation generation
 */

import { NodeRegistry } from '../../src/nodes/registry';
import { YouTubeSearchNode } from './youtube-search-node';
import { DataAnalysisNode } from './data-analysis-node';
import { BaseChatCompletionNode } from './base-chat-completion-node';

/**
 * Register all YouTube Research Agent nodes
 * 
 * Call this function before using the nodes in a flow.
 */
export function registerYouTubeAgentNodes(): void {
    // Register nodes
    NodeRegistry.register('YouTubeSearchNode', YouTubeSearchNode);
    NodeRegistry.register('DataAnalysisNode', DataAnalysisNode);
    NodeRegistry.register('BaseChatCompletionNode', BaseChatCompletionNode);
    
    console.log('[NodeRegistry] Registered YouTube Research Agent nodes:', 
        NodeRegistry.getTypes()
    );
}

/**
 * Check if nodes are registered
 */
export function areNodesRegistered(): boolean {
    return NodeRegistry.has('YouTubeSearchNode') &&
           NodeRegistry.has('DataAnalysisNode') &&
           NodeRegistry.has('BaseChatCompletionNode');
}

// Auto-register if running this file directly
if (require.main === module) {
    registerYouTubeAgentNodes();
    
    // Display registered nodes
    console.log('\n=== Registered Nodes ===');
    const nodes = NodeRegistry.list();
    
    for (const node of nodes) {
        console.log(`\n${node.displayName} (${node.name})`);
        console.log(`  Category: ${node.category}`);
        console.log(`  Icon: ${node.icon}`);
        console.log(`  Description: ${node.description}`);
        
        if (node.properties && node.properties.length > 0) {
            console.log('  Properties:');
            for (const prop of node.properties) {
                console.log(`    - ${prop.displayName} (${prop.type})${prop.required ? ' [required]' : ''}`);
            }
        }
    }
    
    // Display stats
    console.log('\n=== Registry Stats ===');
    const stats = NodeRegistry.getStats();
    console.log(`Total nodes: ${stats.total}`);
    console.log('By category:', stats.byCategory);
    
    // Test search
    console.log('\n=== Search Test ===');
    const youtubeNodes = NodeRegistry.search('youtube');
    console.log(`Found ${youtubeNodes.length} nodes matching "youtube":`);
    youtubeNodes.forEach(n => console.log(`  - ${n.displayName}`));
}
