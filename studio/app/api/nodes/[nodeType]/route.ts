/**
 * Nodes API - Get specific node metadata
 * 
 * Returns detailed metadata for a specific node type
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
 * GET /api/nodes/[nodeType]
 * 
 * Get metadata for a specific node type
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ nodeType: string }> }
) {
    try {
        // Ensure nodes are registered
        ensureNodesRegistered();
        
        const { nodeType } = await params;
        const NodeClass = NodeRegistry.get(nodeType);
        
        if (!NodeClass) {
            return NextResponse.json(
                { error: `Node type '${nodeType}' not found` },
                { status: 404 }
            );
        }
        
        const metadata = NodeClass.getMetadata();
        
        return NextResponse.json(metadata);
        
    } catch (error: any) {
        console.error('[Nodes API] Get node error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to get node metadata' },
            { status: 500 }
        );
    }
}
