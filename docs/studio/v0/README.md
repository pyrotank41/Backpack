# Backpack Studio v0 Documentation

**Status**: Planning → Development  
**Version**: 0.1.0 (Initial Development)  
**Date**: December 21, 2024

---

## 📚 Documentation Index

| Document | Purpose |
|----------|---------|
| **[PRD.md](./PRD.md)** | Complete Product Requirements Document |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Architecture overview and design decisions |

---

## 🎯 What is Backpack Studio?

**Backpack Studio** is a local development UI for building, testing, and interacting with BackpackFlow agents through a chat interface.

**Key Features**:
- 💬 Chat with any BackpackFlow agent
- 🔍 Auto-discover agents from `/tutorials/` folder
- 📊 Real-time observability (future)
- 🕐 Time-travel debugging via Backpack (future)

---

## 🏗️ Core Architecture

### **Single Source of Truth: Backpack**

```
Studio (UI) → Backpack (State) ← Agent (Logic)
```

- **Studio**: Thin UI layer (load → pack → run → query)
- **Backpack**: Git-like commit history (single source of truth)
- **Agent**: Business logic (reads/writes to Backpack)

### **Key Principle: Reconstruct, Don't Store**

```typescript
// ❌ OLD: Manual state management
session.conversationHistory = [...];

// ✅ NEW: Reconstruct from Backpack commits
const conversation = reconstructConversation(backpack);
```

**Every `pack()` is a commit. Query like `git log`.**

---

## 🤝 Agent Convention

Agents declare their interface in `metadata.json`:

```json
{
  "id": "youtube-research",
  "triggers": [
    { "type": "chat", "inputType": "text", "inputKey": "query" }
  ],
  "outputs": {
    "chat": { "outputKey": "analysis", "format": "markdown" }
  },
  "behavior": {
    "preserveState": true,
    "timeout": 30000
  }
}
```

**Studio discovers agents by scanning for `metadata.json` files.**

---

## 📦 Tech Stack

**Frontend**:
- Next.js 16 (App Router)
- React 19
- TailwindCSS
- react-markdown

**Backend**:
- Next.js API Routes
- BackpackFlow (local, via `file:..`)

**Why Local?**
- ✅ No deployment needed
- ✅ Direct access to agents
- ✅ Fast iteration

---

## 🚀 Development Status

### **Phase 1: Core Chat (Current)**
- [ ] Agent discovery
- [ ] Chat UI
- [ ] Session management (Backpack persistence)
- [ ] API routes

**Estimated Time**: 12-15 hours (1 weekend sprint)

### **Phase 2: Flow Visualization (Future)**
- [ ] Node graph display
- [ ] Event stream sidebar
- [ ] Real-time execution view

### **Phase 3: Time-Travel (Future)**
- [ ] Replay execution at any timestamp
- [ ] Query Backpack history
- [ ] Debug multi-turn conversations

---

## 📖 Quick Links

- **[Full PRD](./PRD.md)** - Complete requirements and decisions
- **[Architecture](./ARCHITECTURE.md)** - Technical design details
- **[Generic Agent Guide](../../STUDIO-AGENT-GUIDE.md)** - Make any agent Studio-compatible
- **[YouTube Agent Example](../../../tutorials/youtube-research-agent/)** - Working example

---

## 🎯 Goals

**Primary Goals**:
1. Chat with agents conversationally
2. Test agent changes immediately
3. See markdown-rendered responses

**Secondary Goals** (Future):
4. Flow visualization
5. Event stream debugging
6. Export conversations

**Non-Goals** (For Now):
- ❌ Product to sell
- ❌ Hosted service
- ❌ Non-technical users

**Important**: These are constraints for **initial development**. Studio could evolve in the future.

---

## 💡 Design Philosophy

### **1. Backpack is King**
- Single source of truth
- Git-like commit history
- Time-travel built-in

### **2. Studio is Thin**
- No business logic
- Just UI + queries
- Agent does the work

### **3. Agents are Universal**
- `metadata.json` is tool-agnostic
- Same agent works in Studio, n8n, Zapier
- Trigger-based architecture

### **4. Developer First**
- Personal workshop
- Fast iteration
- No complexity

---

## 📝 Contributing

**This is v0 (initial development)**. Focus:
- Keep it simple
- Ship fast
- Iterate based on usage

**When adding features**:
1. Update PRD.md
2. Document architectural decisions
3. Keep Backpack as single source of truth

---

## 🔗 Related Documentation

- **[BackpackFlow v2.0 PRDs](../../v2.0/prds/)** - Core library features
- **[Studio Agent Guide](../../STUDIO-AGENT-GUIDE.md)** - Agent compatibility
- **[ROADMAP.md](../../../ROADMAP.md)** - Overall project roadmap

---

**Questions?** See [PRD.md](./PRD.md) for complete details.

**Ready to build?** Start with agent discovery! 🚀


