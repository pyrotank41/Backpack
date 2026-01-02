# 🎒 Backpack Studio v0.1.0

**Your personal workshop for building, testing, and interacting with AI agents.**

---

## ✅ **What's Built**

### **Core Infrastructure**
- ✅ Next.js 16 + React 19 + TailwindCSS
- ✅ TypeScript with strict mode
- ✅ Local BackpackFlow integration (`file:..`)
- ✅ Session management (Backpack as single source of truth)
- ✅ Agent discovery (scans `/tutorials/` for `metadata.json`)
- ✅ Agent loader (dynamic import + Flow creation)
- ✅ Conversation reconstruction from Backpack commits

### **API Routes**
- ✅ `GET /api/agents` - List all discovered agents
- ✅ `POST /api/chat` - Execute agent with user message

### **UI Pages**
- ✅ Homepage (`/`) - Agent discovery and selection
- ✅ Chat Interface (`/chat/[agentId]`) - Conversation with agents

---

## 🚀 **Getting Started**

### **1. Start the Development Server**

```bash
cd studio
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### **2. View Discovered Agents**

The homepage will automatically scan `/tutorials/` and display all Studio-compatible agents (those with `metadata.json` and `type: "chat"` trigger).

### **3. Chat with an Agent**

Click on an agent card to open the chat interface. Type a message and the agent will process it using BackpackFlow.

---

## 🏗️ **Architecture**

### **The Git-Like Approach**

```
User Input
  ↓
Studio: Pack to Backpack (commit #1)
  ↓
Agent: Run and pack results (commits #2, #3, ...)
  ↓
Studio: Reconstruct conversation from commits
  ↓
Display to user
```

**Key Principle**: No manual state management. Backpack stores everything, Studio queries it like `git log`.

### **File Structure**

```
studio/
├── app/
│   ├── page.tsx                    # Homepage (agent list)
│   ├── chat/
│   │   └── [agentId]/
│   │       └── page.tsx            # Chat interface
│   └── api/
│       ├── agents/
│       │   └── route.ts            # GET /api/agents
│       └── chat/
│           └── route.ts            # POST /api/chat
├── lib/
│   ├── session.ts                  # Backpack management
│   ├── agent-discovery.ts          # Scan for agents
│   └── agent-loader.ts             # Load & run agents
└── package.json
```

---

## 🤝 **Making Agents Studio-Compatible**

### **1. Create `metadata.json`**

```json
{
  "id": "your-agent-id",
  "name": "Your Agent Name",
  "description": "What does your agent do?",
  "triggers": [
    {
      "type": "chat",
      "inputType": "text",
      "inputKey": "userMessage"
    }
  ],
  "outputs": {
    "chat": {
      "outputKey": "response",
      "format": "markdown"
    }
  }
}
```

### **2. Read Input from `inputKey`**

```typescript
async prep(shared: any): Promise<any> {
  const input = this.unpackRequired<string>('userMessage');
  return { input };
}
```

### **3. Write Output to `outputKey`**

```typescript
async _exec(input: any): Promise<any> {
  const result = await this.process(input);
  this.backpack.pack('response', result, { nodeId: this.id });
  return { success: true };
}
```

### **4. Register in Studio** ⚠️ **IMPORTANT**

Add your agent to `studio/lib/agent-registry.ts`:

```typescript
import { YourAgentNode } from '../../tutorials/your-agent/your-agent';

export const AGENT_REGISTRY: Record<string, any> = {
  'youtube-research': YouTubeResearchAgentNode,
  'your-agent-id': YourAgentNode,  // Add this!
};
```

**See**: `../docs/STUDIO-AGENT-GUIDE.md` for complete guide

---

## 🎯 **Current Features**

| Feature | Status | Description |
|---------|--------|-------------|
| **Agent Discovery** | ✅ | Auto-scan `/tutorials/` for agents |
| **Chat Interface** | ✅ | Talk to agents conversationally |
| **Multi-turn** | ✅ | Backpack persists across messages |
| **Markdown** | ✅ | Renders agent responses |
| **Session Management** | ✅ | Backpack-based (no manual state) |
| **Time-travel** | 🔮 | Query at any timestamp (future) |
| **Flow Visualization** | 🔮 | See nodes executing (future) |
| **Event Stream** | 🔮 | Real-time debug (future) |

---

## 🐛 **Troubleshooting**

### **"No agents found"**

1. Make sure you have agents in `/tutorials/`
2. Each agent needs a `metadata.json` file
3. Metadata must have `triggers` with `type: "chat"`
4. Check console for discovery errors

### **"Agent not found"**

- Agent ID in URL must match `id` in `metadata.json`
- Case-sensitive!

### **"Failed to load agent"**

- Make sure agent exports a node class
- Class name should end with "Node" or "Agent"
- Check agent code for errors

### **Network Interface Error**

If you see `uv_interface_addresses` error on startup, it's usually just a warning. The server should still work on `http://localhost:3000`.

---

## 📋 **Next Steps**

### **Phase 2: Flow Visualization** (Future)
- Node graph display
- Event stream sidebar
- Real-time execution view

### **Phase 3: Time-Travel** (Future)
- Replay execution at any timestamp
- Query Backpack history
- Debug multi-turn conversations

---

## 🎉 **You Built This!**

**Time Spent**: ~3 hours  
**Lines of Code**: ~1,200  
**Architecture**: Git-like, Backpack-first  
**Status**: ✅ Ready to use!

---

## 📚 **Documentation**

- **[PRD](../docs/studio/v0/PRD.md)** - Complete requirements
- **[Architecture](../docs/studio/v0/ARCHITECTURE.md)** - Design decisions
- **[Agent Guide](../docs/STUDIO-AGENT-GUIDE.md)** - Make agents compatible
- **[YouTube Example](../tutorials/youtube-research-agent/)** - Working agent

---

## 💡 **Key Insights**

1. **Backpack is King** - Single source of truth, no duplicate state
2. **Reconstruct, Don't Store** - Query commits like `git log`
3. **Studio is Thin** - Just UI + queries, agent does the work
4. **Universal Metadata** - Same `metadata.json` works for all tools

---

**Built with ❤️ using BackpackFlow v2.0**

**Questions?** Check `docs/studio/v0/` for complete documentation.
