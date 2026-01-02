# YouTube Agent → Backpack Studio Compatibility

**Status**: ✅ Studio-Compatible  
**Date**: December 21, 2024

> **📘 Generic Guide**: For making ANY agent Studio-compatible, see [`docs/STUDIO-AGENT-GUIDE.md`](../../docs/STUDIO-AGENT-GUIDE.md)

---

## 🎯 What Changed?

This document shows the **specific changes** made to the YouTube Research Agent. For a generic guide applicable to any agent, see the link above.

To make the YouTube Research Agent compatible with Backpack Studio, we made **4 simple changes**:

---

## 📋 Changes Made

### **1. Added `metadata.json`** (NEW FILE)

```json
{
  "id": "youtube-research",
  "name": "YouTube Research Agent",
  "triggers": [
    {
      "type": "chat",
      "inputType": "text",
      "inputKey": "query"
    }
  ],
  "outputs": {
    "chat": {
      "outputKey": "analysis",
      "format": "markdown"
    }
  },
  "behavior": {
    "preserveState": true,
    "timeout": 60000
  }
}
```

**Why**: Tells Studio how to interact with this agent.

---

### **2. Changed Input Key** (`searchQuery` → `query`)

**Before**:
```typescript
const query = this.unpackRequired<string>('searchQuery');
```

**After**:
```typescript
const query = this.unpackRequired<string>('query');
// ↑ Must match metadata.triggers[0].inputKey
```

**Why**: Studio packs user input to the key specified in `metadata.json`.

---

### **3. Changed Output Key** (`chatResponse` → `analysis`)

**Before**:
```typescript
// Output only existed as 'chatResponse'
```

**After**:
```typescript
// At end of _exec():
const chatResponse = this.backpack.unpack('chatResponse');
if (chatResponse) {
    this.backpack.pack('analysis', chatResponse, { nodeId: this.id });
    // ↑ Must match metadata.outputs.chat.outputKey
}
```

**Why**: Studio reads output from the key specified in `metadata.json`.

**Note**: No manual `conversationHistory` management needed! Studio reconstructs conversation from Backpack commits.

---

### **4. Exported Agent Node Class**

**Before**:
```typescript
export { YouTubeResearchAgent };
```

**After**:
```typescript
export { YouTubeResearchAgent, YouTubeResearchAgentNode };
```

**Why**: Studio needs to instantiate the node class directly.

---

## ✅ Verification Checklist

- [x] `metadata.json` exists
- [x] `triggers[0].inputKey` = `"query"`
- [x] `outputs.chat.outputKey` = `"analysis"`
- [x] Agent reads from `this.backpack.unpack('query')`
- [x] Agent writes to `this.backpack.pack('analysis', ...)`
- [x] `metadata.json` declares `type: "chat"`
- [x] `metadata.json` declares `format: "markdown"`
- [x] `behavior.preserveState: true` for multi-turn chat
- [x] Agent node class is exported

---

## 🚀 How Studio Uses This Agent

### **Discovery**
```typescript
// Studio scans /tutorials/ for metadata.json
const metadata = JSON.parse(fs.readFileSync('metadata.json'));

// Check if chat-compatible
const hasChatTrigger = metadata.triggers.some(t => t.type === 'chat');
// ✅ Yes! Show in Studio UI
```

### **Execution**
```typescript
// User sends: "Find AI videos"
const userMessage = "Find AI videos";

// Studio reads metadata
const chatTrigger = metadata.triggers.find(t => t.type === 'chat');
const chatOutput = metadata.outputs.chat;

// Pack input
backpack.pack(chatTrigger.inputKey, userMessage); // 'query'

// Run flow
await flow.run();

// Read output
const response = backpack.unpack(chatOutput.outputKey); // 'analysis'

// Display as markdown (format: "markdown")
return <ReactMarkdown>{response}</ReactMarkdown>;
```

---

## 🔄 Backward Compatibility

The agent **still works standalone**:

```bash
npm run tutorial:youtube-agent "AI productivity tools"
```

**Why**: The orchestrator class (`YouTubeResearchAgent`) was updated to use the new keys.

---

## 📊 Input/Output Contract

| Aspect | Key | Type | Format |
|--------|-----|------|--------|
| **Input** | `query` | string | Plain text |
| **Output** | `analysis` | string | Markdown |

**Studio reads these from `metadata.json` and enforces the contract.**

---

## 🎯 Multi-Turn Conversations

Because `behavior.preserveState: true`:

**Turn 1**:
```
User: "Find AI videos"
Agent: [Searches, analyzes, returns results]
Backpack: [Keeps state: outliers, insights, chatResponse, analysis]
```

**Turn 2**:
```
User: "Show me more"
Agent: [Accesses previous results from Backpack]
       [Builds on previous context]
Backpack: [Still has all previous data]
```

---

## 🧪 Testing Studio Compatibility

### **Test 1: Discovery**
```typescript
const metadata = require('./metadata.json');
assert(metadata.triggers.find(t => t.type === 'chat'));
// ✅ Agent is discoverable
```

### **Test 2: Input/Output Contract**
```typescript
// Pack input
backpack.pack('query', 'test query');

// Run agent
await flow.run();

// Check output exists
const analysis = backpack.unpack('analysis');
assert(analysis !== undefined);
// ✅ Contract is fulfilled
```

### **Test 3: Format**
```typescript
const metadata = require('./metadata.json');
assert(metadata.outputs.chat.format === 'markdown');
// ✅ Studio knows how to render
```

---

## 🔮 Future Enhancements

### **Streaming Support** (Already declared in metadata)
```json
{
  "outputs": {
    "chat": {
      "streaming": true  // ✅ Ready for streaming
    }
  }
}
```

### **Multimodal Input** (Future)
```json
{
  "triggers": [{
    "type": "chat",
    "inputType": "multimodal",
    "inputs": {
      "text": { "key": "query" },
      "image": { "key": "thumbnail" }
    }
  }]
}
```

---

## 📝 Summary

Making an agent Studio-compatible is **simple**:

1. ✅ Add `metadata.json` with `triggers` and `outputs`
2. ✅ Read input from `metadata.triggers[0].inputKey`
3. ✅ Write output to `metadata.outputs.chat.outputKey`
4. ✅ Export node class

**That's it!** Studio handles the rest (discovery, UI, execution, formatting).

---

## 🎯 Next Steps

1. **Start Studio**: `cd studio && npm run dev`
2. **Open Studio**: Visit `http://localhost:3000`
3. **See Agent**: YouTube Research Agent appears in list
4. **Chat**: Click agent → Start chatting!

---

**Questions?** Check `.personal/backpack-studio-prd.md` for full specification.

