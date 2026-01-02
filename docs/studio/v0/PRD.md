# Backpack Studio PRD

**Status**: Planning  
**Owner**: Karan Singh Kochar  
**Date**: December 21, 2024  
**Purpose**: Internal development tool (not a product)

> **💡 Tip**: For collapsible sections, you can use `<details>` tags in markdown (GitHub-flavored markdown):
> ```markdown
> <details>
> <summary>Click to expand</summary>
> 
> Hidden content here
> </details>
> ```

---

## 🎯 Problem Statement

**Problem**: Building and debugging BackpackFlow agents requires:
- Terminal-only interaction (no UI)
- Manual log inspection (no visualization)
- Code changes for every test (slow iteration)
- No way to demo agents to clients (just code)

**Solution**: Backpack Studio - A local development UI for building, testing, and demoing agents.

---

## 🎯 Goals

### Primary Goals (Must Have)
1. **Chat with agents** - Test agents conversationally without code changes
2. **See markdown responses** - Properly rendered AI responses
3. **Fast iteration** - Test agent changes immediately

### Secondary Goals (Nice to Have)
4. **Flow visualization** - See nodes executing in real-time
5. **Event stream** - Debug with full event history
6. **Export results** - Save conversations/insights to files

### Future Goals (Later)
7. **Agent builder UI** - Create agents visually
8. **Multi-agent conversations** - Multiple agents talking
9. **Time-travel debugging** - Replay execution with Backpack snapshots

---

## 🎯 Non-Goals (For Initial Development)

**What Studio is NOT (for now)**:

- ❌ Not a product to sell (initially)
- ❌ Not a hosted service (initially)
- ❌ Not for non-technical users (initially)
- ❌ Not a replacement for code
- ❌ Not changing the BackpackFlow library

**Important**: These are constraints for **initial development** to keep scope manageable. Studio could evolve into a product, hosted service, or tool for non-technical users in the future. For now, it's a personal workshop.

**Current Focus**: Build a tool that helps YOU work faster. If it becomes useful to others later, that's a bonus, not the goal.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────┐
│     Backpack Studio (Next.js App)      │
│                                        │
│  ┌──────────────┐  ┌───────────────┐ │
│  │  Chat UI     │  │  Agent Picker │ │
│  │  (Frontend)  │  │  (Dropdown)   │ │
│  └──────┬───────┘  └───────────────┘ │
│         │                              │
│         ↓                              │
│  ┌──────────────────────────────────┐ │
│  │   API Route (/api/chat)          │ │
│  │   - Load agent config            │ │
│  │   - Run BackpackFlow agent       │ │
│  │   - Stream results back          │ │
│  └──────┬───────────────────────────┘ │
└─────────┼──────────────────────────────┘
          │
          ↓
┌─────────────────────────────────────────┐
│    BackpackFlow Library (Local)         │
│    - YouTubeResearchAgent               │
│    - EventStreamer                      │
│    - Backpack                           │
└─────────────────────────────────────────┘
```

---

## 📦 Tech Stack

**Frontend**:
- Next.js 16 (App Router)
- React 19
- TailwindCSS
- react-markdown (for AI responses)

**Backend**:
- Next.js API Routes
- BackpackFlow (local, via `"backpackflow": "file:.."`)

**Why This Stack?**:
- ✅ Simple: Everything in one repo
- ✅ Fast: No separate backend setup
- ✅ Flexible: Easy to add pages/features
- ✅ Local: No deployment needed

---

## 🚀 Phase 1: Agent Discovery & Chat (Week 1)

### Features
1. **Agent Auto-Discovery**
   - Scans `/tutorials/` folder for agents
   - Uses FlowLoader to serialize each agent
   - Checks for chat compatibility (input/output contracts)
   - Auto-populates agent list (no hardcoding!)

2. **Agent List (Homepage)**
   - Shows all discovered agents
   - Only displays chat-compatible agents
   - Click to open chat interface

3. **Chat Window**
   - Input: Text field for questions
   - Output: Markdown-rendered responses
   - History: Scrollable conversation
   - Status: "Searching... Analyzing... Done ✅"

4. **Chat Compatibility Convention**
   - Agent must have `userInput` or `query` input contract
   - Agent must have `response` or `output` output contract
   - Or agent exports `metadata.chatCompatible = true`

### API Endpoint
```typescript
// app/api/chat/route.ts
POST /api/chat
Request: { agent: "youtube", message: "Find viral AI videos" }
Response: Stream { text, status, done }
```

### User Flow
```
1. User opens Studio (localhost:3000)
2. Studio auto-discovers agents from /tutorials/
3. Sees homepage with all compatible agents:
   - "YouTube Research" (discovered)
   - "Competitor Analysis" (discovered)
   - etc.
4. Clicks agent card → Chat page for that agent
5. Types: "Find viral videos about AI agents"
6. Studio:
   - Loads agent's serialized flow
   - Packs user message to agent's inputKey
   - Runs flow via FlowLoader
   - Reads response from agent's outputKey
7. User sees:
   - "Searching YouTube..." (loading)
   - "Found 12 videos..." (result)
   - Markdown list of videos with insights
8. Can ask follow-up questions (flow re-runs)
```

---

## 🎯 Core Architecture Decisions

### **Decision 1: Backpack as Single Source of Truth**
- ✅ Studio does NOT maintain conversation state
- ✅ Agent does NOT manually maintain `conversationHistory` array
- ✅ Conversation is RECONSTRUCTED from Backpack commits (git-like)
- ✅ Backpack is the session store

**Rationale**: Avoid duplicate state. Backpack already tracks every commit with timestamps. Query it like `git log`.

### **Decision 2: System Prompts Belong to LLM Nodes**
- ❌ NOT in `metadata.json`
- ✅ Set in LLM node constructor params
- **Why**: Multi-LLM flows need different prompts per node

### **Decision 3: Studio is a Thin UI Layer**
- Studio's job: Load Backpack → Pack input → Run agent → Query Backpack → Display
- Agent's job: Read input → Do work → Pack output
- Backpack's job: Store everything, enable queries, provide time-travel

---

## 💾 State Management & Conversation History

### **The Git-Like Approach**

**Key Insight**: Backpack is like Git - every `pack()` is a commit. Conversation history is reconstructed from commits, not manually maintained.

### **What Studio Does**
```typescript
// Studio ONLY manages sessions (sessionId → Backpack instance)
const sessions = new Map<string, Backpack>();

export async function POST(req: Request) {
  const { agentId, message, sessionId } = await req.json();
  
  // 1. Get Backpack (single source of truth)
  const backpack = getBackpack(sessionId);
  
  // 2. Pack user message (creates commit)
  backpack.pack('userMessage', message, { nodeId: 'studio' });
  
  // 3. Run agent (creates more commits)
  const flow = await loadAgent(agentId, backpack);
  await flow.run();
  
  // 4. Query conversation FROM BACKPACK (reconstruct from commits)
  const conversation = reconstructConversation(backpack);
  
  return Response.json({ 
    response: backpack.unpack('response'),
    conversation  // ← Built from git-like history
  });
}
```

### **What Agent Does**
```typescript
// Agent just packs data - NO manual conversation management
export class YouTubeResearchAgentNode extends BackpackNode {
    async _exec(input: any): Promise<any> {
        const userMessage = this.backpack.unpack('userMessage');
        
        // Do work
        const result = await this.process(userMessage);
        
        // Pack response (Backpack tracks it automatically)
        this.backpack.pack('response', result, { nodeId: this.id });
        
        return { success: true };
    }
}
```

### **Conversation Reconstruction**
```typescript
// Reconstruct conversation from Backpack commits
export function reconstructConversation(backpack: Backpack): ChatMessage[] {
    // Get all user messages (ordered by timestamp)
    const userMessages = backpack.getHistory('userMessage');
    
    // Get all agent responses (ordered by timestamp)
    const responses = backpack.getHistory('response');
    
    // Interleave based on timestamp
    const conversation: ChatMessage[] = [];
    
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

### **Benefits**

| Benefit | Description |
|---------|-------------|
| **No Duplicate State** | Backpack is single source of truth |
| **Automatic History** | Every `pack()` creates a commit |
| **Time-Travel** | Reconstruct at ANY timestamp |
| **Consistent** | Can't get out of sync |
| **Observable** | Full execution trace available |
| **Simple Agent Code** | Just pack data, no array management |

### **Time-Travel Example**
```typescript
// Get conversation as it existed 5 minutes ago
const snapshot = backpack.getSnapshotAt(Date.now() - 5 * 60 * 1000);
const pastConversation = reconstructConversation(snapshot);

// Studio UI could show:
// - "Show conversation 10 minutes ago"
// - "What data did agent have at message #3?"
// - "How did agent decide to respond here?"
```

---

## 🤝 Agent Convention (Trigger-Based Architecture)

**Status**: ✅ Finalized December 21, 2024

> **📘 Developer Guide**: See [`docs/STUDIO-AGENT-GUIDE.md`](../docs/STUDIO-AGENT-GUIDE.md) for step-by-step instructions on making any agent Studio-compatible.

### **Why Trigger-Based?**

Every workflow/flow has a **trigger** - something that starts it:
- Chat message from user
- Webhook from external service
- Scheduled time (cron)
- File upload
- API call

By making triggers explicit in `metadata.json`, agents become:
- ✅ **Self-documenting** - Clear what starts them
- ✅ **Multi-purpose** - Same agent, different triggers
- ✅ **Future-proof** - Easy to add new trigger types
- ✅ **Studio-compatible** - Studio checks for chat trigger

| Aspect | Old (implicit) | New (trigger-based) |
|--------|---------------|---------------------|
| **Clarity** | ❌ Hidden in code | ✅ Explicit in metadata |
| **Discovery** | ❌ Guess compatible | ✅ Check triggers array |
| **Extensibility** | ❌ Hardcoded | ✅ Add trigger types |
| **Multi-trigger** | ❌ Not possible | ✅ Multiple triggers |
| **Documentation** | ❌ Read code | ✅ Read metadata |

**All agents use `metadata.json` for consistency.**

### **Folder Structure (Universal)**

```
/tutorials/[agent-name]/
├── metadata.json       # ✅ REQUIRED if Studio-compatible
├── index.ts           # Agent code (TypeScript)
│   OR
├── flow.json          # Serialized flow (JSON-only)
└── README.md          # Documentation
```

### **metadata.json Schema (Trigger-Based)**

```json
{
  "$schema": "https://backpackflow.dev/schemas/agent-metadata.json",
  
  "id": "youtube-research",
  "name": "YouTube Research Agent",
  "description": "Find breakthrough YouTube videos in any niche",
  "version": "1.0.0",
  
  "triggers": [
    {
      "type": "chat",                    // What starts this flow
      "inputType": "text",               // text | image | audio | multimodal
      "inputKey": "query",               // Where to pack trigger data
      "description": "User asks a research question"
    }
  ],
  
  "outputs": {
    "chat": {                            // Output for chat trigger
      "outputKey": "analysis",           // Where to read response
      "format": "markdown",              // markdown | json | html | text
      "streaming": true                  // Supports streaming updates
    }
  },
  
  "behavior": {
    "preserveState": true,               // Keep Backpack between messages
    "timeout": 30000,                    // Max execution time (ms)
    "retryable": false                   // Can retry on failure
  },
  
  "notes": {
    "systemPrompt": "❌ NOT HERE - belongs to LLM nodes, not metadata",
    "conversationHistory": "❌ NOT HERE - reconstructed from Backpack commits"
  },
  
  "tags": ["youtube", "research", "video"],
  "author": "Karan Singh Kochar",
  
  "requirements": {
    "env": ["OPENAI_API_KEY", "EXA_API_KEY"],
    "dependencies": ["openai", "exa-js"]
  }
}
```

### **Example: TypeScript Agent**

```
/tutorials/youtube-research-agent/
├── metadata.json                    # ✅ Studio config
├── index.ts                          # Entry point
├── youtube-search-node.ts           # Custom nodes
├── data-analysis-node.ts
└── README.md
```

```typescript
// index.ts - NO metadata export, just code!
export class YouTubeResearchAgent extends BackpackNode {
  protected async _exec(state: any) {
    const flow = this.createInternalFlow();
    // ... agent implementation
    
    // Pack output to key from metadata.json
    this.backpack.pack('analysis', result, { nodeId: this.id });
  }
}
```

### **Example: JSON Flow Agent**

```
/tutorials/competitor-analysis/
├── metadata.json       # ✅ Studio config
├── flow.json           # Pre-serialized flow
└── README.md
```

**Both types use the same `metadata.json` format!**

---

## 🔄 Complete Trigger Flow Example

<details>
<summary><strong>📖 Click to expand full example (metadata.json + agent code + Studio API)</strong></summary>

### **metadata.json**
```json
{
  "id": "youtube-research",
  "name": "YouTube Research Agent",
  "triggers": [
    {
      "type": "chat",
      "inputType": "text",
      "inputKey": "query",
      "description": "User asks research question"
    }
  ],
  "outputs": {
    "chat": {
      "outputKey": "analysis",
      "format": "markdown",
      "streaming": true
    }
  },
  "behavior": {
    "preserveState": true,
    "timeout": 30000
  }
}
```

### **Agent Implementation**
```typescript
// index.ts
export class YouTubeResearchAgentNode extends BackpackNode {
  static namespaceSegment = "youtube";
  
  protected async _exec(state: any) {
    // 1. READ INPUT (from trigger's inputKey)
    const query = this.backpack.unpack('query');
    if (!query) {
      throw new Error('No query provided by trigger');
    }
    
    // 2. CHECK IF FOLLOW-UP (query Backpack history)
    const previousMessages = this.backpack.getHistory('query');
    const isFollowUp = previousMessages.length > 1;
    
    if (isFollowUp) {
      // Use cached data from previous turn
      const videos = this.backpack.unpack('videos');
      const result = this.handleFollowUp(query, videos);
      this.backpack.pack('analysis', result, { nodeId: this.id });
    } else {
      // 3. EXECUTE INTERNAL FLOW (first time)
      const flow = this.createInternalFlow();
      
      const search = flow.addNode(YouTubeSearchNode, { id: 'search' });
      const analyze = flow.addNode(DataAnalysisNode, { id: 'analyze' });
      const chat = flow.addNode(BaseChatCompletionNode, { 
        id: 'chat',
        systemPrompt: 'You are a YouTube expert...'  // ← System prompt in node!
      });
      
      flow.setEntryNode(search);
      search.onComplete(analyze);
      analyze.onComplete(chat);
      
      await flow.run(state);
      
      // 4. WRITE OUTPUT (to trigger's outputKey)
      const result = this.backpack.unpack('chatResponse');
      this.backpack.pack('analysis', result, { nodeId: this.id });
    }
    
    // ❌ NO manual conversationHistory management!
    // ✅ Studio reconstructs from commits
  }
  
  private handleFollowUp(query: string, videos: any[]): string {
    // Handle follow-up questions using cached data
    if (query.includes('top 3')) {
      return this.formatTop3(videos.slice(0, 3));
    }
    // ... more follow-up logic
  }
}
```

**Key Changes:**
- ✅ No `conversationHistory` array
- ✅ Query Backpack history: `backpack.getHistory('query')`
- ✅ System prompt in LLM node constructor
- ✅ Just pack data, Backpack tracks it

### **Studio Execution**
```typescript
// studio/app/api/chat/route.ts
export async function POST(req: Request) {
  const { agentId, message, sessionId } = await req.json();
  
  // Load metadata
  const metadata = loadMetadata(agentId);
  
  // Find chat trigger
  const chatTrigger = metadata.triggers.find(t => t.type === 'chat');
  if (!chatTrigger) {
    return Response.json({ error: 'Agent not chat-compatible' }, { status: 400 });
  }
  
  try {
    // 1. LOAD BACKPACK (single source of truth)
    const backpack = getBackpack(sessionId);
    
    // 2. PACK INPUT (creates commit)
    backpack.pack(chatTrigger.inputKey, message, { nodeId: 'studio' });
    
    // 3. RUN AGENT (creates more commits)
    const flow = await loadAgent(agentId, backpack);
    await Promise.race([
      flow.run(),
      timeout(metadata.behavior.timeout)
    ]);
    
    // 4. READ OUTPUT
    const response = backpack.unpack(metadata.outputs.chat.outputKey);
    
    // 5. RECONSTRUCT CONVERSATION FROM COMMITS
    const conversation = reconstructConversation(backpack);
    
    // 6. SAVE BACKPACK (if preserveState)
    if (metadata.behavior.preserveState) {
      saveBackpack(sessionId, backpack);
    }
    
    return Response.json({
      response,
      conversation,  // ← Reconstructed from Backpack commits
      format: metadata.outputs.chat.format
    });
    
  } catch (error) {
    return Response.json({
      response: `❌ Error: ${error.message}`,
      format: 'text'
    });
  }
}

// Helper: Reconstruct conversation from Backpack commits
function reconstructConversation(backpack: Backpack): ChatMessage[] {
  const userMessages = backpack.getHistory('query');  // All user inputs
  const responses = backpack.getHistory('analysis');  // All agent outputs
  
  // Interleave based on timestamp
  const conversation: ChatMessage[] = [];
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

**Key Simplifications:**
- ✅ No `session.history` array
- ✅ Conversation reconstructed from Backpack
- ✅ `getBackpack()` / `saveBackpack()` handle persistence
- ✅ Single source of truth

### **Frontend (Studio UI)**
```typescript
// studio/app/chat/[agentId]/page.tsx
async function sendMessage(message: string) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ agentId, message, sessionId })
  });
  
  const { response: text, format } = await response.json();
  
  // Render based on format
  if (format === 'markdown') {
    return <ReactMarkdown>{text}</ReactMarkdown>;
  } else {
    return <pre>{text}</pre>;
  }
}
```

### **Studio Behavior**

**Discovery**:
1. Studio scans `/tutorials/` folder
2. Looks for `metadata.json` in each subfolder
3. Checks if agent has `triggers` array with `type: "chat"`
4. Validates `inputType` is supported (currently: "text")
5. Displays compatible agents on homepage

**Message Flow (Trigger Execution)**:
1. **User triggers flow**: `"Find AI videos"` (chat trigger with text input)
2. **Studio reads metadata**:
   - Find trigger: `triggers.find(t => t.type === 'chat')`
   - Get inputKey: `trigger.inputKey` → `"query"`
   - Get outputKey: `outputs.chat.outputKey` → `"analysis"`
3. **Studio loads Backpack**: `const backpack = getBackpack(sessionId)`
4. **Studio packs input**: `backpack.pack("query", "Find AI videos")` (creates commit)
5. **Studio runs flow**: `await flow.run()` (creates more commits)
6. **Studio reconstructs conversation**: `const conversation = reconstructConversation(backpack)`
7. **Studio reads output**: `backpack.unpack("analysis")`
8. **Display in chat**: Show `conversation` with latest response

**Multi-Turn Flow (Backpack Persistence)**:
1. **Turn 1**: `"Find AI videos"` (new session)
   - New Backpack instance created
   - Studio checks `behavior.preserveState: true`
   - User message packed (commit #1)
   - Flow runs, response packed (commit #2, #3, ...)
   - Backpack saved in session (sessionId → Backpack)
   - Conversation reconstructed from commits
   
2. **Turn 2**: `"Show me the top 3"` (same session)
   - SAME Backpack instance loaded (because `preserveState: true`)
   - User message packed (commit #N)
   - Flow runs with access to ALL previous data
   - Agent can query previous commits: `backpack.getHistory('videos')`
   - Response packed (commit #N+1)
   - Conversation reconstructed from ALL commits
   
**Key**: No manual conversation management. Studio queries Backpack like `git log`.

**LLM Nodes Manage Their Own Prompts**:
```typescript
// BaseChatCompletionNode (inside agent's internal flow)
class BaseChatCompletionNode extends BackpackNode {
    private systemPrompt: string;  // ← Set in constructor
    
    constructor(params: any) {
        super(params);
        this.systemPrompt = params.systemPrompt;  // From agent code
    }
    
    async prep(shared: any): Promise<any> {
        // BUILD messages array in prep()
        const messages = [];
        
        // Add system prompt
        if (this.systemPrompt) {
            messages.push({ role: 'system', content: this.systemPrompt });
        }
        
        // Add context from Backpack (not from Studio's conversation)
        const analysisData = this.backpack.unpack('outliers');
        const userQuery = this.backpack.unpack('searchQuery');
        
        messages.push({
            role: 'user',
            content: `Query: ${userQuery}\n\nData: ${JSON.stringify(analysisData)}`
        });
        
        return { messages };
    }
    
    async _exec(input: any): Promise<any> {
        // Execute LLM call
        const completion = await openai.chat.completions.create({
            model: this.model,
            messages: input.messages  // ← Built in prep()
        });
        
        const response = completion.choices[0].message.content;
        this.backpack.pack('chatResponse', response);
        
        return { success: true };
    }
}
```

**Key**: Studio's conversation is UI-level. LLM nodes construct their own messages from Backpack data.

</details>

---

## 📋 Architecture Summary

### **Separation of Concerns**

| Layer | Responsibility | State Management |
|-------|---------------|------------------|
| **Studio (UI)** | Display chat, load agents, query Backpack | No state - queries Backpack |
| **Agent** | Business logic, routing, decisions | Reads/writes to Backpack |
| **LLM Nodes** | Construct messages, call LLMs | Builds messages from Backpack |
| **Backpack** | Store ALL data, track commits, enable queries | Single source of truth |

### **Data Flow**

```
User Input
  ↓
Studio: Pack to Backpack (commit #1)
  ↓
Agent: Read input, do work, pack results (commits #2, #3, ...)
  ↓
  ├─ Internal Flow (optional)
  │   ├─ Node 1: Pack data (commit #4)
  │   ├─ Node 2: Pack data (commit #5)
  │   └─ LLM Node: Build messages from Backpack, pack response (commit #6)
  │
  └─ Agent: Pack final output (commit #7)
  ↓
Studio: Reconstruct conversation from commits, display
```

### **Key Principles**

1. **Single Source of Truth**: Backpack stores everything
2. **Git-Like Commits**: Every `pack()` is a timestamped commit
3. **Reconstruct, Don't Maintain**: Query history instead of managing arrays
4. **Thin UI Layer**: Studio just loads/packs/runs/queries
5. **Node-Level Prompts**: System prompts in LLM nodes, not metadata
6. **Time-Travel Built-In**: Query at any timestamp

---

**Error Handling**:
```typescript
try {
  const metadata = JSON.parse(fs.readFileSync('metadata.json'));
  const chatTrigger = metadata.triggers.find(t => t.type === 'chat');
  const chatOutput = metadata.outputs.chat;
  
  // Pack trigger input
  backpack.pack(chatTrigger.inputKey, userMessage);
  
  // Execute flow (with timeout)
  await Promise.race([
    flow.run(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), metadata.behavior.timeout)
    )
  ]);
  
  // Read output
  const response = backpack.unpack(chatOutput.outputKey);
  return { role: 'agent', content: response };
} catch (error) {
  return { 
    role: 'agent', 
    content: `❌ Error: ${error.message}` 
  };
}
```

---

## 🎨 UI/UX Design

### Homepage (`/`)
```
┌─────────────────────────────────────────┐
│  Backpack Studio                        │
│  Your workshop for AI agents            │
│  Found 2 chat-compatible agents         │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  🎬 YouTube Research              │ │
│  │  Find viral video ideas           │ │
│  │  Auto-discovered from /tutorials  │ │
│  │  [Chat →]                         │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  🔍 Competitor Analysis           │ │
│  │  Analyze competitor strategies    │ │
│  │  Auto-discovered from /tutorials  │ │
│  │  [Chat →]                         │ │
│  └───────────────────────────────────┘ │
│                                         │
│  💡 To add an agent, drop it in        │
│     /tutorials/ with metadata export   │
└─────────────────────────────────────────┘
```

### Chat Page (`/chat/[agentId]`)
```
┌─────────────────────────────────────────┐
│  ← Back | {agent.name}                  │
│  {agent.description}                    │
├─────────────────────────────────────────┤
│  Chat History:                          │
│  ┌───────────────────────────────────┐ │
│  │ You: Find viral AI videos         │ │
│  │                                   │ │
│  │ Agent: 🔍 Searching...            │ │
│  │                                   │ │
│  │ Agent: Found 12 breakthrough...   │ │
│  │ 1. "I Built AI That..." - 2.3M    │ │
│  │    ↳ 4.2x channel average ✨      │ │
│  │ ...                               │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [Type your question...    ] [Send →]  │
│                                         │
│  💡 Agent running from:                 │
│     /tutorials/{agentId}/               │
└─────────────────────────────────────────┘
```

---

## 📁 File Structure

```
/BackpackFlow
├── src/                    # Core library (unchanged)
├── dist/                   # Built library
│
├── tutorials/              # Agents folder (Studio scans this)
│   ├── youtube-research-agent/
│   │   ├── index.ts        # Agent + metadata export
│   │   ├── flow.json       # Optional: pre-serialized
│   │   └── README.md
│   │
│   └── competitor-analysis/  # Future agent
│       └── index.ts
│
└── studio/                 # NEW: Studio app (Next.js 16)
    ├── app/
    │   ├── page.tsx        # Homepage (lists discovered agents)
    │   ├── layout.tsx      # Root layout
    │   ├── globals.css     # Tailwind styles
    │   │
    │   ├── chat/
    │   │   └── [agentId]/
    │   │       └── page.tsx  # Chat with specific agent
    │   │
    │   └── api/
    │       ├── agents/
    │       │   └── route.ts   # GET: List discovered agents
    │       └── chat/
    │           └── route.ts   # POST: Run agent with user input
    │
    ├── components/
    │   ├── chat-window.tsx      # Reusable chat UI
    │   ├── markdown-renderer.tsx
    │   └── agent-card.tsx       # Agent display card
    │
    ├── lib/
    │   ├── agent-discovery.ts   # FlowLoader-based discovery
    │   ├── agent-runner.ts      # Runs agent flows
    │   └── types.ts             # TypeScript types
    │
    └── package.json             # "backpackflow": "file:.."
```

---

## 🔄 Development Workflow

### Setup (One Time)
```bash
# In /BackpackFlow root
npm run build              # Build library

# In /BackpackFlow/studio
npm install                # Links to local library
npm run dev                # Start Studio at localhost:3000
```

### Daily Workflow
```bash
# Terminal 1: Watch library changes
npm run dev                # In root (if you add this script)

# Terminal 2: Run Studio
cd studio && npm run dev
```

### When you change library code:
```bash
npm run build              # Rebuild library
# Studio auto-reloads via hot reload
```

---

## ✅ Success Criteria

**Phase 1 Complete When**:
1. ✅ Can chat with YouTube agent in browser
2. ✅ Responses render as proper markdown
3. ✅ Can ask multiple questions in sequence
4. ✅ Status updates show ("Searching...", "Done")

**You'll Know It Works When**:
- You use it to research YOUR OWN YouTube ideas
- You stop opening terminal to test agents
- You can screenshot it for client demos

---

## 🚧 Phase 2: Flow Visualization (Week 2-3)

### Features
1. **"Show Flow" button** - Reveals execution visualization
2. **Node graph** - Visual representation of agent
3. **Event stream** - Real-time events in sidebar
4. **Click node** - See prompts, outputs, timing

### UI Addition
```
┌─────────────────────────────────────────┐
│  Chat Window                 [Show Flow]│
├─────────────────────────────────────────┤
│  (Chat on left, Flow viz on right)     │
└─────────────────────────────────────────┘
```

---

## 🔮 Future: More Trigger Types

<details>
<summary><strong>🔮 Click to see future trigger types (webhook, schedule, multimodal, file)</strong></summary>

The trigger-based architecture makes it easy to add new trigger types:

### **Webhook Trigger**
```json
{
  "triggers": [
    {
      "type": "webhook",
      "method": "POST",
      "endpoint": "/api/youtube-research",
      "inputType": "json",
      "inputKey": "payload"
    }
  ],
  "outputs": {
    "webhook": {
      "outputKey": "result",
      "format": "json"
    }
  }
}
```

### **Schedule Trigger**
```json
{
  "triggers": [
    {
      "type": "schedule",
      "cron": "0 9 * * *",
      "timezone": "UTC",
      "inputKey": "config"
    }
  ]
}
```

### **Multimodal Chat Trigger** (Future)
```json
{
  "triggers": [
    {
      "type": "chat",
      "inputType": "multimodal",
      "inputs": {
        "text": { 
          "key": "query", 
          "required": true,
          "description": "User's question"
        },
        "image": { 
          "key": "thumbnail", 
          "required": false,
          "description": "YouTube thumbnail to analyze"
        }
      }
    }
  ]
}
```

### **File Upload Trigger** (Future)
```json
{
  "triggers": [
    {
      "type": "file",
      "inputType": "csv",
      "inputKey": "data",
      "maxSize": "10MB"
    }
  ]
}
```

</details>

---

## 🎯 Phase 3: More Agents (Future)

As you build more agents, add them to Studio:
- Competitor analysis
- Content research
- SEO analysis
- LinkedIn post generator

Each agent gets:
- Own page (`/competitor-analysis`)
- Own API route
- Same chat interface (reusable)

---

## 📊 Metrics (For Yourself)

Track these to know if Studio is useful:
1. **Usage frequency** - Do you open it daily?
2. **Terminal avoidance** - Did you stop using `ts-node`?
3. **Client demos** - Did you show it to anyone?
4. **New agents** - Did you build more agents because Studio made it easy?
5. **Convention pain points** - Is the agent convention too complex? Too restrictive?

If you're NOT using it → figure out why and fix it.

---

## 📋 Decisions Log

**Decided (December 21, 2024)**:
- [x] Use Next.js 16 for Studio
- [x] Keep Studio separate from library (no npm publish)
- [x] Use local BackpackFlow (`"backpackflow": "file:.."`)
- [x] Scan `/tutorials/` folder for agents
- [x] Use FlowLoader for serialization
- [x] **Q1**: Metadata export (explicit declaration)
- [x] **Q2**: Backpack persists between messages (chat history)
- [x] **Q3**: Agent declares output key in metadata
- [x] **Q4**: Stream events (status updates)
- [x] **Q5**: Return errors in chat messages
- [x] **Q6**: Text-only input for now
- [x] **Q7**: Support both TypeScript modules AND JSON flows

**Future Enhancements**:
- [ ] LLM response streaming (token-by-token)
- [ ] localStorage for chat history persistence
- [ ] Dynamic form generation from input contracts
- [ ] Flow visualization during execution

---

## 🚫 Anti-Patterns to Avoid

❌ **Don't** make it complex - Keep it simple  
❌ **Don't** add features "just in case" - Build what you need  
❌ **Don't** worry about polish - It's YOUR tool  
❌ **Don't** make it generic - Optimize for your workflow  

✅ **Do** keep it fast to change  
✅ **Do** add features as you need them  
✅ **Do** show it to clients (it's impressive!)  
✅ **Do** use it daily  

---

## 🛠️ Implementation Plan

### This Weekend (4-6 hours)
1. ✅ Scaffold Next.js app with `create-next-app`
2. ✅ Add `"backpackflow": "file:.."` to package.json
3. ✅ Create homepage with YouTube card
4. ✅ Create basic chat UI
5. ✅ Wire up YouTube agent to API route
6. ✅ Test with real queries

**Deliverable**: Working chat interface for YouTube research

### Next Week (Optional)
7. Polish markdown rendering
8. Add status indicators
9. Add export button (save to file)

### Future (As Needed)
10. Flow visualization
11. More agents
12. Advanced debugging features

---

## 📝 Notes

- **No authentication needed** - It's localhost only
- **No database needed** - Stateless (each chat is fresh)
- **No deployment needed** - Your machine only
- **Can be messy** - It's a workshop, not a product

---

---

## 🎯 Next Actions (After Convention Decided)

### **Immediate** (Today)
1. **Decide on conventions** (see Open Design Questions)
2. **Scaffold Next.js 16 app** (`npx create-next-app@latest studio`)
3. **Link to local BackpackFlow** (`"backpackflow": "file:.."`)

### **This Weekend** (4-6 hours)
1. **Implement agent discovery** (`lib/agent-discovery.ts`)
2. **Build homepage** (list discovered agents)
3. **Create chat UI** (`/chat/[agentId]`)
4. **Wire up API routes** (`/api/agents`, `/api/chat`)
5. **Test with YouTube agent**

### **Next Week** (Polish)
1. **Add streaming** (if decided)
2. **Test multi-turn** (if decided)
3. **Error handling** (based on decision)
4. **Use it daily** (dogfood your own tool!)


---

## ✅ Ready to Build!

**All decisions finalized. Ready to implement.**

### **Quick Start Checklist**

**Phase 0: Setup** (10 minutes)
```bash
# 1. Scaffold Next.js
cd /Users/karansinghkochar/Documents/GitHub/Backpackflow
npx create-next-app@latest studio --typescript --tailwind --app --no-src-dir

# 2. Link to BackpackFlow
cd studio
npm install react-markdown remark-gfm
npm install ..  # Links to local library

# 3. Start dev server
npm run dev  # localhost:3000
```

**Phase 1: Session Management** (1 hour)
- [ ] Create `lib/session.ts`
- [ ] Implement `getBackpack(sessionId)` - Get or create Backpack
- [ ] Implement `saveBackpack(sessionId, backpack)` - Persist to memory
- [ ] Implement `reconstructConversation(backpack)` - Query commits

**Phase 2: Agent Discovery** (2 hours)
- [ ] Create `lib/agent-discovery.ts`
- [ ] Scan `/tutorials/` for `metadata.json` files
- [ ] Parse and validate metadata schema
- [ ] Check for `triggers` with `type: "chat"`
- [ ] Return list of chat-compatible agents

**Phase 3: Homepage** (1 hour)
- [ ] Create `/app/page.tsx`
- [ ] Call agent discovery on page load
- [ ] Display agent cards with name, description, tags
- [ ] Link to `/chat/[agentId]`

**Phase 4: Chat UI** (2-3 hours)
- [ ] Create `/app/chat/[agentId]/page.tsx`
- [ ] Chat window component (displays reconstructed conversation)
- [ ] Message input field
- [ ] Markdown rendering with `react-markdown`
- [ ] Session ID generation/management

**Phase 5: API Routes** (2-3 hours)
- [ ] Create `/app/api/agents/route.ts` (GET list)
- [ ] Create `/app/api/chat/route.ts` (POST message)
  - [ ] Load Backpack
  - [ ] Pack user message
  - [ ] Run agent
  - [ ] Reconstruct conversation
  - [ ] Return response + conversation
- [ ] Create `/app/api/chat/history/route.ts` (GET conversation)
- [ ] Error handling

**Phase 6: Agent Loader** (2 hours)
- [ ] Create `lib/agent-loader.ts`
- [ ] Dynamically import agent node class
- [ ] Create Flow with Backpack
- [ ] Set entry node
- [ ] Handle TypeScript vs JSON flows

**Phase 7: Test & Iterate** (2 hours)
- [ ] Test YouTube agent discovery
- [ ] Test single-turn conversation
- [ ] Test multi-turn conversation (verify Backpack persistence)
- [ ] Test conversation reconstruction
- [ ] Fix bugs, polish UX

**Total Time: 12-15 hours** (1 weekend sprint)

**Simplified Thanks To:**
- ✅ No manual conversation state management
- ✅ Backpack handles persistence
- ✅ Reconstruction logic is simple (query + sort)
- ✅ Agent code unchanged (already uses Backpack)

---

## 📝 Final Architecture Decisions (Dec 21, 2024)

### **✅ Approved Decisions**

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Backpack is single source of truth** | No duplicate state. Studio queries Backpack like `git log`. |
| 2 | **Conversation reconstructed from commits** | Every `pack()` is a commit. No manual array management. |
| 3 | **System prompts in LLM nodes** | Multi-LLM flows need different prompts. NOT in metadata. |
| 4 | **Trigger-based architecture** | Explicit triggers in `metadata.json` for discovery. |
| 5 | **Studio is thin UI layer** | Load → Pack → Run → Query → Display. No business logic. |
| 6 | **Agent owns conversation logic** | Agent decides how to use history, not Studio. |
| 7 | **Time-travel built-in** | Query Backpack at any timestamp for free. |
| 8 | **Session = Backpack instance** | `sessionId → Backpack`. Persist to memory/disk. |
| 9 | **No `conversationHistory` in metadata** | Reconstructed dynamically, not stored. |
| 10 | **OpenAI-compatible format** | Reconstructed conversation uses `{role, content, timestamp}`. |

### **❌ Rejected Approaches**

| Approach | Why Rejected |
|----------|--------------|
| Studio maintains conversation array | Duplicate state, can get out of sync |
| Agent manually maintains `conversationHistory` | Redundant when Backpack already tracks commits |
| System prompts in `metadata.json` | Doesn't work for multi-LLM flows |
| Studio passes conversation to agent | Agent should query Backpack directly |
| Implicit agent discovery | Trigger-based is more explicit and flexible |

### **🎯 Core Principles**

1. **Single Source of Truth**: Backpack stores everything
2. **Query, Don't Store**: Reconstruct from commits, don't maintain arrays
3. **Separation of Concerns**: Studio = UI, Agent = Logic, Backpack = State
4. **Git-Like**: Every pack is a commit, query like `git log`
5. **Time-Travel First**: All features should support querying at any timestamp
6. **Explicit > Implicit**: `metadata.json` declares everything
7. **Thin Layers**: Each layer does ONE thing well

### **📊 Comparison: Old vs New**

| Aspect | Old Approach | New Approach |
|--------|-------------|--------------|
| **Conversation Storage** | Studio maintains array | Reconstructed from Backpack |
| **State Management** | Duplicate (Studio + Backpack) | Single (Backpack only) |
| **Agent Code** | Manages history array | Just packs data |
| **Studio Complexity** | High (state management) | Low (query Backpack) |
| **Time-Travel** | Not possible | Built-in |
| **Consistency** | Can drift | Always accurate |
| **Lines of Code** | ~200 (Studio API) | ~50 (Studio API) |

---

**End of PRD**  
**Last Updated**: December 21, 2024  
**Status**: ✅ Finalized - Ready to build

**Next Step**: Scaffold Next.js 16 app in `/studio` folder

