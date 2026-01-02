# Making Your Agent Studio-Compatible

**Quick Guide**: Convert any BackpackFlow agent to work with Backpack Studio's chat interface.

**Time Required**: ~10 minutes  
**Prerequisites**: Working BackpackFlow agent (extends `BackpackNode`)

---

## 🎯 What is a Studio-Compatible Agent?

A Studio-compatible agent is any BackpackFlow agent that:
1. Declares its interface in `metadata.json`
2. Reads input from a declared key
3. Writes output to a declared key
4. Can be discovered and executed by Studio

**Your agent code stays the same** - you just add a metadata file and ensure input/output keys match the contract.

---

## ✅ Quick Checklist

- [ ] Create `metadata.json` in agent folder
- [ ] Define `triggers` array with chat trigger
- [ ] Define `outputs.chat` with output key
- [ ] Agent reads from `metadata.triggers[0].inputKey`
- [ ] Agent writes to `metadata.outputs.chat.outputKey`
- [ ] Export your node class

---

## 📝 Step-by-Step Guide

### **Step 1: Create `metadata.json`**

Create this file in your agent's folder (same directory as your agent code):

```json
{
  "$schema": "https://backpackflow.dev/schemas/agent-metadata.json",
  
  "id": "your-agent-id",
  "name": "Your Agent Name",
  "description": "What does your agent do?",
  "version": "1.0.0",
  
  "triggers": [
    {
      "type": "chat",
      "inputType": "text",
      "inputKey": "userInput",
      "description": "User provides input"
    }
  ],
  
  "outputs": {
    "chat": {
      "outputKey": "response",
      "format": "markdown",
      "streaming": true
    }
  },
  
  "behavior": {
    "preserveState": true,
    "timeout": 30000,
    "retryable": false
  },
  
  "tags": ["your", "tags", "here"],
  "author": "Your Name",
  
  "requirements": {
    "env": ["API_KEY_1", "API_KEY_2"],
    "dependencies": ["package1", "package2"]
  }
}
```

---

### **Step 2: Update Agent Input**

Your agent must read from the `inputKey` declared in `metadata.json`:

**Example**: If `metadata.json` has `"inputKey": "userInput"`:

```typescript
export class YourAgentNode extends BackpackNode {
    async prep(shared: any): Promise<any> {
        // Read from inputKey
        const input = this.unpackRequired<string>('userInput');
        //                                         ↑ Must match metadata.json
        return { input };
    }
    
    async _exec(input: any): Promise<any> {
        // Your agent logic here
        const result = await this.processInput(input.input);
        
        // Write to outputKey (next step)
        return { result };
    }
}
```

---

### **Step 3: Update Agent Output**

Your agent must write to the `outputKey` declared in `metadata.json`:

**Example**: If `metadata.json` has `"outputKey": "response"`:

```typescript
async _exec(input: any): Promise<any> {
    // Your agent logic
    const result = await this.processInput(input.input);
    
    // Pack output to Studio-compatible key
    this.backpack.pack('response', result, { nodeId: this.id });
    //                  ↑ Must match metadata.json outputKey
    
    return { success: true };
}
```

---

### **Step 4: Export Node Class**

Ensure your node class is exported so Studio can instantiate it:

```typescript
// At end of file
export { YourAgentNode };
```

---

## 📋 Metadata Schema Reference

### **Required Fields**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique agent identifier (kebab-case) |
| `name` | string | Display name for Studio UI |
| `triggers` | array | Array of trigger configurations |
| `outputs` | object | Output configurations per trigger type |

### **Triggers Configuration**

```typescript
{
  "triggers": [
    {
      "type": "chat",           // Required: "chat" for Studio compatibility
      "inputType": "text",      // Required: "text" | "multimodal" (future)
      "inputKey": "userInput",  // Required: Backpack key for input
      "description": "..."      // Optional: Describe what input is expected
    }
  ]
}
```

### **Outputs Configuration**

```typescript
{
  "outputs": {
    "chat": {                    // Must match trigger type
      "outputKey": "response",   // Required: Backpack key for output
      "format": "markdown",      // Required: "markdown" | "json" | "text" | "html"
      "streaming": true          // Optional: Supports event streaming
    }
  }
}
```

### **Behavior Configuration**

```typescript
{
  "behavior": {
    "preserveState": true,   // Keep Backpack between messages (multi-turn)
    "timeout": 30000,        // Max execution time (ms)
    "retryable": false       // Can user retry on failure
  }
}
```

---

## 🔄 Complete Example: Weather Agent

### **Folder Structure**
```
tutorials/weather-agent/
  ├── metadata.json
  ├── weather-agent.ts
  └── index.ts
```

### **metadata.json**
```json
{
  "id": "weather-agent",
  "name": "Weather Agent",
  "description": "Get weather forecasts for any location",
  "version": "1.0.0",
  
  "triggers": [
    {
      "type": "chat",
      "inputType": "text",
      "inputKey": "location",
      "description": "User provides a city name"
    }
  ],
  
  "outputs": {
    "chat": {
      "outputKey": "forecast",
      "format": "markdown",
      "streaming": false
    }
  },
  
  "behavior": {
    "preserveState": false,
    "timeout": 10000,
    "retryable": true
  },
  
  "tags": ["weather", "forecast"],
  "author": "Your Name",
  
  "requirements": {
    "env": ["WEATHER_API_KEY"],
    "dependencies": ["axios"]
  }
}
```

### **weather-agent.ts**
```typescript
import { BackpackNode, NodeConfig } from '../../src/nodes/backpack-node';

export class WeatherAgentNode extends BackpackNode {
    static namespaceSegment = "weather";
    
    toConfig(): NodeConfig {
        return {
            type: 'WeatherAgentNode',
            id: this.id,
            params: {}
        };
    }
    
    async prep(shared: any): Promise<any> {
        // Read from inputKey (metadata.json)
        const location = this.unpackRequired<string>('location');
        return { location };
    }
    
    async _exec(input: any): Promise<any> {
        // Fetch weather data
        const weatherData = await this.fetchWeather(input.location);
        
        // Format as markdown
        const forecast = this.formatForecast(weatherData);
        
        // Write to outputKey (metadata.json)
        this.backpack.pack('forecast', forecast, { nodeId: this.id });
        
        return { success: true };
    }
    
    async post(backpack: any, shared: any, output: any): Promise<string | undefined> {
        return 'complete';
    }
    
    private async fetchWeather(location: string): Promise<any> {
        // Your weather API logic here
        return { temp: 72, condition: 'Sunny' };
    }
    
    private formatForecast(data: any): string {
        return `# Weather Forecast\n\n🌡️ Temperature: ${data.temp}°F\n☀️ Condition: ${data.condition}`;
    }
}

// Export node class
export { WeatherAgentNode };
```

---

## 🎯 How Studio Uses Your Agent

### **1. Discovery**
```typescript
// Studio scans /tutorials/ for metadata.json
const agents = [];
for (const folder of fs.readdirSync('./tutorials')) {
    const metadataPath = `./tutorials/${folder}/metadata.json`;
    if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath));
        
        // Check if chat-compatible
        const hasChatTrigger = metadata.triggers.some(t => t.type === 'chat');
        if (hasChatTrigger) {
            agents.push(metadata);
        }
    }
}
```

### **2. Execution**
```typescript
// User sends message
const userMessage = "San Francisco";

// Load metadata
const metadata = require('./metadata.json');
const chatTrigger = metadata.triggers.find(t => t.type === 'chat');
const chatOutput = metadata.outputs.chat;

// Create session
const backpack = new Backpack();
const flow = new Flow({ backpack });

// Pack input
backpack.pack(chatTrigger.inputKey, userMessage);
//              ↑ 'location'

// Run agent
await flow.run();

// Read output
const response = backpack.unpack(chatOutput.outputKey);
//                                 ↑ 'forecast'

// Format based on metadata
if (chatOutput.format === 'markdown') {
    return <ReactMarkdown>{response}</ReactMarkdown>;
}
```

---

## 🧪 Testing Studio Compatibility

### **Test 1: Metadata Validation**
```typescript
const metadata = require('./metadata.json');

// Has chat trigger?
assert(metadata.triggers.some(t => t.type === 'chat'));

// Has inputKey and outputKey?
const chatTrigger = metadata.triggers.find(t => t.type === 'chat');
assert(chatTrigger.inputKey);
assert(metadata.outputs.chat.outputKey);
```

### **Test 2: Input/Output Contract**
```typescript
// Pack input
backpack.pack(metadata.triggers[0].inputKey, 'test input');

// Run agent
const agent = new YourAgentNode({ id: 'test' }, backpack, streamer);
await agent.run();

// Check output
const output = backpack.unpack(metadata.outputs.chat.outputKey);
assert(output !== undefined);
```

### **Test 3: Manual Test**
```bash
# Create simple test script
npm run test:agent "test input"

# Should see output in terminal
```

---

## 🎨 Output Formatting

### **Markdown** (Recommended)
```typescript
const output = `
# Title

**Bold text** and *italic text*

- Bullet points
- Work great

\`\`\`javascript
// Code blocks too
\`\`\`
`;
this.backpack.pack('response', output, { nodeId: this.id });
```

### **JSON**
```typescript
const output = JSON.stringify({
    status: 'success',
    data: { /* ... */ }
}, null, 2);
this.backpack.pack('response', output, { nodeId: this.id });
```

### **Plain Text**
```typescript
const output = "Simple text response";
this.backpack.pack('response', output, { nodeId: this.id });
```

---

## 🔮 Advanced Features

### **Multi-Turn Conversations**

Set `behavior.preserveState: true` to enable multi-turn chat:

```typescript
// Turn 1
User: "Find AI videos"
Agent: [Packs results to 'videos' key]

// Turn 2 (same Backpack instance)
User: "Show me the top 3"
Agent: [Reads 'videos' from previous turn]
```

### **Streaming Support**

Declare `streaming: true` and emit events:

```typescript
async _exec(input: any): Promise<any> {
    // Emit progress events
    this.eventStreamer.emit({
        type: 'progress',
        payload: { message: 'Processing...' }
    });
    
    // Continue processing
}
```

### **Error Handling**

Return errors as part of output:

```typescript
async _exec(input: any): Promise<any> {
    try {
        const result = await this.process(input);
        this.backpack.pack('response', result, { nodeId: this.id });
    } catch (error) {
        this.backpack.pack('response', `❌ Error: ${error.message}`, { nodeId: this.id });
    }
    return { success: true };
}
```

---

## 📚 Common Patterns

### **Composite Nodes**

If your agent has an internal flow:

```typescript
async _exec(input: any): Promise<any> {
    // Create internal flow
    const internalFlow = this.createInternalFlow();
    
    // Add nodes
    const node1 = internalFlow.addNode(Node1, { id: 'node1' });
    const node2 = internalFlow.addNode(Node2, { id: 'node2' });
    
    // Setup routing
    node1.onComplete(node2);
    internalFlow.setEntryNode(node1);
    
    // Run
    await internalFlow.run({});
    
    // Read final result and pack to outputKey
    const result = this.backpack.unpack('internalResult');
    this.backpack.pack('response', result, { nodeId: this.id });
    
    return { success: true };
}
```

### **Stateful Agents**

For agents that need context across turns:

```typescript
async _exec(input: any): Promise<any> {
    // Check for previous state
    const conversationHistory = this.backpack.unpack('history') || [];
    
    // Add current input
    conversationHistory.push({ role: 'user', message: input.userInput });
    
    // Process with context
    const response = await this.process(conversationHistory);
    
    // Update state
    conversationHistory.push({ role: 'agent', message: response });
    this.backpack.pack('history', conversationHistory, { nodeId: this.id });
    
    // Return response
    this.backpack.pack('response', response, { nodeId: this.id });
    
    return { success: true };
}
```

---

## ❓ FAQ

### **Q: Can I have multiple input keys?**
Not for chat triggers (currently). Use a single `inputKey` and parse the input:

```typescript
// metadata.json: "inputKey": "userInput"

async prep(shared: any): Promise<any> {
    const input = this.unpackRequired<string>('userInput');
    
    // Parse input
    const [city, date] = input.split(',').map(s => s.trim());
    
    return { city, date };
}
```

### **Q: Can I use a different format for each response?**
The format is declared in `metadata.json`, but you can return different content:

```typescript
// Always return markdown (as declared)
const output = hasData 
    ? `# Results\n\n${data}` 
    : `# No Results\n\nTry a different query.`;

this.backpack.pack('response', output, { nodeId: this.id });
```

### **Q: What if my agent doesn't produce output?**
You must still pack *something* to the `outputKey`:

```typescript
// At minimum, pack a status message
this.backpack.pack('response', '✅ Task completed successfully', { nodeId: this.id });
```

### **Q: Can I use this agent outside of Studio?**
Yes! Studio compatibility doesn't affect standalone usage:

```typescript
// Standalone usage (your existing code)
const agent = new YourAgent();
await agent.run();

// Studio usage (automatic)
// Studio handles instantiation and execution
```

---

## 🎯 Summary

**To make any agent Studio-compatible:**

1. ✅ Create `metadata.json` with `triggers` and `outputs`
2. ✅ Read input from `metadata.triggers[0].inputKey`
3. ✅ Write output to `metadata.outputs.chat.outputKey`
4. ✅ Export your node class

**That's it!** Studio handles discovery, UI, execution, and formatting.

---

## 🔗 Additional Resources

- **Full Specification**: `.personal/backpack-studio-prd.md`
- **Example Agent**: `tutorials/youtube-research-agent/`
- **Metadata Schema**: `docs/schemas/agent-metadata.json` (coming soon)
- **Studio Repo**: `studio/` (coming soon)

---

**Questions?** Open an issue on GitHub or check the PRD.


