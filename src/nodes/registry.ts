/**
 * Node Registry
 * 
 * Central catalog of all available nodes for discovery by:
 * - Studio UI (for node palette)
 * - AI agents (for workflow composition)
 * - Documentation generation
 * 
 * Similar to n8n's node discovery system.
 */

import { BackpackNode } from './backpack-node';
import { NodeDescription } from '../types/node-metadata';

/**
 * Node metadata with type information
 */
export interface NodeMetadata extends NodeDescription {
    type: string;
    class: typeof BackpackNode;
}

/**
 * Node Registry - Central catalog of all nodes
 * 
 * Usage:
 * ```typescript
 * // Register a node
 * NodeRegistry.register('YouTubeSearchNode', YouTubeSearchNode);
 * 
 * // Discover nodes
 * const allNodes = NodeRegistry.list();
 * const apiNodes = NodeRegistry.list({ category: 'api-client' });
 * 
 * // Search nodes
 * const youtubeNodes = NodeRegistry.search('youtube');
 * 
 * // Get specific node
 * const NodeClass = NodeRegistry.get('YouTubeSearchNode');
 * ```
 */
export class NodeRegistry {
    private static nodes = new Map<string, typeof BackpackNode>();
    
    /**
     * Register a node type
     * 
     * @param type - Unique type identifier (usually class name)
     * @param nodeClass - The BackpackNode class
     */
    static register(type: string, nodeClass: typeof BackpackNode): void {
        if (this.nodes.has(type)) {
            console.warn(`[NodeRegistry] Node type '${type}' is already registered. Overwriting.`);
        }
        this.nodes.set(type, nodeClass);
    }
    
    /**
     * Get a node class by type
     * 
     * @param type - The node type identifier
     * @returns The node class or undefined if not found
     */
    static get(type: string): typeof BackpackNode | undefined {
        return this.nodes.get(type);
    }
    
    /**
     * Check if a node type exists
     * 
     * @param type - The node type identifier
     */
    static has(type: string): boolean {
        return this.nodes.has(type);
    }
    
    /**
     * Unregister a node type
     * 
     * @param type - The node type identifier
     */
    static unregister(type: string): boolean {
        return this.nodes.delete(type);
    }
    
    /**
     * List all registered nodes with optional filtering
     * 
     * @param filter - Optional filter criteria
     * @returns Array of node metadata
     * 
     * @example
     * ```typescript
     * // All nodes
     * const all = NodeRegistry.list();
     * 
     * // By category
     * const apiNodes = NodeRegistry.list({ category: 'api-client' });
     * 
     * // By group
     * const llmNodes = NodeRegistry.list({ group: 'llm' });
     * 
     * // By tags
     * const youtubeNodes = NodeRegistry.list({ tags: ['youtube'] });
     * ```
     */
    static list(filter?: {
        category?: string;
        group?: string;
        tags?: string[];
    }): NodeMetadata[] {
        const nodes: NodeMetadata[] = [];
        
        for (const [type, nodeClass] of this.nodes.entries()) {
            const description = nodeClass.getMetadata();
            
            if (!description) {
                console.warn(`[NodeRegistry] Node '${type}' has no metadata. Skipping.`);
                continue;
            }
            
            // Apply filters
            if (filter?.category && description.category !== filter.category) {
                continue;
            }
            
            if (filter?.group && description.group !== filter.group) {
                continue;
            }
            
            if (filter?.tags) {
                const hasAllTags = filter.tags.every(tag => 
                    description.tags?.includes(tag)
                );
                if (!hasAllTags) {
                    continue;
                }
            }
            
            nodes.push({
                type,
                class: nodeClass,
                ...description,
            });
        }
        
        // Sort by display name
        return nodes.sort((a, b) => 
            a.displayName.localeCompare(b.displayName)
        );
    }
    
    /**
     * Get nodes grouped by category
     * 
     * @returns Object with categories as keys and node arrays as values
     * 
     * @example
     * ```typescript
     * const grouped = NodeRegistry.listByCategory();
     * // {
     * //   'api-client': [...],
     * //   'analysis': [...],
     * //   'llm': [...]
     * // }
     * ```
     */
    static listByCategory(): Record<string, NodeMetadata[]> {
        const nodes = this.list();
        const grouped: Record<string, NodeMetadata[]> = {};
        
        for (const node of nodes) {
            if (!grouped[node.category]) {
                grouped[node.category] = [];
            }
            grouped[node.category].push(node);
        }
        
        return grouped;
    }
    
    /**
     * Search nodes by name, description, or tags
     * 
     * @param query - Search query (case-insensitive)
     * @returns Matching nodes
     * 
     * @example
     * ```typescript
     * const results = NodeRegistry.search('youtube');
     * // Returns: [YouTubeSearchNode, YouTubeTransformNode, ...]
     * ```
     */
    static search(query: string): NodeMetadata[] {
        const lowerQuery = query.toLowerCase();
        
        return this.list().filter(node => 
            node.displayName.toLowerCase().includes(lowerQuery) ||
            node.name.toLowerCase().includes(lowerQuery) ||
            node.description.toLowerCase().includes(lowerQuery) ||
            node.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
    }
    
    /**
     * Get all registered node types
     * 
     * @returns Array of node type identifiers
     */
    static getTypes(): string[] {
        return Array.from(this.nodes.keys());
    }
    
    /**
     * Get total number of registered nodes
     */
    static count(): number {
        return this.nodes.size;
    }
    
    /**
     * Clear all registered nodes (useful for testing)
     */
    static clear(): void {
        this.nodes.clear();
    }
    
    /**
     * Get statistics about registered nodes
     * 
     * @returns Statistics object
     */
    static getStats(): {
        total: number;
        byCategory: Record<string, number>;
        byGroup: Record<string, number>;
    } {
        const nodes = this.list();
        const stats = {
            total: nodes.length,
            byCategory: {} as Record<string, number>,
            byGroup: {} as Record<string, number>,
        };
        
        for (const node of nodes) {
            // Count by category
            stats.byCategory[node.category] = 
                (stats.byCategory[node.category] || 0) + 1;
            
            // Count by group
            stats.byGroup[node.group] = 
                (stats.byGroup[node.group] || 0) + 1;
        }
        
        return stats;
    }
}
