/**
 * Session Management - Backpack as Single Source of Truth
 * 
 * Studio maintains sessions as Backpack instances.
 * Conversation history is reconstructed from Backpack commits (git-like).
 */

import { Backpack, EventStreamer } from 'backpackflow';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// In-memory session store (could be Redis, DB, etc. in production)
const sessions = new Map<string, Backpack>();
const streamers = new Map<string, EventStreamer>();

/**
 * Get or create Backpack for session
 */
export function getBackpack(sessionId: string): Backpack {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, new Backpack());
  }
  return sessions.get(sessionId)!;
}

/**
 * Get or create EventStreamer for session
 */
export function getEventStreamer(sessionId: string): EventStreamer {
  if (!streamers.has(sessionId)) {
    streamers.set(sessionId, new EventStreamer());
  }
  return streamers.get(sessionId)!;
}

/**
 * Save Backpack instance
 * (In-memory for now, could persist to disk/DB)
 */
export function saveBackpack(sessionId: string, backpack: Backpack): void {
  sessions.set(sessionId, backpack);
  
  // TODO: Optional persistence
  // await db.sessions.upsert({
  //   id: sessionId,
  //   state: backpack.exportState(),
  //   updatedAt: Date.now()
  // });
}

/**
 * Reconstruct conversation from Backpack commits
 * 
 * Query Backpack like `git log` - no manual state management!
 * 
 * Note: Deduplicates messages by content + timestamp to handle
 * internal agent commits that shouldn't appear in chat UI
 */
export function reconstructConversation(
  backpack: Backpack,
  userInputKey: string = 'userMessage',
  agentOutputKey: string = 'response'
): ChatMessage[] {
  // Get all commits for user messages (use getKeyHistory, not getHistory)
  const userMessages = backpack.getKeyHistory(userInputKey) || [];
  
  // Get all commits for agent responses
  const agentResponses = backpack.getKeyHistory(agentOutputKey) || [];
  
  // Deduplicate: Only keep the LATEST commit for each unique content+timestamp combo
  const seenMessages = new Set<string>();
  const conversation: ChatMessage[] = [];
  
  // Collect all messages (use newValue, not value)
  const allMessages = [
    ...userMessages.map(m => ({ 
      role: 'user' as const, 
      content: String(m.newValue || ''), 
      timestamp: m.timestamp 
    })),
    ...agentResponses.map(m => ({ 
      role: 'assistant' as const, 
      content: String(m.newValue || ''), 
      timestamp: m.timestamp 
    }))
  ];
  
  // Sort by timestamp
  allMessages.sort((a, b) => a.timestamp - b.timestamp);
  
  // Deduplicate by content (in case of internal repacking)
  for (const msg of allMessages) {
    const key = `${msg.role}:${msg.content}`;
    if (!seenMessages.has(key) && msg.content.trim()) {
      seenMessages.add(key);
      conversation.push(msg);
    }
  }
  
  return conversation;
}

/**
 * Clear session (delete Backpack)
 */
export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Get all active sessions (for debugging)
 */
export function getActiveSessions(): string[] {
  return Array.from(sessions.keys());
}


