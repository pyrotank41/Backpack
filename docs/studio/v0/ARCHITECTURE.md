# Backpack Studio Architecture (Final)

**Date**: December 21, 2024  
**Status**: ✅ Finalized

---

## 🎯 The Big Picture

```
┌─────────────────────────────────────────────────────────┐
│                    USER (Browser)                        │
│                                                          │
│  Types: "Find AI videos"                                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│              STUDIO (Next.js - Thin Layer)               │
│                                                          │
│  1. getBackpack(sessionId)                              │
│  2. backpack.pack('userMessage', message)  ← COMMIT     │
│  3. await flow.run()                                     │
│  4. reconstructConversation(backpack)      ← QUERY      │
│  5. return { response, conversation }                    │
│                                                          │
│  ❌ NO state management                                  │
│  ❌ NO conversation arrays                               │
│  ✅ Just load → pack → run → query                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│         BACKPACK (Single Source of Truth)                │
│                                                          │
│  Git-like commit history:                               │
│  ├─ Commit #1: userMessage = "Find AI videos"          │
│  ├─ Commit #2: searchQuery = "Find AI videos"          │
│  ├─ Commit #3: videos = [...50 results...]              │
│  ├─ Commit #4: outliers = [...5 results...]             │
│  ├─ Commit #5: chatResponse = "Here are 5..."          │
│  └─ Commit #6: analysis = "Here are 5..."              │
│                                                          │
│  Query API:                                             │
│  ├─ getHistory('userMessage')  → All user messages     │
│  ├─ getHistory('analysis')     → All responses          │
│  ├─ unpack('videos')           → Latest value           │
│  └─ getSnapshotAt(timestamp)   → Time-travel            │
│                                                          │
│  ✅ Automatic timestamps                                 │
│  ✅ Full history preserved                               │
│  ✅ Query like `git log`                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│            AGENT (Business Logic)                        │
│                                                          │
│  async _exec(input) {                                   │
│    const userMessage = this.backpack.unpack('userMessage');│
│                                                          │
│    // Check history for follow-ups                      │
│    const previousMessages = this.backpack.getHistory('userMessage');│
│    const isFollowUp = previousMessages.length > 1;      │
│                                                          │
│    if (isFollowUp) {                                    │
│      // Use cached data                                 │
│      const videos = this.backpack.unpack('videos');     │
│      const result = this.handleFollowUp(userMessage, videos);│
│      this.backpack.pack('analysis', result);  ← COMMIT  │
│    } else {                                             │
│      // Run internal flow                               │
│      await this.internalFlow.run();                     │
│      const chatResponse = this.backpack.unpack('chatResponse');│
│      this.backpack.pack('analysis', chatResponse); ← COMMIT│
│    }                                                     │
│  }                                                       │
│                                                          │
│  ❌ NO conversationHistory array                         │
│  ✅ Just pack data                                       │
│  ✅ Query Backpack when needed                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│        INTERNAL FLOW (Multi-Node Pipeline)               │
│                                                          │
│  SearchNode → DataAnalysisNode → LLMNode                │
│     ↓               ↓                  ↓                 │
│  Pack videos    Pack outliers   Pack chatResponse       │
│   (Commit)       (Commit)          (Commit)             │
│                                                          │
│  LLMNode (separate concerns):                           │
│  ├─ System prompt in constructor (NOT metadata)         │
│  ├─ prep(): Build messages from Backpack data           │
│  └─ exec(): Call OpenAI with messages                   │
│                                                          │
│  ❌ NO Studio conversation passed in                     │
│  ✅ Constructs own messages from Backpack                │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Conversation Reconstruction

### **How It Works**

```typescript
// Studio's reconstructConversation() function
function reconstructConversation(backpack: Backpack): ChatMessage[] {
  // Query Backpack for all commits (git-like)
  const userMessages = backpack.getHistory('userMessage');
  const responses = backpack.getHistory('analysis');
  
  // Interleave by timestamp
  const conversation = [];
  let i = 0, j = 0;
  
  while (i < userMessages.length || j < responses.length) {
    const userMsg = userMessages[i];
    const respMsg = responses[j];
    
    if (!respMsg || (userMsg && userMsg.timestamp < respMsg.timestamp)) {
      conversation.push({
        role: 'user',
        content: userMsg.value,
        timestamp: userMsg.timestamp
      });
      i++;
    } else {
      conversation.push({
        role: 'assistant',
        content: respMsg.value,
        timestamp: respMsg.timestamp
      });
      j++;
    }
  }
  
  return conversation;
}
```

### **Example Timeline**

```
Time: 10:00:00
├─ Commit #1: userMessage = "Find AI videos"
├─ Commit #2-5: [Agent processing...]
├─ Commit #6: analysis = "Here are 5 breakthrough videos..."

Time: 10:02:00
├─ Commit #7: userMessage = "Show me the top 3"
├─ Commit #8: analysis = "Here are the top 3..."

Reconstructed Conversation:
[
  { role: 'user', content: 'Find AI videos', timestamp: 10:00:00 },
  { role: 'assistant', content: 'Here are 5...', timestamp: 10:00:05 },
  { role: 'user', content: 'Show me the top 3', timestamp: 10:02:00 },
  { role: 'assistant', content: 'Here are the top 3...', timestamp: 10:02:02 }
]
```

---

## 🎯 Session Management

### **Simple In-Memory Store**

```typescript
// lib/session.ts

const sessions = new Map<string, Backpack>();

export function getBackpack(sessionId: string): Backpack {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, new Backpack());
  }
  return sessions.get(sessionId)!;
}

export function saveBackpack(sessionId: string, backpack: Backpack): void {
  sessions.set(sessionId, backpack);
  
  // Optional: Persist to disk/DB
  // await db.sessions.upsert({ id: sessionId, state: backpack.export() });
}
```

**That's it!** No conversation arrays, no duplicate state.

---

## 📋 Comparison: Old vs New

### **Old Approach (Rejected)**

```typescript
// ❌ Duplicate state management
const session = {
  backpack: new Backpack(),
  conversationHistory: [
    { role: 'user', content: '...' },
    { role: 'assistant', content: '...' }
  ]
};

// Agent manually updates
const history = this.backpack.unpack('conversationHistory') || [];
history.push({ role: 'user', content: message });
this.backpack.pack('conversationHistory', history);

// Studio maintains separate array
session.conversationHistory.push({ role: 'user', content: message });
```

**Problems:**
- 2 sources of truth (can get out of sync)
- Manual array management (error-prone)
- No time-travel (history is mutable)
- Agent code is complex

### **New Approach (Approved)**

```typescript
// ✅ Single source of truth
const backpack = getBackpack(sessionId);

// Just pack data (creates commit)
backpack.pack('userMessage', message);

// Agent just packs results
this.backpack.pack('analysis', result);

// Studio reconstructs from commits
const conversation = reconstructConversation(backpack);
```

**Benefits:**
- 1 source of truth (Backpack)
- No manual management (automatic commits)
- Time-travel built-in (query at any timestamp)
- Agent code is simple

---

## 🔑 Key Principles

### **1. Single Source of Truth**
```
❌ Studio maintains state
❌ Agent maintains state
✅ Backpack stores everything
```

### **2. Query, Don't Store**
```
❌ Store conversationHistory array
✅ Reconstruct from commits
```

### **3. Git-Like Commits**
```
Every pack() = commit with timestamp
Query like: git log --grep="userMessage"
```

### **4. Separation of Concerns**
```
Studio:  UI + Query
Agent:   Logic + Pack
LLM:     Prompts + Inference
Backpack: State + History
```

### **5. Time-Travel First**
```
All features work at any timestamp:
- reconstructConversation(backpack, timestamp)
- backpack.getSnapshotAt(timestamp)
- backpack.getHistory('key', { before: timestamp })
```

### **6. Thin Layers**
```
Studio:  ~50 lines (load → pack → run → query)
Agent:   No state management code
Session: ~20 lines (get/save Backpack)
```

### **7. Explicit > Implicit**
```
metadata.json declares:
- triggers (what starts flow)
- outputs (where to read response)
- behavior (preserveState, timeout)

NOT in metadata:
- systemPrompt (belongs to LLM nodes)
- conversationHistory (reconstructed)
```

---

## ✅ Decision Summary

| Decision | Status |
|----------|--------|
| Backpack as single source of truth | ✅ Approved |
| Conversation reconstructed from commits | ✅ Approved |
| No manual conversationHistory management | ✅ Approved |
| System prompts in LLM nodes, not metadata | ✅ Approved |
| Studio is thin UI layer | ✅ Approved |
| Session = Backpack instance | ✅ Approved |
| Time-travel via getSnapshotAt() | ✅ Approved |
| Git-like query pattern | ✅ Approved |
| OpenAI-compatible conversation format | ✅ Approved |
| Trigger-based architecture | ✅ Approved |

---

## 🚀 Ready to Build

**Status**: All architectural decisions finalized  
**Next Step**: Scaffold Next.js 16 app in `/studio`

**Estimated Time**: 12-15 hours (1 weekend sprint)

---

**Last Updated**: December 21, 2024  
**Approved By**: Karan Singh Kochar

