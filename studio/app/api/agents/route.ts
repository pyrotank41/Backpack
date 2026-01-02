/**
 * GET /api/agents
 * 
 * Returns list of all Studio-compatible agents
 */

import { NextResponse } from 'next/server';
import { discoverAgents } from '@/lib/agent-discovery';

export async function GET() {
  try {
    const agents = await discoverAgents();
    
    return NextResponse.json({
      success: true,
      agents,
      count: agents.length
    });
  } catch (error) {
    console.error('[API /agents] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to discover agents',
      agents: [],
      count: 0
    }, { status: 500 });
  }
}


