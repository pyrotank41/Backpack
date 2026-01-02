/**
 * POST /api/chat
 * 
 * Execute agent with user message
 * Architecture: Load Backpack → Pack → Run → Reconstruct → Return
 */

import { NextResponse } from 'next/server';
import { getBackpack, saveBackpack, reconstructConversation, getEventStreamer } from '@/lib/session';
import { getAgent } from '@/lib/agent-discovery';
import { loadAgent, prepareInput, readOutput } from '@/lib/agent-loader';

interface ChatRequest {
  agentId: string;
  message: string;
  sessionId: string;
}

export async function POST(request: Request) {
  try {
    const body: ChatRequest = await request.json();
    const { agentId, message, sessionId } = body;
    
    // Validate input
    if (!agentId || !message || !sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: agentId, message, sessionId'
      }, { status: 400 });
    }
    
    // 1. GET AGENT METADATA
    const metadata = await getAgent(agentId);
    if (!metadata) {
      return NextResponse.json({
        success: false,
        error: `Agent not found: ${agentId}`
      }, { status: 404 });
    }
    
    // Find chat trigger
    const chatTrigger = metadata.triggers.find(t => t.type === 'chat');
    if (!chatTrigger) {
      return NextResponse.json({
        success: false,
        error: 'Agent is not chat-compatible'
      }, { status: 400 });
    }
    
    // 2. LOAD BACKPACK (single source of truth)
    const backpack = getBackpack(sessionId);
    const eventStreamer = getEventStreamer(sessionId);
    
    // 3. PACK INPUT (creates commit)
    prepareInput(backpack, metadata, message);
    
    // 4. RUN AGENT (creates more commits)
    const flow = await loadAgent(metadata, backpack, eventStreamer);
    
    // Apply timeout if specified
    const timeout = metadata.behavior?.timeout || 60000;
    await Promise.race([
      flow.run({}),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Agent timeout')), timeout)
      )
    ]);
    
    // 5. READ OUTPUT
    const response = readOutput(backpack, metadata);
    
    // 6. RECONSTRUCT CONVERSATION FROM COMMITS
    const conversation = reconstructConversation(
      backpack,
      chatTrigger.inputKey,
      metadata.outputs.chat.outputKey
    );
    
    // 7. SAVE BACKPACK (if preserveState)
    if (metadata.behavior?.preserveState !== false) {
      saveBackpack(sessionId, backpack);
    }
    
    return NextResponse.json({
      success: true,
      response,
      conversation,
      format: metadata.outputs.chat.format,
      metadata: {
        agentId: metadata.id,
        agentName: metadata.name,
        messageCount: conversation.length
      }
    });
    
  } catch (error) {
    console.error('[API /chat] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process message',
      response: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}


