/**
 * Nodes API - List all registered nodes
 * 
 * Returns node metadata from NodeRegistry for Studio UI
 */

import { NextRequest, NextResponse } from 'next/server';
import { NodeRegistry } from '@backpackflow/nodes/registry';
import { registerYouTubeAgentNodes } from '@tutorials/youtube-research-agent/register-nodes';

// Ensure nodes are registered on first request
let nodesRegistered = false;
function ensureNodesRegistered() {
    if (!nodesRegistered) {
        registerYouTubeAgentNodes();
        nodesRegistered = true;
    }
}

/**
 * GET /api/nodes
 * 
 * List all registered nodes with their metadata
 * 
 * Query params:
 * - category: Filter by category (optional)
 * - search: Search by name/description (optional)
 */
export async function GET(request: NextRequest) {
    try {
        // Ensure nodes are registered
        ensureNodesRegistered();
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const search = searchParams.get('search');
        
        // Build filter
        const filter: any = {};
        if (category) {
            filter.category = category;
        }
        
        // Get nodes from registry
        let nodes = NodeRegistry.list(filter);
        
        // Apply search if provided
        if (search) {
            const searchLower = search.toLowerCase();
            nodes = nodes.filter(node => 
                node.displayName.toLowerCase().includes(searchLower) ||
                node.description.toLowerCase().includes(searchLower) ||
                node.tags?.some(tag => tag.toLowerCase().includes(searchLower))
            );
        }
        
        // Extract unique categories
        const categories = [...new Set(nodes.map(n => n.category))].sort();
        
        return NextResponse.json({
            nodes,
            total: nodes.length,
            categories
        });
        
    } catch (error: any) {
        console.error('[Nodes API] List error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to list nodes' },
            { status: 500 }
        );
    }
}
