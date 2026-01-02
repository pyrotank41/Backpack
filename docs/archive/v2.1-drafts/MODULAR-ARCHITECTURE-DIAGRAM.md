# Modular Architecture - Visual Reference

**Related:** [YouTube Agent Modularity Analysis](./ANALYSIS-YOUTUBE-AGENT-MODULARITY.md)

---

## 🏗️ Current vs. Proposed Architecture

### Current: Monolithic Agent

```mermaid
graph TB
    User[👤 User Query] --> YTAgent[YouTubeResearchAgentNode]
    
    subgraph "Tightly Coupled"
        YTAgent --> YTSearch[YouTubeSearchNode<br/>❌ YouTube API hardcoded]
        YTSearch --> DataAnalysis[DataAnalysisNode<br/>❌ Outlier logic hardcoded]
        DataAnalysis --> ChatNode[BaseChatCompletionNode<br/>✅ Reusable]
    end
    
    ChatNode --> Result[📊 Analysis Report]
    
    style YTAgent fill:#ffcccc,stroke:#cc0000
    style YTSearch fill:#ffcccc,stroke:#cc0000
    style DataAnalysis fill:#ffcccc,stroke:#cc0000
    style ChatNode fill:#ccffcc,stroke:#00cc00
```

**Problems:**
- 🔴 Can't reuse for Twitter, Reddit, Product Hunt
- 🔴 Can't switch analysis strategies
- 🔴 Requires code changes for new platforms

---

### Proposed: Modular Plugin System

```mermaid
graph TB
    User[👤 User Query] --> Agent[ResearchAgentNode<br/>Generic]
    
    subgraph "Platform Layer - Adapters"
        API[APIClientNode<br/>Generic Base]
        API --> YT[YouTubeAPIAdapter]
        API --> TW[TwitterAPIAdapter]
        API --> RD[RedditAPIAdapter]
        API --> PH[ProductHuntAdapter]
    end
    
    subgraph "Normalization Layer"
        Transform[DataTransformerNode<br/>Platform → Common Format]
        YT --> Transform
        TW --> Transform
        RD --> Transform
        PH --> Transform
    end
    
    subgraph "Analysis Layer - Strategies"
        Analysis[DataAnalysisNode<br/>Strategy-Based]
        Transform --> Analysis
        Analysis --> Outlier[OutlierStrategy]
        Analysis --> Trend[TrendStrategy]
        Analysis --> Sentiment[SentimentStrategy]
        Analysis --> Cluster[ClusteringStrategy]
    end
    
    subgraph "Synthesis Layer"
        Analysis --> LLM[LLMSynthesisNode<br/>✅ Already Reusable]
    end
    
    LLM --> Result[📊 Analysis Report]
    
    style Agent fill:#ccffcc,stroke:#00cc00
    style API fill:#ccffcc,stroke:#00cc00
    style Transform fill:#ccffcc,stroke:#00cc00
    style Analysis fill:#ccffcc,stroke:#00cc00
    style LLM fill:#ccffcc,stroke:#00cc00
```

**Benefits:**
- ✅ Add new platforms without touching analysis code
- ✅ Switch analysis strategies via config
- ✅ Reuse components across agents
- ✅ Test each layer independently

---

## 🧩 Component Layering

```mermaid
graph LR
    subgraph "Layer 1: Data Collection"
        A1[API Client<br/>Base Class]
        A2[Platform Adapters<br/>YouTube, Twitter, etc.]
    end
    
    subgraph "Layer 2: Normalization"
        B1[Content Schema<br/>Common Format]
        B2[Transformers<br/>Platform → Content]
    end
    
    subgraph "Layer 3: Analysis"
        C1[Analysis Node<br/>Strategy Pattern]
        C2[Strategies<br/>Outlier, Trend, etc.]
    end
    
    subgraph "Layer 4: Synthesis"
        D1[LLM Node<br/>Insights Generation]
    end
    
    A1 --> A2
    A2 --> B1
    B1 --> B2
    B2 --> C1
    C1 --> C2
    C2 --> D1
    
    style A1 fill:#e3f2fd,stroke:#1976d2
    style B1 fill:#f3e5f5,stroke:#7b1fa2
    style C1 fill:#fff3e0,stroke:#e65100
    style D1 fill:#e8f5e9,stroke:#388e3c
```

---

## 🔄 Data Flow with Common Schema

```mermaid
sequenceDiagram
    participant User
    participant Agent as ResearchAgentNode
    participant API as APIClientNode
    participant Transform as DataTransformerNode
    participant Analysis as DataAnalysisNode
    participant LLM as LLMNode
    
    User->>Agent: Query: "AI tools"
    
    rect rgb(230, 240, 255)
        Note over API: Platform-Specific Format
        Agent->>API: Fetch data
        API-->>Agent: YouTubeVideo[]<br/>or Tweet[]<br/>or RedditPost[]
    end
    
    rect rgb(240, 230, 255)
        Note over Transform: Normalize to Content[]
        Agent->>Transform: Transform data
        Transform-->>Agent: Content[]<br/>(common format)
    end
    
    rect rgb(255, 240, 230)
        Note over Analysis: Strategy-Based Analysis
        Agent->>Analysis: Analyze content
        Analysis-->>Agent: AnalysisResult<br/>+ insights<br/>+ prompt
    end
    
    rect rgb(230, 255, 240)
        Note over LLM: Generate Insights
        Agent->>LLM: Synthesize
        LLM-->>Agent: Analysis Report
    end
    
    Agent-->>User: Final Report
```

---

## 📦 Node Library Organization

```
src/nodes/
│
├── 🎯 core/                        # Framework fundamentals
│   ├── backpack-node.ts           # Base class for all nodes
│   └── base-llm-node.ts           # Base LLM integration
│
├── 🔌 api-clients/                 # Platform integrations
│   ├── base-api-client.ts         # Abstract API client
│   ├── youtube-api.ts             # YouTube Data API v3
│   ├── twitter-api.ts             # Twitter API v2
│   ├── reddit-api.ts              # Reddit API
│   └── producthunt-api.ts         # Product Hunt API
│
├── 🔄 transformers/                # Data normalization
│   ├── data-transformer.ts        # Generic transformer
│   ├── content-schema.ts          # Common Content type
│   └── platform-transformers/
│       ├── youtube-transformer.ts
│       ├── twitter-transformer.ts
│       └── reddit-transformer.ts
│
├── 📊 analysis/                    # Data analysis
│   ├── data-analysis-node.ts      # Strategy-based analyzer
│   └── strategies/
│       ├── outlier-detection.ts   # Statistical outliers
│       ├── trend-analysis.ts      # Time-based trends
│       ├── sentiment-analysis.ts  # Sentiment scoring
│       └── clustering.ts          # Content clustering
│
├── 🤖 llm/                         # LLM nodes
│   ├── base-chat-completion.ts    # Generic LLM wrapper
│   ├── openai-node.ts             # OpenAI-specific
│   └── anthropic-node.ts          # Anthropic-specific
│
└── 🏢 agents/                      # Composite agents
    ├── research-agent.ts          # Generic research agent
    ├── youtube-agent.ts           # YouTube specialization
    ├── twitter-agent.ts           # Twitter specialization
    └── multi-platform-agent.ts    # Cross-platform agent
```

---

## 🎯 Strategy Pattern for Analysis

```mermaid
classDiagram
    class AnalysisStrategy {
        <<interface>>
        +analyze(data) AnalysisResult
        +generateInsights(result) string[]
        +generatePrompt(result) string
    }
    
    class DataAnalysisNode {
        -strategy: AnalysisStrategy
        +constructor(config)
        +_exec(input) Promise
    }
    
    class OutlierStrategy {
        -threshold: number
        -method: string
        +analyze(data) OutlierResult
        +generateInsights(result) string[]
        +generatePrompt(result) string
    }
    
    class TrendStrategy {
        -timeWindow: string
        -groupBy: string
        +analyze(data) TrendResult
        +generateInsights(result) string[]
        +generatePrompt(result) string
    }
    
    class SentimentStrategy {
        -model: string
        +analyze(data) SentimentResult
        +generateInsights(result) string[]
        +generatePrompt(result) string
    }
    
    AnalysisStrategy <|.. OutlierStrategy
    AnalysisStrategy <|.. TrendStrategy
    AnalysisStrategy <|.. SentimentStrategy
    DataAnalysisNode --> AnalysisStrategy : uses
    
    note for DataAnalysisNode "Strategy is selected\nbased on config:\n- analysisType: 'outlier'\n- strategyOptions: {...}"
```

---

## 🔗 Adapter Pattern for APIs

```mermaid
classDiagram
    class APIClientNode~TInput, TOutput~ {
        <<abstract>>
        #apiKey: string
        #baseUrl: string
        #maxResults: number
        +searchPlatform(query, options)* Promise~any[]~
        +fetchDetails(ids)* Promise~TOutput[]~
        +_exec(input) Promise~Result~
    }
    
    class YouTubeAPINode {
        -baseUrl: string
        +searchPlatform(query) Promise~VideoMeta[]~
        +fetchDetails(ids) Promise~YouTubeVideo[]~
    }
    
    class TwitterAPINode {
        -baseUrl: string
        +searchPlatform(query) Promise~TweetMeta[]~
        +fetchDetails(ids) Promise~Tweet[]~
    }
    
    class RedditAPINode {
        -baseUrl: string
        +searchPlatform(query) Promise~PostMeta[]~
        +fetchDetails(ids) Promise~RedditPost[]~
    }
    
    APIClientNode <|-- YouTubeAPINode
    APIClientNode <|-- TwitterAPINode
    APIClientNode <|-- RedditAPINode
    
    note for APIClientNode "Base class handles:\n- Rate limiting\n- Error handling\n- Retry logic\n- Caching"
```

---

## 🌐 Multi-Platform Agent Flow

```mermaid
graph TB
    User[👤 User: 'Research AI productivity tools']
    
    subgraph "Parallel Platform Collection"
        YT[YouTube Agent<br/>Outlier Analysis]
        TW[Twitter Agent<br/>Sentiment Analysis]
        RD[Reddit Agent<br/>Trend Analysis]
    end
    
    User --> YT
    User --> TW
    User --> RD
    
    subgraph "Aggregation Layer"
        Agg[Multi-Platform Aggregator<br/>Combine insights]
        YT --> Agg
        TW --> Agg
        RD --> Agg
    end
    
    subgraph "Synthesis Layer"
        Meta[Meta-Analysis LLM<br/>Cross-platform insights]
        Agg --> Meta
    end
    
    Meta --> Report[📊 Comprehensive Report<br/>- What's trending on each platform?<br/>- Where's the sentiment?<br/>- What's breaking through?]
    
    style YT fill:#ff9999,stroke:#cc0000
    style TW fill:#9999ff,stroke:#0000cc
    style RD fill:#ff9933,stroke:#cc6600
    style Agg fill:#99ff99,stroke:#00cc00
    style Meta fill:#ffff99,stroke:#cccc00
```

---

## 🔧 Configuration-Driven Agent Building

### Example: YouTube Outlier Agent

```json
{
  "type": "ResearchAgentNode",
  "id": "youtube-outlier-agent",
  "config": {
    "platform": "youtube",
    "apiKey": "${YOUTUBE_API_KEY}",
    "maxResults": 50,
    "analysisType": "outlier",
    "analysisOptions": {
      "metric": "views",
      "threshold": 1.5,
      "method": "channel-relative"
    },
    "llm": {
      "model": "gpt-4",
      "temperature": 0.7,
      "systemPrompt": "You are a YouTube strategy analyst..."
    }
  }
}
```

### Example: Multi-Platform Trend Agent

```json
{
  "type": "MultiPlatformAgentNode",
  "id": "trend-scanner",
  "config": {
    "platforms": [
      {
        "name": "youtube",
        "analysisType": "trend",
        "options": { "timeWindow": "7d" }
      },
      {
        "name": "twitter",
        "analysisType": "sentiment",
        "options": { "model": "bert-base" }
      },
      {
        "name": "reddit",
        "analysisType": "trend",
        "options": { "groupBy": "subreddit" }
      }
    ],
    "aggregation": {
      "strategy": "weighted",
      "weights": {
        "youtube": 0.4,
        "twitter": 0.3,
        "reddit": 0.3
      }
    }
  }
}
```

---

## 🎨 Studio Visualization

```mermaid
graph LR
    subgraph "Studio Flow Builder"
        N1[📥 Input<br/>Query]
        
        N2[🔌 API Node<br/>Select Platform ▼]
        N3[🔄 Transform<br/>Normalize]
        N4[📊 Analysis<br/>Select Strategy ▼]
        N5[🤖 LLM<br/>Synthesize]
        
        N1 --> N2
        N2 --> N3
        N3 --> N4
        N4 --> N5
        
        N5 --> N6[📤 Output<br/>Report]
    end
    
    subgraph "Configuration Panel"
        C1[Platform: YouTube ▼<br/>API Key: ****<br/>Max Results: 50]
        C2[Analysis: Outlier ▼<br/>Threshold: 1.5<br/>Method: Channel-Relative ▼]
    end
    
    N2 -.-> C1
    N4 -.-> C2
    
    style N1 fill:#e3f2fd,stroke:#1976d2
    style N6 fill:#e3f2fd,stroke:#1976d2
    style N2 fill:#fff3e0,stroke:#e65100
    style N3 fill:#f3e5f5,stroke:#7b1fa2
    style N4 fill:#ffe0b2,stroke:#ff6f00
    style N5 fill:#e8f5e9,stroke:#388e3c
```

**Studio Features:**
- 🎯 Drag & drop nodes from library
- 🔧 Configure via property panels
- 📊 Preview data flow between nodes
- 🧪 Test with sample data
- 💾 Export to JSON config
- 📤 Deploy to production

---

## 🚀 Migration Roadmap

```mermaid
gantt
    title Modular Architecture Migration
    dateFormat YYYY-MM-DD
    section Phase 1: Core Abstractions
        Create APIClientNode base       :a1, 2025-01-01, 3d
        Create ContentSchema            :a2, after a1, 2d
        Create DataTransformerNode      :a3, after a2, 3d
        Extract OutlierStrategy         :a4, after a1, 3d
    
    section Phase 2: Platform Adapters
        Refactor YouTube → Adapter      :b1, after a3, 3d
        Create Twitter Adapter          :b2, after b1, 4d
        Create Reddit Adapter           :b3, after b2, 4d
    
    section Phase 3: Generic Agent
        Build ResearchAgentNode         :c1, after a4, 5d
        Migrate YouTube Agent           :c2, after c1, 2d
        Create Twitter Agent            :c3, after c2, 2d
        Create Multi-Platform Agent     :c4, after c3, 3d
    
    section Phase 4: Node Library
        Organize node structure         :d1, after c4, 2d
        Write documentation             :d2, after d1, 3d
        Create tutorials                :d3, after d2, 3d
```

**Total Timeline:** ~4 weeks (~20 working days)

---

## 📚 Related Documentation

- 📖 [YouTube Agent Modularity Analysis](./ANALYSIS-YOUTUBE-AGENT-MODULARITY.md)
- 📖 [PRD-004: Composite Nodes](./v2.0/prds/PRD-004-composite-nodes.md)
- 📖 [Studio Agent Guide](./STUDIO-AGENT-GUIDE.md)
- 📖 [BackpackFlow v2.0 Architecture](./v2.0/README.md)

---

**Questions?** Discuss the architecture in [GitHub Discussions](#) or open an issue!
