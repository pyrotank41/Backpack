import { NextResponse } from 'next/server';
import { getAgent } from '@/lib/agent-discovery';
import { getAgentGraph } from '@/lib/agent-loader';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const metadata = await getAgent(agentId);

    if (!metadata) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }

    const graph = await getAgentGraph(metadata);

    return NextResponse.json({
      success: true,
      graph,
      metadata
    });
  } catch (error) {
    console.error('[Agent Graph API] Error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
