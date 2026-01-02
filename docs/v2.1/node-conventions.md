# Node Naming Conventions & Standards

**Version**: v2.1  
**Purpose**: Reference guide for node metadata auto-generation

---

## 📋 Overview

BackpackFlow v2.1 uses **convention over configuration** to auto-generate node metadata from class names and Zod schemas. This document defines those conventions.

---

## 🏷️ Category Inference

Class name keywords automatically determine the category:

| Keywords in Class Name | Category | Example |
|------------------------|----------|---------|
| `API`, `Search`, `Fetch` | `api-client` | YouTubeSearchNode → api-client |
| `Analysis`, `Analyze`, `Statistics` | `analysis` | DataAnalysisNode → analysis |
| `LLM`, `Chat`, `Completion`, `GPT` | `llm` | BaseChatCompletionNode → llm |
| `Transform`, `Convert`, `Mapper` | `transform` | JSONTransformNode → transform |
| `Agent` | `agent` | ResearchAgentNode → agent |
| `Filter`, `Sort`, `Aggregate` | `data` | DataFilterNode → data |
| *(default)* | `utility` | HelperNode → utility |

---

## 🎨 Icon Inference

### Platform-Specific Icons
Platform keywords override category defaults:

| Platform | Icon | Example |
|----------|------|---------|
| YouTube | 🎥 | YouTubeSearchNode |
| Twitter | 🐦 | TwitterAPINode |
| Reddit | 🤖 | RedditScraperNode |
| LinkedIn | 💼 | LinkedInConnectorNode |
| GitHub | 🐙 | GitHubAPINode |
| Slack | 💬 | SlackIntegrationNode |
| Discord | 🎮 | DiscordBotNode |

### Category Default Icons
Used when no platform detected:

| Category | Icon |
|----------|------|
| `api-client` | 🔌 |
| `analysis` | 📊 |
| `llm` | 🤖 |
| `transform` | 🔄 |
| `agent` | 🤵 |
| `data` | 📦 |
| `utility` | 🔧 |

---

## 🎨 Color Standards

Each category has a standard color for consistency:

| Category | Color | Hex Code |
|----------|-------|----------|
| `api-client` | Blue | `#2196F3` |
| `analysis` | Green | `#4CAF50` |
| `llm` | Purple | `#9C27B0` |
| `transform` | Orange | `#FF9800` |
| `agent` | Red | `#F44336` |
| `data` | Cyan | `#00BCD4` |
| `utility` | Blue Grey | `#607D8B` |

---

## 📝 Display Name Generation

Class names are converted to human-readable display names:

| Class Name | Display Name |
|------------|--------------|
| `YouTubeSearchNode` | "YouTube Search" |
| `DataAnalysisNode` | "Data Analysis" |
| `BaseChatCompletionNode` | "Base Chat Completion" |
| `TwitterAPINode` | "Twitter API" |

**Rules**:
1. Remove `Node` suffix
2. Insert spaces before capital letters
3. Normalize multiple spaces
4. Preserve acronyms (API, LLM, etc.)

---

## 🔤 Internal Name Generation

Display names are converted to camelCase for internal use:

| Display Name | Internal Name |
|--------------|---------------|
| "YouTube Search" | `youTubeSearch` |
| "Data Analysis" | `dataAnalysis` |
| "Twitter API" | `twitterAPI` |

---

## 📦 Zod Schema → UI Properties

The `zod-to-properties` utility converts Zod types to UI field types:

### Type Mapping

| Zod Type | UI Type | Notes |
|----------|---------|-------|
| `z.string()` | `string` | Text input |
| `z.number()` | `number` | Number input with min/max |
| `z.boolean()` | `boolean` | Checkbox |
| `z.enum([...])` | `options` | Dropdown selector |
| `z.object({...})` | `json` | JSON editor |
| `z.array([...])` | `json` | JSON array editor |

### Constraint Extraction

```typescript
// Zod schema
z.number().min(1).max(100).default(50)

// Auto-generates UI property
{
    type: 'number',
    default: 50,
    typeOptions: {
        minValue: 1,
        maxValue: 100
    }
}
```

### Description Parsing

```typescript
// Zod schema
z.string().describe('Your API key for authentication')

// Auto-generates UI property
{
    type: 'string',
    description: 'Your API key for authentication'
}
```

### Required vs Optional

```typescript
// Required (no .optional())
z.string() → required: true

// Optional
z.string().optional() → required: false

// Default value (makes it optional)
z.string().default('') → required: false, default: ''
```

---

## 🏗️ Three-Schema Pattern

Every node should define three Zod schemas:

### 1. Config Schema
```typescript
static config = z.object({
    apiKey: z.string().describe('Your API key'),
    timeout: z.number().min(1000).default(5000)
});
```
- Used for node configuration
- **Auto-generates UI properties**
- Validated at construction

### 2. Input Contract
```typescript
static inputs = {
    query: z.string().min(1).describe('Search query'),
    filters: z.object({...}).optional()
};
```
- Defines Backpack → Node data flow
- Validated at runtime
- Used for flow compatibility checking

### 3. Output Contract
```typescript
static outputs = {
    results: z.array(z.any()).describe('Search results'),
    metadata: z.object({...})
};
```
- Defines Node → Backpack data flow
- Documents what node produces
- Used for flow composition

---

## ✅ Best Practices

### DO ✓

```typescript
// Good: Descriptive class name
export class YouTubeVideoSearchNode extends BackpackNode {
    // Auto-generates: "YouTube Video Search", api-client, 🎥
}

// Good: Rich Zod schema
static config = z.object({
    apiKey: z.string()
        .min(1)
        .describe('YouTube Data API v3 key'),
    maxResults: z.number()
        .min(1)
        .max(100)
        .default(50)
        .describe('Maximum videos to fetch')
});

// Good: Complete contracts
static inputs = {
    searchQuery: z.string().min(1).describe('Search query')
};
static outputs = {
    videos: z.array(YouTubeVideoSchema).describe('Found videos')
};
```

### DON'T ✗

```typescript
// Bad: Vague class name
export class ProcessorNode extends BackpackNode {
    // Generates: "Processor", utility, 🔧 (not helpful!)
}

// Bad: Minimal Zod schema
static config = z.object({
    apiKey: z.string(),  // No description!
    max: z.number()      // Unclear name!
});

// Bad: No input/output contracts
// (Missing validation and documentation)
```

---

## 🔍 Override Conventions

If auto-generation doesn't fit your needs, override manually:

```typescript
export class MySpecialNode extends BackpackNode {
    // Override auto-generation
    static getMetadata(): NodeDescription {
        return {
            displayName: 'My Custom Name',
            name: 'myCustomName',
            icon: '⚡',
            category: 'special',
            // ... rest of metadata
        };
    }
}
```

---

## 📊 Examples

### Example 1: API Client Node
```typescript
export class TwitterAPINode extends BackpackNode {
    // Auto-generates:
    // - Display: "Twitter API"
    // - Category: "api-client"
    // - Icon: "🐦"
    // - Color: "#2196F3"
    
    static config = z.object({
        bearerToken: z.string().describe('Twitter API bearer token'),
        rateLimit: z.number().default(300)
    });
}
```

### Example 2: Analysis Node
```typescript
export class SentimentAnalysisNode extends BackpackNode {
    // Auto-generates:
    // - Display: "Sentiment Analysis"
    // - Category: "analysis"
    // - Icon: "📊"
    // - Color: "#4CAF50"
    
    static config = z.object({
        model: z.enum(['basic', 'advanced']).default('basic'),
        threshold: z.number().min(0).max(1).default(0.5)
    });
}
```

### Example 3: LLM Node
```typescript
export class GPT4CompletionNode extends BackpackNode {
    // Auto-generates:
    // - Display: "GPT4 Completion"
    // - Category: "llm"
    // - Icon: "🤖"
    // - Color: "#9C27B0"
    
    static config = z.object({
        apiKey: z.string().describe('OpenAI API key'),
        model: z.enum(['gpt-4', 'gpt-4-turbo']).default('gpt-4'),
        temperature: z.number().min(0).max(2).default(0.7)
    });
}
```

---

## 📚 Related Documentation

- [node-restructuring-guide.md](node-restructuring-guide.md) - Migration guide
- [NODE-METADATA-IMPLEMENTATION-SUMMARY.md](NODE-METADATA-IMPLEMENTATION-SUMMARY.md) - Implementation details
- [ai-first-architecture.md](ai-first-architecture.md) - Strategic vision

---

**Last Updated**: December 30, 2025
