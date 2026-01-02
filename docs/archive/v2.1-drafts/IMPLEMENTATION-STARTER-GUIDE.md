# Implementation Starter Guide - Modular Agent System

**For:** Developers implementing the modular architecture  
**Prerequisites:** Read [Architecture Analysis](./ANALYSIS-YOUTUBE-AGENT-MODULARITY.md) and [Visual Diagrams](./MODULAR-ARCHITECTURE-DIAGRAM.md)  
**Difficulty:** Intermediate  
**Estimated Time:** 1-2 weeks for Phase 1

---

## 🎯 Quick Start: Build Your First Modular Component

Let's implement the **APIClientNode** base class and a **TwitterAPIAdapter** as a concrete example.

---

## Step 1: Create the Base API Client

### File: `src/nodes/api-clients/base-api-client.ts`

```typescript
/**
 * Generic API Client Node - Base class for platform integrations
 * 
 * Provides common functionality:
 * - Rate limiting
 * - Error handling with retries
 * - Request/response logging
 * - Caching support
 * 
 * Subclasses implement platform-specific logic:
 * - searchPlatform() - Platform search API
 * - fetchDetails() - Fetch detailed information
 */

import { z } from 'zod';
import { BackpackNode, NodeConfig, NodeContext } from '../backpack-node';
import { DataContract } from '../../serialization/types';

/**
 * API Client Configuration
 */
export interface APIClientConfig extends NodeConfig {
    apiKey: string;
    baseUrl: string;
    maxResults?: number;
    rateLimit?: {
        requestsPerMinute: number;
        requestsPerHour?: number;
    };
    retryOptions?: {
        maxRetries: number;
        backoffMs: number;
    };
}

/**
 * Generic API Response
 */
export interface APIResponse<T> {
    data: T[];
    metadata: {
        query: string;
        totalResults: number;
        timestamp: Date;
        cached: boolean;
    };
}

/**
 * Base API Client Node
 * 
 * Usage:
 * ```typescript
 * class YouTubeAPINode extends APIClientNode<YouTubeVideo> {
 *     async searchPlatform(query: string) {
 *         // YouTube-specific search logic
 *     }
 *     
 *     async fetchDetails(ids: string[]) {
 *         // YouTube-specific details logic
 *     }
 * }
 * ```
 */
export abstract class APIClientNode<TOutput> extends BackpackNode {
    static namespaceSegment = "api.client";
    
    /**
     * Input data contract - expects a search query
     */
    static inputs: DataContract = {
        query: z.string()
            .min(1, 'Query cannot be empty')
            .describe('Search query or request parameters')
    };
    
    /**
     * Output data contract - returns array of results + metadata
     */
    static outputs: DataContract = {
        results: z.array(z.any())
            .describe('Array of results from the API'),
        metadata: z.object({
            query: z.string(),
            totalResults: z.number(),
            timestamp: z.date(),
            cached: z.boolean().optional()
        }).describe('Metadata about the API response')
    };
    
    protected apiKey: string;
    protected baseUrl: string;
    protected maxResults: number;
    protected rateLimit?: APIClientConfig['rateLimit'];
    protected retryOptions: { maxRetries: number; backoffMs: number };
    
    // Rate limiting state
    private requestTimestamps: number[] = [];
    
    constructor(config: APIClientConfig, context: NodeContext) {
        super(config, context);
        
        this.apiKey = config.apiKey || this.getAPIKeyFromEnv();
        this.baseUrl = config.baseUrl;
        this.maxResults = config.maxResults ?? 50;
        this.rateLimit = config.rateLimit;
        this.retryOptions = config.retryOptions ?? {
            maxRetries: 3,
            backoffMs: 1000
        };
        
        if (!this.apiKey) {
            throw new Error(`API key is required for ${this.constructor.name}`);
        }
    }
    
    /**
     * Get API key from environment variable (override in subclass)
     */
    protected getAPIKeyFromEnv(): string {
        return '';
    }
    
    /**
     * Serialize to config (PRD-003)
     */
    toConfig(): NodeConfig {
        return {
            type: this.constructor.name,
            id: this.id,
            params: {
                baseUrl: this.baseUrl,
                maxResults: this.maxResults,
                apiKey: '***' // Never expose API keys
            }
        };
    }
    
    /**
     * Platform-specific search implementation (must override)
     */
    abstract searchPlatform(query: string, options?: any): Promise<Array<{id: string, [key: string]: any}>>;
    
    /**
     * Platform-specific detail fetching (must override)
     */
    abstract fetchDetails(ids: string[]): Promise<TOutput[]>;
    
    /**
     * Preparation phase: Extract query from backpack
     */
    async prep(shared: any): Promise<{ query: string }> {
        const query = this.unpackRequired<string>('query');
        return { query };
    }
    
    /**
     * Execution phase: Search and fetch details
     */
    async _exec(input: { query: string }): Promise<APIResponse<TOutput>> {
        try {
            // Step 1: Search for items
            await this.enforceRateLimit();
            const searchResults = await this.retryWithBackoff(() => 
                this.searchPlatform(input.query)
            );
            
            if (searchResults.length === 0) {
                return {
                    data: [],
                    metadata: {
                        query: input.query,
                        totalResults: 0,
                        timestamp: new Date(),
                        cached: false
                    }
                };
            }
            
            // Step 2: Fetch detailed information
            const ids = searchResults.map(r => r.id);
            await this.enforceRateLimit();
            const details = await this.retryWithBackoff(() => 
                this.fetchDetails(ids)
            );
            
            return {
                data: details,
                metadata: {
                    query: input.query,
                    totalResults: details.length,
                    timestamp: new Date(),
                    cached: false
                }
            };
            
        } catch (error: any) {
            throw new Error(`${this.constructor.name} API error: ${error.message}`);
        }
    }
    
    /**
     * Post-processing phase: Store results in backpack
     */
    async post(backpack: any, shared: any, output: APIResponse<TOutput>): Promise<string | undefined> {
        // Pack results
        this.pack('results', output.data);
        
        // Pack metadata
        this.pack('metadata', output.metadata);
        
        // Return action based on results
        if (output.data.length === 0) {
            return 'no_results';
        }
        
        return 'complete';
    }
    
    /**
     * Enforce rate limiting
     */
    private async enforceRateLimit(): Promise<void> {
        if (!this.rateLimit) return;
        
        const now = Date.now();
        const oneMinuteAgo = now - 60 * 1000;
        
        // Remove old timestamps
        this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneMinuteAgo);
        
        // Check if we've hit the rate limit
        if (this.requestTimestamps.length >= this.rateLimit.requestsPerMinute) {
            const oldestRequest = this.requestTimestamps[0];
            const waitTime = 60 * 1000 - (now - oldestRequest);
            
            console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
            await this.sleep(waitTime);
        }
        
        // Record this request
        this.requestTimestamps.push(now);
    }
    
    /**
     * Retry with exponential backoff
     */
    private async retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
        let lastError: Error | undefined;
        
        for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error: any) {
                lastError = error;
                
                if (attempt < this.retryOptions.maxRetries) {
                    const backoff = this.retryOptions.backoffMs * Math.pow(2, attempt);
                    console.log(`Attempt ${attempt + 1} failed. Retrying in ${backoff}ms...`);
                    await this.sleep(backoff);
                }
            }
        }
        
        throw lastError || new Error('Max retries exceeded');
    }
    
    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

---

## Step 2: Create a Platform Adapter (Twitter Example)

### File: `src/nodes/api-clients/twitter-api-node.ts`

```typescript
/**
 * Twitter API Node - Adapter for Twitter API v2
 * 
 * Searches tweets and fetches detailed metrics
 */

import { z } from 'zod';
import { APIClientNode, APIClientConfig, APIResponse } from './base-api-client';
import { NodeContext } from '../backpack-node';

/**
 * Twitter Tweet Schema
 */
export const TweetSchema = z.object({
    id: z.string(),
    text: z.string(),
    authorUsername: z.string(),
    authorId: z.string(),
    authorName: z.string(),
    
    // Metrics
    likes: z.number(),
    retweets: z.number(),
    replies: z.number(),
    impressions: z.number().optional(),
    
    // Metadata
    createdAt: z.date(),
    url: z.string().url(),
    language: z.string().optional(),
    hashtags: z.array(z.string()).optional()
});

export type Tweet = z.infer<typeof TweetSchema>;

/**
 * Twitter API Node
 * 
 * Usage:
 * ```typescript
 * const twitterNode = flow.addNode(TwitterAPINode, {
 *     id: 'twitter',
 *     apiKey: process.env.TWITTER_BEARER_TOKEN,
 *     baseUrl: 'https://api.twitter.com/2',
 *     maxResults: 100
 * });
 * ```
 */
export class TwitterAPINode extends APIClientNode<Tweet> {
    static namespaceSegment = "twitter.api";
    
    /**
     * Override output schema with Twitter-specific type
     */
    static outputs = {
        results: z.array(TweetSchema)
            .describe('Array of tweets with full metrics'),
        metadata: z.object({
            query: z.string(),
            totalResults: z.number(),
            timestamp: z.date(),
            cached: z.boolean().optional()
        })
    };
    
    constructor(config: APIClientConfig, context: NodeContext) {
        super({
            ...config,
            baseUrl: config.baseUrl || 'https://api.twitter.com/2',
            rateLimit: config.rateLimit || {
                requestsPerMinute: 15, // Twitter's rate limit for search
                requestsPerHour: 450
            }
        }, context);
    }
    
    /**
     * Get Twitter Bearer Token from environment
     */
    protected getAPIKeyFromEnv(): string {
        return process.env.TWITTER_BEARER_TOKEN || '';
    }
    
    /**
     * Search tweets using Twitter API v2
     */
    async searchPlatform(query: string, options?: any): Promise<Array<{id: string}>> {
        const params = new URLSearchParams({
            query: query,
            max_results: Math.min(this.maxResults, 100).toString(), // Twitter max is 100
            'tweet.fields': 'created_at,public_metrics,author_id,lang,entities'
        });
        
        const response = await fetch(`${this.baseUrl}/tweets/search/recent?${params}`, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json() as any;
            throw new Error(error.detail || error.title || 'Twitter search failed');
        }
        
        const data = await response.json() as any;
        
        return data.data?.map((tweet: any) => ({
            id: tweet.id
        })) || [];
    }
    
    /**
     * Fetch detailed tweet information
     */
    async fetchDetails(tweetIds: string[]): Promise<Tweet[]> {
        // Twitter allows up to 100 tweet IDs per request
        const tweets: Tweet[] = [];
        
        for (let i = 0; i < tweetIds.length; i += 100) {
            const batch = tweetIds.slice(i, i + 100);
            const batchTweets = await this.fetchTweetBatch(batch);
            tweets.push(...batchTweets);
        }
        
        return tweets;
    }
    
    /**
     * Fetch a batch of tweets
     */
    private async fetchTweetBatch(tweetIds: string[]): Promise<Tweet[]> {
        const params = new URLSearchParams({
            ids: tweetIds.join(','),
            'tweet.fields': 'created_at,public_metrics,author_id,lang,entities',
            'user.fields': 'username,name',
            expansions: 'author_id'
        });
        
        const response = await fetch(`${this.baseUrl}/tweets?${params}`, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json() as any;
            throw new Error(error.detail || error.title || 'Twitter fetch failed');
        }
        
        const data = await response.json() as any;
        
        // Map users by ID for easy lookup
        const users = new Map(
            data.includes?.users?.map((u: any) => [u.id, u]) || []
        );
        
        return data.data?.map((tweet: any) => {
            const author = users.get(tweet.author_id);
            return {
                id: tweet.id,
                text: tweet.text,
                authorUsername: author?.username || 'unknown',
                authorId: tweet.author_id,
                authorName: author?.name || 'Unknown',
                likes: tweet.public_metrics.like_count,
                retweets: tweet.public_metrics.retweet_count,
                replies: tweet.public_metrics.reply_count,
                impressions: tweet.public_metrics.impression_count,
                createdAt: new Date(tweet.created_at),
                url: `https://twitter.com/${author?.username}/status/${tweet.id}`,
                language: tweet.lang,
                hashtags: tweet.entities?.hashtags?.map((h: any) => h.tag) || []
            };
        }) || [];
    }
}
```

---

## Step 3: Create the Content Schema & Transformer

### File: `src/nodes/transformers/content-schema.ts`

```typescript
/**
 * Common Content Schema - Platform-agnostic content representation
 * 
 * Normalizes data from different platforms (YouTube, Twitter, Reddit, etc.)
 * into a common format for downstream analysis.
 */

import { z } from 'zod';

/**
 * Content Metrics Schema
 */
export const ContentMetricsSchema = z.object({
    views: z.number().optional(),
    likes: z.number(),
    comments: z.number(),
    shares: z.number().optional(),
    score: z.number().describe('Primary engagement metric (platform-specific)')
});

/**
 * Content Schema
 */
export const ContentSchema = z.object({
    id: z.string(),
    title: z.string(),
    author: z.string(),
    authorId: z.string(),
    platform: z.enum(['youtube', 'twitter', 'reddit', 'producthunt', 'hackernews']),
    
    // Engagement metrics (normalized)
    metrics: ContentMetricsSchema,
    
    // Metadata
    publishedAt: z.date(),
    url: z.string().url(),
    thumbnail: z.string().url().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional()
});

export type Content = z.infer<typeof ContentSchema>;
export type ContentMetrics = z.infer<typeof ContentMetricsSchema>;

/**
 * Content Transformer Interface
 * 
 * Each platform implements this interface to transform
 * platform-specific data into the common Content format.
 */
export interface ContentTransformer<TInput = any> {
    transform(rawData: TInput): Content;
}
```

### File: `src/nodes/transformers/data-transformer-node.ts`

```typescript
/**
 * Data Transformer Node - Normalize platform data to common format
 */

import { z } from 'zod';
import { BackpackNode, NodeConfig, NodeContext } from '../backpack-node';
import { DataContract } from '../../serialization/types';
import { Content, ContentSchema, ContentTransformer } from './content-schema';
import { YouTubeTransformer } from './youtube-transformer';
import { TwitterTransformer } from './twitter-transformer';
// Import other transformers...

export interface DataTransformerConfig extends NodeConfig {
    platform: 'youtube' | 'twitter' | 'reddit' | 'producthunt';
}

/**
 * Data Transformer Node
 * 
 * Converts platform-specific schemas to common Content schema
 */
export class DataTransformerNode extends BackpackNode {
    static namespaceSegment = "transform";
    
    static inputs: DataContract = {
        results: z.array(z.any())
            .describe('Platform-specific results to transform')
    };
    
    static outputs: DataContract = {
        normalizedContent: z.array(ContentSchema)
            .describe('Normalized content in common format')
    };
    
    private platform: string;
    private transformer: ContentTransformer;
    
    constructor(config: DataTransformerConfig, context: NodeContext) {
        super(config, context);
        
        this.platform = config.platform;
        this.transformer = this.createTransformer(config.platform);
    }
    
    toConfig(): NodeConfig {
        return {
            type: 'DataTransformerNode',
            id: this.id,
            params: {
                platform: this.platform
            }
        };
    }
    
    async prep(shared: any): Promise<{ results: any[] }> {
        const results = this.unpackRequired<any[]>('results');
        return { results };
    }
    
    async _exec(input: { results: any[] }): Promise<{ content: Content[] }> {
        const normalized = input.results.map(item => 
            this.transformer.transform(item)
        );
        
        return { content: normalized };
    }
    
    async post(backpack: any, shared: any, output: { content: Content[] }): Promise<string | undefined> {
        this.pack('normalizedContent', output.content);
        return 'complete';
    }
    
    /**
     * Factory method to create platform-specific transformer
     */
    private createTransformer(platform: string): ContentTransformer {
        switch (platform) {
            case 'youtube':
                return new YouTubeTransformer();
            case 'twitter':
                return new TwitterTransformer();
            // Add other platforms...
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }
}
```

### File: `src/nodes/transformers/twitter-transformer.ts`

```typescript
/**
 * Twitter to Content Transformer
 */

import { Content, ContentTransformer } from './content-schema';
import { Tweet } from '../api-clients/twitter-api-node';

export class TwitterTransformer implements ContentTransformer<Tweet> {
    transform(tweet: Tweet): Content {
        return {
            id: tweet.id,
            title: tweet.text.substring(0, 100) + (tweet.text.length > 100 ? '...' : ''),
            author: tweet.authorUsername,
            authorId: tweet.authorId,
            platform: 'twitter',
            
            metrics: {
                views: tweet.impressions,
                likes: tweet.likes,
                comments: tweet.replies,
                shares: tweet.retweets,
                score: tweet.likes + tweet.retweets * 2 // Weighted score
            },
            
            publishedAt: tweet.createdAt,
            url: tweet.url,
            description: tweet.text,
            tags: tweet.hashtags
        };
    }
}
```

---

## Step 4: Test Your New Components

### File: `tests/api-clients/twitter-api.test.ts`

```typescript
import { TwitterAPINode } from '../../src/nodes/api-clients/twitter-api-node';
import { DataTransformerNode } from '../../src/nodes/transformers/data-transformer-node';
import { Flow } from '../../src/flows/flow';
import { Backpack } from '../../src/storage/backpack';
import { EventStreamer } from '../../src/events';

describe('Twitter API Integration', () => {
    let backpack: Backpack;
    let eventStreamer: EventStreamer;
    let flow: Flow;
    
    beforeEach(() => {
        backpack = new Backpack({});
        eventStreamer = new EventStreamer({ enableHistory: true });
        flow = new Flow({
            namespace: 'test',
            backpack,
            eventStreamer
        });
    });
    
    it('should fetch tweets and transform to common format', async () => {
        // Skip if no API key
        if (!process.env.TWITTER_BEARER_TOKEN) {
            console.log('Skipping Twitter test: No API key');
            return;
        }
        
        // Add Twitter API node
        const twitterNode = flow.addNode(TwitterAPINode, {
            id: 'twitter',
            apiKey: process.env.TWITTER_BEARER_TOKEN,
            baseUrl: 'https://api.twitter.com/2',
            maxResults: 10
        });
        
        // Add transformer node
        const transformNode = flow.addNode(DataTransformerNode, {
            id: 'transform',
            platform: 'twitter'
        });
        
        // Wire nodes
        twitterNode.onComplete(transformNode);
        flow.setEntryNode(twitterNode);
        
        // Pack query
        backpack.pack('query', 'AI agents', { nodeId: 'test' });
        
        // Run flow
        await flow.run({});
        
        // Verify results
        const tweets = backpack.unpack('results');
        const normalized = backpack.unpack('normalizedContent');
        
        expect(tweets).toBeDefined();
        expect(tweets.length).toBeGreaterThan(0);
        
        expect(normalized).toBeDefined();
        expect(normalized.length).toBe(tweets.length);
        expect(normalized[0].platform).toBe('twitter');
        expect(normalized[0].metrics.likes).toBeDefined();
    });
});
```

---

## Step 5: Use in a Research Agent

### File: `tutorials/twitter-research-agent/twitter-research-agent.ts`

```typescript
/**
 * Twitter Research Agent - Using modular components
 */

import { Flow } from '../../src/flows/flow';
import { Backpack } from '../../src/storage/backpack';
import { EventStreamer } from '../../src/events';
import { BackpackNode } from '../../src/nodes/backpack-node';
import { TwitterAPINode } from '../../src/nodes/api-clients/twitter-api-node';
import { DataTransformerNode } from '../../src/nodes/transformers/data-transformer-node';
import { DataAnalysisNode } from '../../src/nodes/analysis/data-analysis-node';
import { BaseChatCompletionNode } from '../youtube-research-agent/base-chat-completion-node';

class TwitterResearchAgentNode extends BackpackNode {
    static namespaceSegment = "twitter.research";
    
    setupInternalFlow(): Flow {
        const flow = this.createInternalFlow();
        
        // 1. Fetch tweets
        const twitterNode = flow.addNode(TwitterAPINode, {
            id: 'twitter',
            apiKey: process.env.TWITTER_BEARER_TOKEN!,
            maxResults: 100
        });
        
        // 2. Transform to common format
        const transformNode = flow.addNode(DataTransformerNode, {
            id: 'transform',
            platform: 'twitter'
        });
        
        // 3. Analyze for trends or outliers
        const analysisNode = flow.addNode(DataAnalysisNode, {
            id: 'analysis',
            analysisType: 'sentiment', // or 'trend', 'outlier'
            strategyOptions: {
                // Strategy-specific options
            }
        });
        
        // 4. Generate insights
        const llmNode = flow.addNode(BaseChatCompletionNode, {
            id: 'synthesis',
            model: 'gpt-4',
            systemPrompt: 'You are a Twitter analytics expert...'
        });
        
        // Wire flow
        twitterNode.onComplete(transformNode);
        transformNode.onComplete(analysisNode);
        analysisNode.onComplete(llmNode);
        
        flow.setEntryNode(twitterNode);
        
        return flow;
    }
    
    async _exec(input: any): Promise<any> {
        const flow = this.internalFlow || this.setupInternalFlow();
        await flow.run(input);
        return { success: true };
    }
}

// Usage
async function main() {
    const backpack = new Backpack({});
    const eventStreamer = new EventStreamer({ enableHistory: true });
    
    const flow = new Flow({
        namespace: 'twitter.research',
        backpack,
        eventStreamer
    });
    
    const agent = flow.addNode(TwitterResearchAgentNode, {
        id: 'agent'
    });
    
    flow.setEntryNode(agent);
    
    // Pack query
    backpack.pack('query', 'AI productivity tools', { nodeId: 'user' });
    
    // Run
    await flow.run({});
    
    // Get results
    const analysis = backpack.unpack('analysis');
    console.log(analysis);
}

main().catch(console.error);
```

---

## 🎯 Next Steps

1. **Implement remaining platform adapters:**
   - RedditAPINode
   - ProductHuntAPINode
   - HackerNewsAPINode

2. **Create analysis strategies:**
   - TrendAnalysisStrategy
   - SentimentAnalysisStrategy
   - ClusteringStrategy

3. **Build generic ResearchAgentNode:**
   - Config-driven platform selection
   - Strategy-based analysis
   - Reusable across platforms

4. **Add caching layer:**
   - CacheNode for API responses
   - Redis/File-based storage
   - TTL support

5. **Create Studio UI components:**
   - Platform selector dropdown
   - Strategy configuration panel
   - Live data preview

---

## 📚 Additional Resources

- [Architecture Analysis](./ANALYSIS-YOUTUBE-AGENT-MODULARITY.md)
- [Visual Diagrams](./MODULAR-ARCHITECTURE-DIAGRAM.md)
- [PRD-004: Composite Nodes](./v2.0/prds/PRD-004-composite-nodes.md)
- [BackpackFlow Documentation](./v2.0/README.md)

---

**Questions?** Open an issue or discussion on GitHub!
