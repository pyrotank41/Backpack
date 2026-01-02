# BackpackFlow Framework Design Principles

**Version:** v2.0  
**Status:** Living Document  
**Last Updated:** December 30, 2025

> **"Code is the Engine, Config is the Steering Wheel"**

This document defines the core principles that make BackpackFlow a powerful, contribution-friendly, and serializable framework for building AI agents.

---

## 🎯 Core Philosophy

### 1. **Everything is JSON-Serializable**

Every component in BackpackFlow can be represented as JSON. This enables:
- ✅ Visual flow builders (Studio)
- ✅ Version control for flows
- ✅ A/B testing different configs
- ✅ Programmatic flow generation
- ✅ Easy sharing and collaboration

**Principle:** If it can't be serialized to JSON, it doesn't belong in node config.

### 2. **Dependency Injection for Non-Serializable Objects**

Some objects (API clients, database connections, LLM providers) can't be serialized. The framework handles this through dependency injection.

**Pattern:**
```typescript
// ❌ BAD: Serialize the client
{
  "type": "LLMNode",
  "client": "<OpenAI client instance>" // Can't serialize!
}

// ✅ GOOD: Serialize the config, inject the client
{
  "type": "LLMNode",
  "model": "gpt-4",
  "apiKey": "${OPENAI_API_KEY}" // Reference to env var
}

// Framework injects the client during hydration
const node = new LLMNode(config, {
  llmClient: new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
});
```

### 3. **Explicit Data Contracts with Zod**

Every node declares its inputs and outputs with Zod schemas. This provides:
- ✅ Runtime validation
- ✅ TypeScript type inference
- ✅ Auto-generated UI forms
- ✅ Clear documentation
- ✅ Compile-time type checking

**Principle:** No implicit data passing. All inputs/outputs are declared upfront.

### 4. **Composability Over Complexity**

Build complex agents from simple, reusable nodes. Use nested flows for composition.

**Principle:** A node should do ONE thing well. Compose nodes to build complex workflows.

### 5. **Observable by Default**

Every node emits events automatically. No manual logging required.

**Principle:** Observability is not optional—it's built into the framework.

### 6. **Configuration-Driven, Code-Optional**

Users should be able to build agents with JUST JSON configs. Code is for custom nodes.

**Principle:** 80% of use cases should be solvable with config alone.

---

## 🏗️ Framework Design Patterns

### Pattern 1: The Node Registry

**Problem:** How do we load nodes dynamically from JSON configs?

**Solution:** A global registry that maps type names to node classes.

```typescript
/**
 * Node Registry - Map type strings to node classes
 */
class NodeRegistry {
    private static nodes = new Map<string, typeof BackpackNode>();
    
    /**
     * Register a node type
     */
    static register(type: string, nodeClass: typeof BackpackNode): void {
        this.nodes.set(type, nodeClass);
    }
    
    /**
     * Get a node class by type
     */
    static get(type: string): typeof BackpackNode | undefined {
        return this.nodes.get(type);
    }
    
    /**
     * List all registered nodes
     */
    static list(filter?: { category?: string }): NodeMetadata[] {
        const nodes: NodeMetadata[] = [];
        
        for (const [type, nodeClass] of this.nodes.entries()) {
            const metadata = this.getNodeMetadata(nodeClass);
            
            if (!filter?.category || metadata.category === filter.category) {
                nodes.push({ type, ...metadata });
            }
        }
        
        return nodes;
    }
    
    /**
     * Extract metadata from node class
     */
    private static getNodeMetadata(nodeClass: typeof BackpackNode): NodeMetadata {
        return {
            name: nodeClass.name,
            description: (nodeClass as any).description || '',
            category: (nodeClass as any).category || 'custom',
            inputs: nodeClass.inputs || {},
            outputs: nodeClass.outputs || {},
            icon: (nodeClass as any).icon || '📦',
            version: (nodeClass as any).version || '1.0.0'
        };
    }
}

// Usage
NodeRegistry.register('YouTubeAPINode', YouTubeAPINode);
NodeRegistry.register('TwitterAPINode', TwitterAPINode);
NodeRegistry.register('DataAnalysisNode', DataAnalysisNode);

// Studio can now list all available nodes
const allNodes = NodeRegistry.list();
const apiNodes = NodeRegistry.list({ category: 'api-client' });
```

### Pattern 2: Node Metadata for Studio

Every node should expose metadata for visual builders.

```typescript
/**
 * Example: YouTube API Node with rich metadata
 */
export class YouTubeAPINode extends APIClientNode<YouTubeVideo> {
    static namespaceSegment = "youtube.api";
    
    // 📊 Metadata for Studio
    static category = "api-client";
    static displayName = "YouTube API";
    static description = "Search YouTube videos and fetch detailed statistics";
    static icon = "🎥";
    static version = "1.0.0";
    static author = "BackpackFlow Team";
    static tags = ["youtube", "api", "video", "search"];
    
    // 📋 Input/Output contracts (Zod schemas)
    static inputs: DataContract = {
        query: z.string()
            .min(1)
            .describe('YouTube search query')
            .default('AI productivity tools')
    };
    
    static outputs: DataContract = {
        videos: z.array(YouTubeVideoSchema)
            .describe('Array of YouTube videos with full metadata')
    };
    
    // 🎨 UI hints for Studio
    static uiSchema = {
        query: {
            "ui:widget": "textarea",
            "ui:placeholder": "Enter search query..."
        },
        maxResults: {
            "ui:widget": "range",
            "ui:min": 10,
            "ui:max": 100,
            "ui:step": 10
        }
    };
    
    // Implementation...
}
```

### Pattern 3: Adapter Pattern for Extensibility

Use abstract base classes with concrete adapters for platform-specific logic.

```typescript
/**
 * Base class defines the contract
 */
abstract class APIClientNode<T> extends BackpackNode {
    static category = "api-client";
    
    // Abstract methods that adapters MUST implement
    abstract searchPlatform(query: string): Promise<any[]>;
    abstract fetchDetails(ids: string[]): Promise<T[]>;
    
    // Common logic that all adapters inherit
    async _exec(input: any): Promise<any> {
        const results = await this.searchPlatform(input.query);
        const details = await this.fetchDetails(results.map(r => r.id));
        return { data: details };
    }
}

/**
 * Concrete adapters implement platform-specific logic
 */
export class YouTubeAPINode extends APIClientNode<YouTubeVideo> {
    static displayName = "YouTube API";
    static icon = "🎥";
    
    async searchPlatform(query: string) {
        // YouTube-specific search
    }
    
    async fetchDetails(ids: string[]) {
        // YouTube-specific details
    }
}

export class TwitterAPINode extends APIClientNode<Tweet> {
    static displayName = "Twitter API";
    static icon = "🐦";
    
    async searchPlatform(query: string) {
        // Twitter-specific search
    }
    
    async fetchDetails(ids: string[]) {
        // Twitter-specific details
    }
}
```

### Pattern 4: Strategy Pattern for Algorithms

Use strategies for interchangeable algorithms (outlier detection, trend analysis, etc.).

```typescript
/**
 * Strategy interface
 */
interface AnalysisStrategy<TInput, TOutput> {
    analyze(data: TInput): TOutput;
    generateInsights(result: TOutput): string[];
}

/**
 * Node that uses strategies
 */
export class DataAnalysisNode extends BackpackNode {
    static category = "analysis";
    static displayName = "Data Analyzer";
    
    private strategy: AnalysisStrategy<any, any>;
    
    constructor(config: DataAnalysisConfig, context: NodeContext) {
        super(config, context);
        
        // Load strategy based on config
        this.strategy = StrategyRegistry.get(config.strategyType, config.strategyOptions);
    }
    
    async _exec(input: any) {
        const result = this.strategy.analyze(input.data);
        const insights = this.strategy.generateInsights(result);
        return { result, insights };
    }
}

/**
 * Strategy Registry - Similar to Node Registry
 */
class StrategyRegistry {
    private static strategies = new Map<string, any>();
    
    static register(type: string, strategyClass: any) {
        this.strategies.set(type, strategyClass);
    }
    
    static get(type: string, options: any) {
        const StrategyClass = this.strategies.get(type);
        return new StrategyClass(options);
    }
}

// Register strategies
StrategyRegistry.register('outlier', OutlierDetectionStrategy);
StrategyRegistry.register('trend', TrendAnalysisStrategy);
StrategyRegistry.register('sentiment', SentimentAnalysisStrategy);
```

### Pattern 5: Config References & Environment Variables

Support environment variable references in configs.

```typescript
/**
 * Config with environment variable references
 */
{
  "type": "YouTubeAPINode",
  "id": "youtube",
  "params": {
    "apiKey": "${YOUTUBE_API_KEY}",     // ✅ Resolved at runtime
    "maxResults": 50
  }
}

/**
 * Config resolver utility
 */
class ConfigResolver {
    /**
     * Resolve environment variable references
     */
    static resolve(config: any): any {
        if (typeof config === 'string') {
            // Pattern: ${ENV_VAR} or ${ENV_VAR:default}
            return config.replace(/\$\{([^:}]+)(?::([^}]+))?\}/g, (_, varName, defaultValue) => {
                return process.env[varName] || defaultValue || '';
            });
        }
        
        if (Array.isArray(config)) {
            return config.map(item => this.resolve(item));
        }
        
        if (typeof config === 'object' && config !== null) {
            const resolved: any = {};
            for (const [key, value] of Object.entries(config)) {
                resolved[key] = this.resolve(value);
            }
            return resolved;
        }
        
        return config;
    }
}
```

---

## 📦 Node Contribution Guidelines

### What Makes a Good BackpackFlow Node?

#### ✅ **DO:**

1. **Single Responsibility**
   - One node = one clear purpose
   - Example: `YouTubeAPINode` ONLY fetches YouTube data
   - Transformation happens in separate `TransformerNode`

2. **Explicit Contracts**
   - Declare all inputs/outputs with Zod
   - Include descriptions and examples
   - Set sensible defaults

3. **Rich Metadata**
   - Provide `displayName`, `description`, `category`, `icon`
   - Add `tags` for discoverability
   - Include `author` and `version`

4. **JSON-Serializable Config**
   - All params should be JSON-serializable
   - Use `${ENV_VAR}` for secrets
   - Use dependency injection for non-serializable objects

5. **Observable**
   - Let the framework handle events (automatic)
   - Add custom events only when necessary

6. **Error Handling**
   - Throw descriptive errors
   - Use `NodeError` with context
   - Handle edge cases gracefully

#### ❌ **DON'T:**

1. **Don't Mix Concerns**
   - Don't combine API fetching + analysis in one node
   - Keep nodes focused and composable

2. **Don't Hard-Code Values**
   - Use config params instead
   - Support environment variables

3. **Don't Skip Validation**
   - Always validate inputs with Zod
   - Fail fast with clear error messages

4. **Don't Ignore Serialization**
   - Every node must implement `toConfig()`
   - Config must be round-trippable

5. **Don't Break the Pattern**
   - Follow prep/exec/post lifecycle
   - Use Backpack for state management
   - Don't bypass the framework

### Node Template

```typescript
/**
 * MyAwesomeNode - Brief description
 * 
 * Detailed description of what this node does and when to use it.
 * 
 * Example:
 * ```typescript
 * const node = flow.addNode(MyAwesomeNode, {
 *     id: 'my-node',
 *     myParam: 'value'
 * });
 * ```
 */
export class MyAwesomeNode extends BackpackNode {
    // 🏷️ Metadata for Studio
    static category = "my-category";
    static displayName = "My Awesome Node";
    static description = "Does something awesome";
    static icon = "✨";
    static version = "1.0.0";
    static author = "Your Name";
    static tags = ["awesome", "useful"];
    
    // 🔧 Namespace segment
    static namespaceSegment = "awesome";
    
    // 📋 Data contracts
    static inputs: DataContract = {
        input1: z.string().describe('First input'),
        input2: z.number().optional().describe('Optional number')
    };
    
    static outputs: DataContract = {
        output1: z.string().describe('Result output')
    };
    
    // 🎨 UI hints (optional)
    static uiSchema = {
        input1: {
            "ui:widget": "textarea"
        }
    };
    
    // 💾 Node configuration
    private myParam: string;
    
    constructor(config: MyAwesomeConfig, context: NodeContext) {
        super(config, context);
        this.myParam = config.myParam;
    }
    
    // 📤 Serialization (PRD-003)
    toConfig(): NodeConfig {
        return {
            type: 'MyAwesomeNode',
            id: this.id,
            params: {
                myParam: this.myParam
            }
        };
    }
    
    // 📥 Preparation phase
    async prep(shared: any): Promise<any> {
        const input1 = this.unpackRequired<string>('input1');
        const input2 = this.unpack<number>('input2');
        return { input1, input2 };
    }
    
    // ⚡ Execution phase
    async _exec(input: any): Promise<any> {
        // Your logic here
        const result = `Processed: ${input.input1}`;
        return { output1: result };
    }
    
    // 📦 Post-processing phase
    async post(backpack: any, shared: any, output: any): Promise<string | undefined> {
        this.pack('output1', output.output1);
        return 'complete';
    }
}
```

---

## 🎨 Node Library Organization

```
src/nodes/
│
├── 📚 registry.ts                  # Central node registry
├── 📚 strategy-registry.ts         # Strategy registry
│
├── 🎯 core/                        # Framework fundamentals
│   ├── backpack-node.ts           # Base class
│   └── base-llm-node.ts           # LLM base
│
├── 🔌 api-clients/                 # Platform integrations
│   ├── base-api-client.ts         # Abstract base
│   ├── youtube/
│   │   ├── youtube-api-node.ts
│   │   └── youtube-schema.ts
│   ├── twitter/
│   │   ├── twitter-api-node.ts
│   │   └── twitter-schema.ts
│   └── reddit/
│       ├── reddit-api-node.ts
│       └── reddit-schema.ts
│
├── 🔄 transformers/                # Data normalization
│   ├── data-transformer-node.ts
│   ├── content-schema.ts          # Common format
│   └── adapters/
│       ├── youtube-adapter.ts
│       ├── twitter-adapter.ts
│       └── reddit-adapter.ts
│
├── 📊 analysis/                    # Data analysis
│   ├── data-analysis-node.ts
│   └── strategies/
│       ├── outlier-strategy.ts
│       ├── trend-strategy.ts
│       └── sentiment-strategy.ts
│
├── 🤖 llm/                         # LLM nodes
│   ├── chat-completion-node.ts
│   └── embedding-node.ts
│
└── 🏢 agents/                      # Composite agents
    └── research-agent-node.ts
```

---

## 🚀 How YouTube Agent Looks with These Principles

### Before (Monolithic)

```typescript
// ❌ Tightly coupled, hard to reuse
class YouTubeResearchAgentNode extends BackpackNode {
    async _exec(input: any) {
        // 1. Hardcoded YouTube search
        const videos = await this.searchYouTube(input.query);
        
        // 2. Hardcoded outlier detection
        const outliers = this.findOutliers(videos);
        
        // 3. Hardcoded LLM call
        const analysis = await this.callLLM(outliers);
        
        return { analysis };
    }
}
```

### After (Modular & Config-Driven)

#### **Node Implementation (Reusable Components)**

```typescript
/**
 * Generic Research Agent - Works with ANY platform
 */
export class ResearchAgentNode extends BackpackNode {
    static category = "agent";
    static displayName = "Research Agent";
    static description = "Multi-platform research agent with configurable analysis";
    static icon = "🔬";
    static version = "2.0.0";
    
    static inputs: DataContract = {
        query: z.string().describe('Research query')
    };
    
    static outputs: DataContract = {
        analysis: z.string().describe('Research analysis and insights')
    };
    
    private config: ResearchAgentConfig;
    
    constructor(config: ResearchAgentConfig, context: NodeContext) {
        super(config, context);
        this.config = config;
    }
    
    setupInternalFlow(): Flow {
        const flow = this.createInternalFlow();
        
        // 1. API Node (platform-agnostic)
        const apiNode = this.createAPINode(flow);
        
        // 2. Transformer (normalize data)
        const transformNode = flow.addNode(DataTransformerNode, {
            id: 'transform',
            platform: this.config.platform
        });
        
        // 3. Analysis (strategy-based)
        const analysisNode = flow.addNode(DataAnalysisNode, {
            id: 'analysis',
            strategyType: this.config.analysisType,
            strategyOptions: this.config.analysisOptions
        });
        
        // 4. LLM Synthesis
        const llmNode = flow.addNode(ChatCompletionNode, {
            id: 'synthesis',
            model: this.config.llmModel || 'gpt-4',
            systemPrompt: this.config.systemPrompt || this.getDefaultPrompt()
        });
        
        // Wire the flow
        apiNode.onComplete(transformNode);
        transformNode.onComplete(analysisNode);
        analysisNode.onComplete(llmNode);
        
        flow.setEntryNode(apiNode);
        return flow;
    }
    
    private createAPINode(flow: Flow): BackpackNode {
        // Get the API node class from registry
        const apiNodeType = `${this.config.platform}APINode`;
        const APINodeClass = NodeRegistry.get(apiNodeType);
        
        if (!APINodeClass) {
            throw new Error(`API node not found for platform: ${this.config.platform}`);
        }
        
        return flow.addNode(APINodeClass, {
            id: 'api',
            apiKey: this.config.apiKey,
            maxResults: this.config.maxResults
        });
    }
    
    async _exec(input: any): Promise<any> {
        const flow = this.internalFlow || this.setupInternalFlow();
        await flow.run(input);
        return { success: true };
    }
    
    toConfig(): NodeConfig {
        return {
            type: 'ResearchAgentNode',
            id: this.id,
            params: {
                platform: this.config.platform,
                analysisType: this.config.analysisType,
                analysisOptions: this.config.analysisOptions,
                llmModel: this.config.llmModel,
                maxResults: this.config.maxResults
            }
        };
    }
}
```

#### **JSON Configuration (YouTube Use Case)**

```json
{
  "type": "Flow",
  "namespace": "youtube.research",
  "nodes": [
    {
      "type": "ResearchAgentNode",
      "id": "youtube-agent",
      "params": {
        "platform": "youtube",
        "apiKey": "${YOUTUBE_API_KEY}",
        "maxResults": 50,
        "analysisType": "outlier",
        "analysisOptions": {
          "metric": "views",
          "threshold": 1.5,
          "method": "channel-relative"
        },
        "llmModel": "gpt-4",
        "systemPrompt": "You are a YouTube strategy analyst..."
      }
    }
  ],
  "edges": [],
  "entryNodeId": "youtube-agent"
}
```

#### **Same Agent, Different Platform (Twitter)**

```json
{
  "type": "Flow",
  "namespace": "twitter.research",
  "nodes": [
    {
      "type": "ResearchAgentNode",
      "id": "twitter-agent",
      "params": {
        "platform": "twitter",
        "apiKey": "${TWITTER_BEARER_TOKEN}",
        "maxResults": 100,
        "analysisType": "sentiment",
        "analysisOptions": {
          "model": "bert-base-uncased"
        },
        "llmModel": "gpt-4"
      }
    }
  ],
  "edges": [],
  "entryNodeId": "twitter-agent"
}
```

#### **Multi-Platform Comparison Agent**

```json
{
  "type": "Flow",
  "namespace": "multi.platform.research",
  "nodes": [
    {
      "type": "ResearchAgentNode",
      "id": "youtube",
      "params": {
        "platform": "youtube",
        "analysisType": "outlier"
      }
    },
    {
      "type": "ResearchAgentNode",
      "id": "twitter",
      "params": {
        "platform": "twitter",
        "analysisType": "sentiment"
      }
    },
    {
      "type": "ResearchAgentNode",
      "id": "reddit",
      "params": {
        "platform": "reddit",
        "analysisType": "trend"
      }
    },
    {
      "type": "AggregatorNode",
      "id": "aggregator",
      "params": {
        "strategy": "weighted",
        "weights": {
          "youtube": 0.4,
          "twitter": 0.3,
          "reddit": 0.3
        }
      }
    }
  ],
  "edges": [
    { "from": "youtube", "to": "aggregator", "action": "complete" },
    { "from": "twitter", "to": "aggregator", "action": "complete" },
    { "from": "reddit", "to": "aggregator", "action": "complete" }
  ],
  "entryNodeId": "youtube"
}
```

---

## 🎯 Benefits of This Approach

### 1. **Zero Code for New Use Cases**

Want to research Twitter instead of YouTube? Just change the config:

```json
// Before: Needed to write new agent code
// After: Just change one line
"platform": "twitter"  // instead of "youtube"
```

### 2. **Community Can Contribute Nodes**

Anyone can create and share nodes:

```bash
# Install community node
npm install @backpackflow/node-linkedin-api

# Register it
NodeRegistry.register('LinkedInAPINode', LinkedInAPINode);

# Use it in config
{
  "type": "ResearchAgentNode",
  "platform": "linkedin",  // ✅ Works immediately!
  "analysisType": "outlier"
}
```

### 3. **Studio Can Generate Flows Visually**

Studio can:
- List all available nodes from `NodeRegistry.list()`
- Show input/output schemas for validation
- Generate JSON configs as you drag & drop
- Validate connections based on data contracts

### 4. **A/B Testing & Experimentation**

```json
// Version A: Outlier detection
{
  "platform": "youtube",
  "analysisType": "outlier",
  "analysisOptions": { "threshold": 1.5 }
}

// Version B: Trend analysis
{
  "platform": "youtube",
  "analysisType": "trend",
  "analysisOptions": { "timeWindow": "7d" }
}
```

### 5. **Easy Version Control & Collaboration**

```bash
git diff agent-config.json

-  "analysisType": "outlier",
+  "analysisType": "trend",
```

---

## 🛠️ Infrastructure Needed

### 1. **Node Registry System**
- Central registry for node types
- Metadata extraction
- Category filtering
- Search functionality

### 2. **Strategy Registry**
- Register analysis strategies
- Dynamic loading based on config
- Metadata for strategy options

### 3. **Config Resolver**
- Environment variable substitution
- Secret management
- Validation

### 4. **Dependency Injection Container**
- Manage non-serializable dependencies
- LLM clients, DB connections, API clients
- Lifecycle management

### 5. **Schema Validation Pipeline**
- Validate configs against Zod schemas
- Clear error messages
- Type inference

### 6. **Node Packaging & Distribution**
- NPM package structure for nodes
- Versioning strategy
- Dependency management

---

## 📚 Example: Contributing a New Platform

Let's say a community member wants to add **LinkedIn** support.

### Step 1: Create the API Node

```typescript
// File: @backpackflow/node-linkedin-api/src/linkedin-api-node.ts
export class LinkedInAPINode extends APIClientNode<LinkedInPost> {
    static category = "api-client";
    static displayName = "LinkedIn API";
    static description = "Search LinkedIn posts and fetch engagement metrics";
    static icon = "💼";
    static version = "1.0.0";
    static author = "Community Contributor";
    static tags = ["linkedin", "api", "social"];
    
    static inputs: DataContract = {
        query: z.string().describe('LinkedIn search query')
    };
    
    static outputs: DataContract = {
        posts: z.array(LinkedInPostSchema)
    };
    
    // Implementation...
}
```

### Step 2: Create the Transformer

```typescript
// File: @backpackflow/node-linkedin-api/src/linkedin-transformer.ts
export class LinkedInTransformer implements ContentTransformer<LinkedInPost> {
    transform(post: LinkedInPost): Content {
        return {
            id: post.id,
            title: post.text.substring(0, 100),
            author: post.authorName,
            authorId: post.authorId,
            platform: 'linkedin',
            metrics: {
                likes: post.reactions,
                comments: post.comments,
                shares: post.shares,
                score: post.reactions + post.comments * 2 + post.shares * 3
            },
            publishedAt: post.createdAt,
            url: post.url
        };
    }
}
```

### Step 3: Register with the Framework

```typescript
// File: @backpackflow/node-linkedin-api/src/index.ts
export { LinkedInAPINode } from './linkedin-api-node';
export { LinkedInTransformer } from './linkedin-transformer';

// Auto-register on import
import { NodeRegistry } from 'backpackflow';
import { LinkedInAPINode } from './linkedin-api-node';

NodeRegistry.register('LinkedInAPINode', LinkedInAPINode);
```

### Step 4: Publish to NPM

```bash
npm publish @backpackflow/node-linkedin-api
```

### Step 5: Use in Any Agent

```bash
# Install the community node
npm install @backpackflow/node-linkedin-api

# Import to register
import '@backpackflow/node-linkedin-api';

# Use in config
{
  "type": "ResearchAgentNode",
  "platform": "linkedin",  // ✅ Works!
  "analysisType": "trend"
}
```

---

## 🎨 Studio Integration

With these principles, Studio can:

### 1. **Node Palette**
```typescript
// Fetch all available nodes
const nodes = NodeRegistry.list();

// Group by category
const apiNodes = nodes.filter(n => n.category === 'api-client');
const analysisNodes = nodes.filter(n => n.category === 'analysis');
```

### 2. **Property Panel**
```typescript
// Get node metadata
const node = NodeRegistry.get('YouTubeAPINode');
const inputs = node.inputs;  // Zod schemas

// Generate form from schema
const form = generateFormFromZodSchema(inputs);
```

### 3. **Connection Validation**
```typescript
// Check if nodes can be connected
const canConnect = (sourceNode, targetNode) => {
    const sourceOutputs = sourceNode.outputs;
    const targetInputs = targetNode.inputs;
    
    // Check if output keys match input keys
    return hasMatchingKeys(sourceOutputs, targetInputs);
};
```

### 4. **Live Config Generation**
```typescript
// As user drags & drops, generate JSON
const config = {
    type: 'Flow',
    nodes: canvas.nodes.map(n => n.toConfig()),
    edges: canvas.edges.map(e => e.toConfig())
};

// Download or save
downloadJSON('my-agent.json', config);
```

---

## 🚀 Migration Path for Existing Agents

### Phase 1: Add Metadata
```typescript
// Add metadata to existing nodes
export class YouTubeSearchNode extends BackpackNode {
    // ✅ Add this
    static category = "api-client";
    static displayName = "YouTube Search";
    static icon = "🎥";
    
    // Rest of the code stays the same...
}
```

### Phase 2: Register Nodes
```typescript
// Create registry file
// src/nodes/registry.ts
import { YouTubeSearchNode } from './youtube-search-node';
import { DataAnalysisNode } from './data-analysis-node';

NodeRegistry.register('YouTubeSearchNode', YouTubeSearchNode);
NodeRegistry.register('DataAnalysisNode', DataAnalysisNode);
```

### Phase 3: Extract to Adapters
```typescript
// Refactor YouTubeSearchNode to extend APIClientNode
export class YouTubeAPINode extends APIClientNode<YouTubeVideo> {
    // Move YouTube-specific logic here
}
```

### Phase 4: Make Config-Driven
```typescript
// Support loading from JSON
const loader = new FlowLoader();
const flow = await loader.loadFlow(config);
```

---

## 📖 Documentation Requirements

Every contributed node should have:

1. **README.md** - Installation, usage, examples
2. **API documentation** - Generated from Zod schemas
3. **Examples** - Real-world use cases
4. **Tests** - Unit tests for the node
5. **CHANGELOG.md** - Version history

---

## ✅ Checklist for New Nodes

- [ ] Extends `BackpackNode` or appropriate base class
- [ ] Implements `toConfig()` for serialization
- [ ] Declares `inputs` and `outputs` with Zod
- [ ] Includes metadata (category, displayName, icon, etc.)
- [ ] Follows naming convention: `*Node` suffix
- [ ] Has comprehensive JSDoc comments
- [ ] Includes usage examples
- [ ] Has unit tests
- [ ] Handles errors gracefully
- [ ] Registered in `NodeRegistry`

---

## 🎯 Summary

By following these principles, BackpackFlow becomes:

✅ **Serializable** - Everything is JSON  
✅ **Observable** - Automatic event streaming  
✅ **Composable** - Build complex from simple  
✅ **Extensible** - Plugin architecture  
✅ **Type-Safe** - Zod + TypeScript  
✅ **UI-Ready** - Studio can visualize everything  
✅ **Community-Friendly** - Easy to contribute  
✅ **Production-Ready** - Battle-tested patterns  

The YouTube Research Agent goes from a **monolithic, YouTube-specific script** to a **generic, config-driven, multi-platform research agent** that anyone can extend!

---

**Questions? Feedback?** Let's discuss in [GitHub Discussions](#)!
