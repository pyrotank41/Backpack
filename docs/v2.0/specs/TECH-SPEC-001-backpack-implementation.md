# Tech Spec 001: Backpack Implementation

**Related PRD:** [PRD-001: Backpack Architecture](../prds/PRD-001-backpack-architecture.md)  
**Status:** Draft  
**Engineer:** TBD  
**Estimated Effort:** 4 weeks (1 engineer)

---

## 1. Design Decisions

### Decision 1: Error Handling Strategy

**Question (PRD-001, Q1):** Should `.unpack()` throw or return `undefined`?

**Decision:** **Provide both methods** (Hybrid approach)

```typescript
unpack<V>(key: string, nodeId: string): V | undefined;       // Graceful
unpackRequired<V>(key: string, nodeId: string): V;           // Fail-fast
```

**Rationale:** Let developers choose based on whether data is optional or required.

---

### Decision 2: Commit History Size Limit

**Question (PRD-001, Q2):** How large should the commit history grow?

**Decision:** **Circular buffer with 10,000 commits** (configurable)

```typescript
class Backpack {
    private maxHistorySize: number = 10000;
    
    private addToHistory(commit: BackpackCommit): void {
        this._history.push(commit);
        if (this._history.length > this.maxHistorySize) {
            this._history.shift();  // Remove oldest
        }
    }
}
```

**Rationale:**
- 10k commits = ~10MB memory (avg 1KB per commit)
- Covers most debugging scenarios (typical flow = 50-500 commits)
- Configurable via constructor for power users

---

### Decision 3: Rollback Support

**Question (PRD-001, Q3):** Support rollback (undo a pack operation)?

**Decision:** **No rollback in v2.0.** Backpack is immutable-by-default.

**Rationale:**
- Rollback breaks immutability guarantees (critical for debugging)
- If needed, use `getSnapshot(timestamp)` to create a new Backpack from past state
- Can add in v2.1 if users demand it

---

### Decision 4: Namespace Wildcard Matching in Access Control

**Question (PRD-001, Q4):** Support wildcards in `namespaceRead: ['sales.*']`?

**Decision:** **Yes.** Implement glob-style pattern matching.

```typescript
permissions: {
    namespaceRead: ['sales.*'],      // ✅ Matches sales.chat, sales.research
    namespaceWrite: ['reporting.*']  // ✅ Matches reporting.analytics
}
```

**Algorithm:** Use regex-based matching (see Pattern Matching section below).

---

### Decision 5: Graph-Assigned Namespace Composition

**Question:** Should nodes define full namespace paths or just segments?

**Decision:** **Nodes define segments, Flows/Graphs compose full paths.**

**Rationale:**
- **Reusability:** Same node class can be used in different contexts
- **Loose Coupling:** Node doesn't need to know parent hierarchy
- **Config-Friendly:** JSON configs can define dynamic hierarchies
- **Industry Standard:** Mirrors Kubernetes (Pod + Namespace), DNS (hostname + zone)

**Implementation Pattern:**

```typescript
// 1. Node defines static segment
export abstract class BackpackNode extends BaseNode {
    static namespaceSegment?: string;  // Optional segment identifier
    namespace: string;                 // Full path (assigned by Flow)
    
    constructor(config: NodeConfig, context: NodeContext) {
        super(config);
        // Namespace is assigned by Flow, not by node itself
        this.namespace = context.namespace;
    }
}

// 2. Concrete node defines segment
export class SummaryNode extends BackpackNode {
    static namespaceSegment = "summary";  // Just the identity
}

// 3. Flow composes full namespace
export class Flow {
    private namespace: string;
    
    createNode(NodeClass: typeof BackpackNode, config: NodeConfig): BackpackNode {
        const segment = NodeClass.namespaceSegment || config.id;
        const fullNamespace = this.namespace 
            ? `${this.namespace}.${segment}`
            : segment;
        
        return new NodeClass(config, { 
            namespace: fullNamespace,
            backpack: this.backpack 
        });
    }
}
```

**Namespace Composition Algorithm:**

```typescript
function composeNamespace(
    parentNamespace: string | undefined,
    nodeSegment: string | undefined,
    nodeId: string
): string {
    // Priority: static segment > config segment > node ID
    const segment = nodeSegment || nodeId;
    
    // Compose full path
    if (!parentNamespace) return segment;
    return `${parentNamespace}.${segment}`;
}

// Examples:
composeNamespace("sales", "summary", "node-123")     → "sales.summary"
composeNamespace("sales.reports", "daily", "n-1")    → "sales.reports.daily"
composeNamespace(undefined, "root", "node-1")        → "root"
composeNamespace("sales", undefined, "node-123")     → "sales.node-123"
```

**Config-Driven Example:**

```json
{
  "version": "2.0.0",
  "namespace": "sales",
  "nodes": [
    {
      "id": "chat-node",
      "type": "ChatNode"
    }
  ],
  "subflows": [
    {
      "namespace": "reports",
      "nodes": [
        { "id": "daily", "type": "ReportNode" }
      ]
    }
  ]
}
```
**Produces:**
- `sales.chat` (from ChatNode.namespaceSegment = "chat")
- `sales.reports.daily` (nested composition)

---

## 2. Class Structure

### Core Classes

```typescript
// Main class
export class Backpack<T extends BaseStorage = BaseStorage> {
    private _items: Map<string, BackpackItem>;
    private _history: BackpackCommit[];
    private _accessControl: AccessControl;
    private maxHistorySize: number;
    
    constructor(initialData?: T, options?: BackpackOptions);
}

// Supporting types
interface BackpackItem { ... }
interface BackpackCommit { ... }
interface AccessControl { ... }
interface BackpackOptions {
    maxHistorySize?: number;
    strictMode?: boolean;  // Throw on access violations vs. log warning
}
```

### Inheritance Hierarchy

```
BaseStorage (interface)
    ↓
Backpack<T extends BaseStorage>
    ↓
[User's custom storage types]

BaseNode (PocketFlow)
    ↓
BackpackNode (extends BaseNode)
    ↓
[User's custom nodes: ChatNode, ToolNode, etc.]
```

### BackpackNode Class

```typescript
export abstract class BackpackNode extends BaseNode {
    // Static: Node's segment identifier (like a filename)
    static namespaceSegment?: string;
    
    // Instance: Full namespace path (assigned by Flow)
    namespace: string;
    
    // Backpack instance (shared across flow)
    protected backpack: Backpack;
    
    // Access permissions
    abstract readonly permissions?: {
        read?: string[];
        write?: string[];
        deny?: string[];
        namespaceRead?: string[];
        namespaceWrite?: string[];
    };
    
    constructor(config: NodeConfig, context: NodeContext) {
        super(config);
        this.namespace = context.namespace;
        this.backpack = context.backpack;
    }
    
    // Override BaseNode's _run to inject Backpack context
    async _run(input: any): Promise<any> {
        // Automatic namespace injection on pack()
        const originalPack = this.backpack.pack.bind(this.backpack);
        this.backpack.pack = (key: string, value: any, options?: PackOptions) => {
            return originalPack(key, value, {
                ...options,
                nodeId: this.id,
                nodeName: this.constructor.name,
                namespace: this.namespace
            });
        };
        
        return super._run(input);
    }
}

export interface NodeContext {
    namespace: string;
    backpack: Backpack;
    eventStreamer?: EventStreamer;
}
```

### Flow Class (Namespace Composer)

```typescript
export class Flow {
    private namespace: string;
    private backpack: Backpack;
    private nodes: Map<string, BackpackNode> = new Map();
    
    constructor(config: FlowConfig) {
        this.namespace = config.namespace || '';
        this.backpack = new Backpack();
    }
    
    // Compose namespace and instantiate node
    addNode(NodeClass: typeof BackpackNode, config: NodeConfig): BackpackNode {
        const segment = NodeClass.namespaceSegment || config.id;
        const fullNamespace = this.composeNamespace(segment);
        
        const node = new NodeClass(config, {
            namespace: fullNamespace,
            backpack: this.backpack
        });
        
        this.nodes.set(config.id, node);
        return node;
    }
    
    // Namespace composition algorithm
    private composeNamespace(segment: string): string {
        if (!this.namespace) return segment;
        return `${this.namespace}.${segment}`;
    }
    
    // Support for nested flows/subgraphs
    addSubflow(subflowConfig: FlowConfig): Flow {
        const subflowNamespace = this.composeNamespace(subflowConfig.namespace || '');
        return new Flow({
            ...subflowConfig,
            namespace: subflowNamespace,
            backpack: this.backpack  // Share same Backpack
        });
    }
}

// Example: Agent node with internal flow
export class ResearchAgentNode extends BackpackNode {
    static namespaceSegment = "researchAgent";
    
    async exec(input: any) {
        // Create internal flow that inherits parent namespace
        const internalFlow = new Flow({
            namespace: this.namespace,  // ✅ e.g., "sales.researchAgent"
            backpack: this.backpack     // ✅ Share same Backpack
        });
        
        // Add nodes - they'll inherit "sales.researchAgent" as parent
        const chatNode = internalFlow.addNode(ChatNode, { id: "chat" });
        const searchNode = internalFlow.addNode(SearchNode, { id: "search" });
        const summaryNode = internalFlow.addNode(SummaryNode, { id: "summary" });
        
        // Define routing (edges)
        chatNode.on("needs_search", searchNode);
        chatNode.on("direct_answer", summaryNode);
        searchNode.on("default", summaryNode);
        
        return await internalFlow.run(input);
    }
}

/*
Namespace hierarchy:
  sales                           (parent flow)
    └─ sales.researchAgent        (ResearchAgentNode)
         ├─ sales.researchAgent.chat    (internal ChatNode)
         ├─ sales.researchAgent.search  (internal SearchNode)
         └─ sales.researchAgent.summary (internal SummaryNode)

Flow routing:
  chat → [needs_search] → search → [default] → summary
  chat → [direct_answer] → summary
*/
```

### How Flow Routing Works (Next Node Resolution)

**Pattern:** Nodes return an "action" string, Flow uses it to look up the next node.

#### 1. Node Returns Action from post()

```typescript
class ChatNode extends BackpackNode {
    async post(shared: any, prepRes: any, execRes: any): Promise<string | undefined> {
        const intent = execRes.detectedIntent;
        
        if (intent === "search_required") {
            return "needs_search";  // ← Action string
        } else {
            return "direct_answer";  // ← Action string
        }
        
        // Return undefined to end flow
    }
}
```

#### 2. Connect Nodes with .on(action, nextNode)

```typescript
const chatNode = new ChatNode(config, context);
const searchNode = new SearchNode(config, context);
const summaryNode = new SummaryNode(config, context);

// Map actions to next nodes
chatNode.on("needs_search", searchNode);    // If action="needs_search", go to searchNode
chatNode.on("direct_answer", summaryNode);  // If action="direct_answer", go to summaryNode

// "default" is a special action for linear flows
searchNode.next(summaryNode);  // Sugar for: .on("default", summaryNode)
```

#### 3. Flow Orchestrator Resolves Next Node

```typescript
// From PocketFlow (inherited behavior)
class Flow {
    protected async _orchestrate(shared: any): Promise<void> {
        let current: BaseNode | undefined = this.start;
        
        while (current) {
            // 1. Run current node (prep → exec → post)
            const action = await current._run(shared);
            
            // 2. Look up next node based on returned action
            current = current.getNextNode(action);  // ← Checks _successors map
            
            // If no next node found, flow ends
        }
    }
}

// getNextNode() is inherited from PocketFlow's BaseNode:
getNextNode(action: string = "default"): BaseNode | undefined {
    const next = this._successors.get(action);
    if (!next && this._successors.size > 0) {
        console.warn(`Flow ends: '${action}' not found in successors`);
    }
    return next;
}
```

#### 4. Config-Driven Edges (v2.0 - PRD-003)

Instead of imperative `.on()` calls, define edges in JSON:

```typescript
interface FlowConfig {
    namespace: string;
    nodes: NodeConfig[];
    edges: FlowEdge[];  // ← Define routing declaratively
}

interface FlowEdge {
    from: string;      // Source node ID
    to: string;        // Target node ID
    condition: string; // Action string (v2.0) or JSON Logic (v2.1)
}

// Flow.fromConfig() converts edges to .on() calls
class Flow {
    static fromConfig(config: FlowConfig, backpack: Backpack): Flow {
        const flow = new Flow({ namespace: config.namespace, backpack });
        
        // 1. Instantiate all nodes
        const nodeMap = new Map<string, BackpackNode>();
        for (const nodeConfig of config.nodes) {
            const node = flow.addNode(getNodeClass(nodeConfig.type), nodeConfig);
            nodeMap.set(nodeConfig.id, node);
        }
        
        // 2. Build edges
        for (const edge of config.edges) {
            const fromNode = nodeMap.get(edge.from);
            const toNode = nodeMap.get(edge.to);
            fromNode.on(edge.condition, toNode);  // ← Same as imperative!
        }
        
        return flow;
    }
}
```

**Example Config:**

```json
{
    "namespace": "sales",
    "nodes": [
        { "id": "chat", "type": "ChatNode" },
        { "id": "search", "type": "SearchNode" },
        { "id": "summary", "type": "SummaryNode" }
    ],
    "edges": [
        { "from": "chat", "to": "search", "condition": "needs_search" },
        { "from": "chat", "to": "summary", "condition": "direct_answer" },
        { "from": "search", "to": "summary", "condition": "default" }
    ]
}
```

**Key Insight:** Config-driven edges are **syntactic sugar** - they still use the same `.on()` mechanism under the hood!

---

## 3. Data Structures

### Internal Storage

```typescript
class Backpack<T> {
    // Items: Fast key lookup
    private _items: Map<string, BackpackItem> = new Map();
    
    // History: Circular buffer for time-travel
    private _history: BackpackCommit[] = [];
    
    // Access control: Cache for permission checks
    private _accessControl: Map<string, NodePermissions> = new Map();
    
    // Namespace index: Fast namespace queries
    private _namespaceIndex: Map<string, Set<string>> = new Map();
    //                       namespace -> Set of keys
}
```

**Why these structures?**
- `Map` for O(1) key lookup
- Array for history (chronological, supports snapshot)
- Namespace index for fast `getItemsByNamespace('sales.*')`

---

## 4. Key Algorithms

### Algorithm 1: Pattern Matching (Namespace Wildcards)

```typescript
private matchesPattern(pattern: string, namespace: string): boolean {
    // Exact match
    if (pattern === namespace) return true;
    
    // Wildcard: "sales.*" matches "sales.chat", "sales.research"
    if (pattern.includes('*')) {
        const regex = new RegExp(
            '^' + 
            pattern
                .replace(/\./g, '\\.')      // Escape dots
                .replace(/\*/g, '[^.]+')    // * matches one level
            + '$'
        );
        return regex.test(namespace);
    }
    
    return false;
}
```

**Test Cases:**
- `matchesPattern('sales.*', 'sales.chat')` → `true`
- `matchesPattern('sales.*', 'sales.research.web')` → `false` (only one level)
- `matchesPattern('*.chat', 'sales.chat')` → `true`

---

### Algorithm 2: Access Control Check

```typescript
private checkAccess(
    key: string, 
    nodeId: string, 
    operation: 'read' | 'write'
): boolean {
    const permissions = this._accessControl.get(nodeId);
    if (!permissions) {
        // Default: allow all (opt-in access control)
        return true;
    }
    
    const item = this._items.get(key);
    if (!item) return true;  // Can't deny access to non-existent item
    
    // Check key-based permissions
    const allowedKeys = operation === 'read' 
        ? permissions.read 
        : permissions.write;
    
    if (allowedKeys?.includes(key)) return true;
    
    // Check namespace-based permissions
    const allowedNamespaces = operation === 'read'
        ? permissions.namespaceRead
        : permissions.namespaceWrite;
    
    if (allowedNamespaces && item.metadata.sourceNamespace) {
        for (const pattern of allowedNamespaces) {
            if (this.matchesPattern(pattern, item.metadata.sourceNamespace)) {
                return true;
            }
        }
    }
    
    // Check deny list
    if (permissions.deny?.includes(key)) return false;
    
    // Default: deny if explicit permissions are set
    return false;
}
```

---

### Algorithm 3: Time-Travel (Snapshot) - Implementation Strategy

**The Challenge:** How to reconstruct past states without storing full values in every commit?

**Solution:** Store `previousValue` in commits, with intelligent size limits.

```typescript
interface BackpackCommit {
    commitId: string;
    timestamp: number;
    nodeId: string;
    action: 'pack' | 'unpack';
    key: string;
    valueSummary: string;        // ⚠️ Always truncated (for display)
    previousValue?: any;         // ✅ Full value (for snapshots)
    newValue?: any;              // ✅ Full value (for snapshots)
    valueSize?: number;          // Track memory usage
    metadata: BackpackItemMetadata;
}
```

**Storage Strategy:**

```typescript
// Configuration
private readonly MAX_VALUE_SIZE = 100 * 1024;           // 100KB per value
private readonly MAX_HISTORY_SIZE = 50 * 1024 * 1024;   // 50MB total history
private currentHistorySize = 0;

pack(key: string, value: any, options: PackOptions) {
    const previousItem = this._items.get(key);
    const valueSize = this.estimateSize(value);
    
    // 1. Always store in current state
    this._items.set(key, { key, value, metadata: {...} });
    
    // 2. Decide what to store in history
    let previousValue = undefined;
    let newValue = undefined;
    let storedSize = 0;
    
    if (valueSize < this.MAX_VALUE_SIZE) {
        // ✅ Small value: Store full value in history (enables snapshots)
        previousValue = previousItem?.value;
        newValue = value;
        storedSize = valueSize * 2;  // Store both previous and new
    } else {
        // ⚠️ Large value: Store reference only
        previousValue = previousItem ? { 
            _type: 'large-value-ref',
            key,
            size: this.estimateSize(previousItem.value),
            message: 'Value too large for snapshot (> 100KB)'
        } : undefined;
        
        newValue = { 
            _type: 'large-value-ref',
            key,
            size: valueSize,
            message: 'Value too large for snapshot (> 100KB)'
        };
        
        storedSize = 200;  // Just the reference metadata
    }
    
    // 3. Add to history
    const commit = {
        commitId: generateUUID(),
        action: 'pack',
        key,
        valueSummary: this.truncate(value, 200),
        previousValue,
        newValue,
        valueSize: storedSize,
        metadata: {...}
    };
    
    this._history.push(commit);
    this.currentHistorySize += storedSize;
    
    // 4. Check global memory budget
    if (this.currentHistorySize > this.MAX_HISTORY_SIZE) {
        this.pruneOldCommits();  // ✅ Remove oldest commits
    }
}

private pruneOldCommits() {
    // Simple strategy: Remove oldest 20% of commits
    const targetSize = this.MAX_HISTORY_SIZE * 0.8;
    
    while (this.currentHistorySize > targetSize && this._history.length > 100) {
        const removed = this._history.shift();  // Remove oldest
        this.currentHistorySize -= removed.valueSize;
    }
    
    console.warn(`Pruned old commits. History size: ${this.currentHistorySize} bytes`);
}

private estimateSize(obj: any): number {
    try {
        return JSON.stringify(obj).length;
    } catch (e) {
        return 1000;  // Estimate for circular refs
    }
}
```

**Snapshot Reconstruction:**

### Algorithm 3: Time-Travel (Snapshot)

```typescript
// Base method: Snapshot at timestamp
getSnapshot(timestamp: number): Backpack<T> {
    const relevantCommits = this._history.filter(
        c => c.timestamp <= timestamp
    );
    return this.replayCommits(relevantCommits);
}

// How replay works (the Git checkout equivalent)
private replayCommits(commits: BackpackCommit[]): Backpack<T> {
    const snapshot = new Backpack<T>();
    
    // Replay commits in chronological order
    for (const commit of commits) {
        if (commit.action === 'pack') {
            // ✅ Restore from stored value
            if (commit.newValue && !commit.newValue._ref) {
                snapshot._items.set(commit.key, {
                    key: commit.key,
                    value: commit.newValue,  // ✅ Full value from commit
                    metadata: commit.metadata
                });
            } else {
                // ⚠️ Large value wasn't stored
                // Options:
                // 1. Throw error (can't reconstruct)
                // 2. Use current value (approximation)
                // 3. Mark as unavailable
                
                snapshot._items.set(commit.key, {
                    key: commit.key,
                    value: { _unavailable: true, reason: 'Value too large for snapshot' },
                    metadata: commit.metadata
                });
            }
        } else if (commit.action === 'delete') {
            snapshot._items.delete(commit.key);
        }
        // 'unpack' is read-only, no state change
    }
    
    return snapshot;
}

// Better UX: Snapshot at specific commit
getSnapshotAtCommit(commitId: string): Backpack<T> {
    const commitIndex = this._history.findIndex(c => c.commitId === commitId);
    if (commitIndex === -1) {
        throw new BackpackError(`Commit ${commitId} not found`);
    }
    
    const relevantCommits = this._history.slice(0, commitIndex + 1);
    return this.replayCommits(relevantCommits);
}

// Best UX: Snapshot before a node ran
getSnapshotBeforeNode(nodeId: string): Backpack<T> {
    // Find first commit by this node
    const firstCommitIndex = this._history.findIndex(c => c.nodeId === nodeId);
    if (firstCommitIndex === -1) {
        throw new BackpackError(`No commits found for node ${nodeId}`);
    }
    
    // Get all commits BEFORE this node
    const relevantCommits = this._history.slice(0, firstCommitIndex);
    return this.replayCommits(relevantCommits);
}

// Helper: Replay commits to create snapshot
private replayCommits(commits: BackpackCommit[]): Backpack<T> {
    const snapshot = new Backpack<T>();
    
    for (const commit of commits) {
        if (commit.action === 'pack') {
            snapshot._items.set(commit.key, {
                key: commit.key,
                value: commit.previousValue || commit.valueSummary,  // Use stored value
                metadata: commit.metadata
            });
        } else if (commit.action === 'delete') {
            snapshot._items.delete(commit.key);
        }
        // 'unpack' is read-only, no state change
    }
    
    return snapshot;
}
```

**Optimization:** For frequent snapshots, maintain checkpoints every N commits.

---

### Algorithm 4: Diff (State Comparison)

```typescript
interface BackpackDiff {
    added: string[];      // Keys that didn't exist before
    modified: string[];   // Keys that changed values
    deleted: string[];    // Keys that were removed
    details: Record<string, {
        before: any;
        after: any;
        changedBy: string;  // nodeId that made the change
    }>;
}

diff(snapshot1: Backpack<T>, snapshot2: Backpack<T>): BackpackDiff {
    const diff: BackpackDiff = {
        added: [],
        modified: [],
        deleted: [],
        details: {}
    };
    
    const keys1 = new Set(snapshot1._items.keys());
    const keys2 = new Set(snapshot2._items.keys());
    
    // Find added keys
    for (const key of keys2) {
        if (!keys1.has(key)) {
            diff.added.push(key);
            diff.details[key] = {
                before: undefined,
                after: snapshot2._items.get(key)?.value,
                changedBy: snapshot2._items.get(key)?.metadata.sourceNodeId || 'unknown'
            };
        }
    }
    
    // Find deleted keys
    for (const key of keys1) {
        if (!keys2.has(key)) {
            diff.deleted.push(key);
            diff.details[key] = {
                before: snapshot1._items.get(key)?.value,
                after: undefined,
                changedBy: 'deleted'
            };
        }
    }
    
    // Find modified keys
    for (const key of keys1) {
        if (keys2.has(key)) {
            const val1 = snapshot1._items.get(key)?.value;
            const val2 = snapshot2._items.get(key)?.value;
            
            if (JSON.stringify(val1) !== JSON.stringify(val2)) {
                diff.modified.push(key);
                diff.details[key] = {
                    before: val1,
                    after: val2,
                    changedBy: snapshot2._items.get(key)?.metadata.sourceNodeId || 'unknown'
                };
            }
        }
    }
    
    return diff;
}
```

**Use Case:**
```typescript
const before = backpack.getSnapshotBeforeNode('research-2');
const after = backpack.getSnapshot(Date.now());
const changes = backpack.diff(before, after);

console.log(`research-2 made ${changes.modified.length} changes`);
console.log(`Details:`, changes.details);
```

---

## 5. API Implementation Details

### 5.1 Core API

```typescript
class Backpack<T extends BaseStorage = BaseStorage> {
    
    // Pack: Add/update data
    pack(key: string, value: any, options?: PackOptions): void {
        const item: BackpackItem = {
            key,
            value,
            metadata: {
                sourceNodeId: options?.nodeId || 'unknown',
                sourceNodeName: options?.nodeName || 'unknown',
                sourceNamespace: options?.namespace,
                timestamp: Date.now(),
                version: this.getVersion(key) + 1,
                tags: options?.tags || []
            }
        };
        
        // Store item
        const previousValue = this._items.get(key);
        this._items.set(key, item);
        
        // Update namespace index
        if (item.metadata.sourceNamespace) {
            this.updateNamespaceIndex(key, item.metadata.sourceNamespace);
        }
        
        // Record commit
        this.addToHistory({
            commitId: generateUUID(),
            timestamp: Date.now(),
            nodeId: item.metadata.sourceNodeId,
            action: 'pack',
            key,
            valueSummary: this.summarizeValue(value),
            previousValue
        });
        
        // Emit event (if EventStreamer attached)
        this.emitEvent('BACKPACK_PACK', { key, metadata: item.metadata });
    }
    
    // Unpack: Read data (graceful)
    unpack<V>(key: string, nodeId: string): V | undefined {
        // Check access
        if (!this.checkAccess(key, nodeId, 'read')) {
            if (this.options.strictMode) {
                throw new AccessDeniedError(`Node ${nodeId} cannot read key '${key}'`);
            }
            console.warn(`Access denied: Node ${nodeId} cannot read '${key}'`);
            return undefined;
        }
        
        const item = this._items.get(key);
        
        // Record access
        this.addToHistory({
            commitId: generateUUID(),
            timestamp: Date.now(),
            nodeId,
            action: 'unpack',
            key,
            valueSummary: item ? '[accessed]' : '[not found]'
        });
        
        return item?.value as V | undefined;
    }
    
    // UnpackRequired: Read data (fail-fast)
    unpackRequired<V>(key: string, nodeId: string): V {
        const value = this.unpack<V>(key, nodeId);
        if (value === undefined) {
            throw new BackpackError(`Required key '${key}' not found in Backpack`);
        }
        return value;
    }
}
```

---

### 5.2 Namespace-Aware API

```typescript
class Backpack<T> {
    
    // Get all items from matching namespaces
    unpackByNamespace(pattern: string): Record<string, any> {
        const result: Record<string, any> = {};
        
        for (const [key, item] of this._items) {
            if (item.metadata.sourceNamespace && 
                this.matchesPattern(pattern, item.metadata.sourceNamespace)) {
                result[key] = item.value;
            }
        }
        
        return result;
    }
    
    // Get items with full metadata
    getItemsByNamespace(pattern: string): BackpackItem[] {
        const items: BackpackItem[] = [];
        
        for (const [key, item] of this._items) {
            if (item.metadata.sourceNamespace && 
                this.matchesPattern(pattern, item.metadata.sourceNamespace)) {
                items.push(item);
            }
        }
        
        return items;
    }
}
```

---

## 6. Integration Points

### 6.1 With EventStreamer (PRD-002)

```typescript
class Backpack<T> {
    private eventStreamer?: EventStreamer;
    
    constructor(initialData?: T, options?: BackpackOptions) {
        this.eventStreamer = options?.eventStreamer;
    }
    
    private emitEvent(type: string, payload: any): void {
        if (!this.eventStreamer) return;
        
        this.eventStreamer.emit({
            id: generateUUID(),
            timestamp: Date.now(),
            sourceNode: 'Backpack',
            nodeId: 'backpack-instance',
            type: `BACKPACK_${type}` as StreamEventType,
            payload
        });
    }
}
```

---

### 6.2 With Serialization (PRD-003)

```typescript
class Backpack<T> {
    
    // Serialize to JSON
    toJSON(): BackpackSnapshot {
        return {
            items: Array.from(this._items.entries()),
            history: this._history.slice(-1000),  // Last 1000 commits
            permissions: Object.fromEntries(this._accessControl)
        };
    }
    
    // Deserialize from JSON
    static fromJSON<T>(snapshot: BackpackSnapshot): Backpack<T> {
        const backpack = new Backpack<T>();
        backpack._items = new Map(snapshot.items);
        backpack._history = snapshot.history;
        backpack._accessControl = new Map(Object.entries(snapshot.permissions));
        return backpack;
    }
}
```

---

## 7. Error Handling

### Custom Errors

```typescript
export class BackpackError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BackpackError';
    }
}

export class AccessDeniedError extends BackpackError {
    constructor(message: string) {
        super(message);
        this.name = 'AccessDeniedError';
    }
}
```

---

## 8. Testing Strategy

### Unit Tests (80% coverage target)

```typescript
// tests/storage/backpack.test.ts

describe('Backpack', () => {
    describe('pack/unpack', () => {
        it('should store and retrieve data');
        it('should return undefined for missing keys');
        it('should throw on unpackRequired for missing keys');
        it('should track version numbers');
    });
    
    describe('Access Control', () => {
        it('should allow access with correct permissions');
        it('should deny access without permissions');
        it('should support namespace wildcards');
    });
    
    describe('History', () => {
        it('should record all pack/unpack operations');
        it('should limit history to maxHistorySize');
        it('should support time-travel via getSnapshot');
    });
    
    describe('Namespace Queries', () => {
        it('should match exact namespaces');
        it('should match wildcard patterns');
        it('should handle edge cases (no namespace, invalid pattern)');
    });
});
```

---

## 9. Implementation Phases

### Phase 1: Core Storage (Days 1-3)
- [ ] `Backpack` class skeleton
- [ ] `pack()`, `unpack()`, `unpackRequired()` methods
- [ ] `BackpackItem` and metadata tracking
- [ ] Basic unit tests

### Phase 2: History & Time-Travel (Days 4-6)
- [ ] `BackpackCommit` structure
- [ ] History tracking in `pack()`/`unpack()`
- [ ] `getHistory()` method
- [ ] `getSnapshot(timestamp)` implementation
- [ ] Time-travel tests

### Phase 3: Access Control (Days 7-10)
- [ ] `AccessControl` types
- [ ] `checkAccess()` method
- [ ] Key-based permissions
- [ ] Namespace-based permissions with wildcards
- [ ] Access control tests

### Phase 4: Namespace API (Days 11-13)
- [ ] Namespace index
- [ ] `unpackByNamespace()` method
- [ ] `getItemsByNamespace()` method
- [ ] Pattern matching algorithm
- [ ] Namespace query tests

### Phase 5: Graph-Assigned Namespaces (Days 14-16)
- [ ] `BackpackNode` base class with `namespaceSegment` static property
- [ ] `Flow` class with namespace composition logic
- [ ] `composeNamespace()` algorithm implementation
- [ ] `NodeContext` interface for passing namespace + backpack
- [ ] Support for nested flows/subgraphs
- [ ] Config-driven namespace composition tests
- [ ] Node reusability tests (same class, different contexts)

### Phase 6: Integration & Polish (Days 17-20)
- [ ] EventStreamer integration hooks
- [ ] Serialization (`toJSON`/`fromJSON`)
- [ ] Performance optimization
- [ ] Documentation
- [ ] Integration tests with real multi-agent scenarios
- [ ] Code review & refinement

---

## 10. Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| `pack()` | < 1ms | Includes history commit |
| `unpack()` | < 0.5ms | Map lookup + access check |
| `unpackByNamespace()` | < 5ms | For 100 items |
| `getSnapshot()` | < 50ms | For 1000 commits |
| Memory | < 10MB | For 10k commits |

---

## 11. Open Implementation Questions

**Q1:** Should namespace index be updated lazily or eagerly?  
**Proposal:** Eagerly on `pack()` to keep queries fast.

**Q2:** How to handle circular references in `pack()`?  
**Proposal:** Use `JSON.stringify` for `valueSummary` - it will throw on circular refs, which is acceptable.

**Q3:** Should we support `unpack()` with no `nodeId` (bypass access control)?  
**Decision:** Yes, but not for backwards compat - for developer convenience. `nodeId` is optional; if omitted, skip access check (useful for debugging/testing).

---

## 12. Code Location

```
src/
├── storage/
│   ├── backpack.ts              # Main Backpack class
│   ├── types.ts                 # BackpackItem, BackpackCommit, etc.
│   ├── access-control.ts        # AccessControl logic
│   ├── pattern-matcher.ts       # Namespace wildcard matching
│   └── errors.ts                # Custom error classes
│
├── nodes/
│   └── backpack-node.ts         # BackpackNode base class (extends BaseNode)
│
└── flows/
    └── flow.ts                   # Flow class (namespace composer)

tests/
├── storage/
│   ├── backpack.test.ts
│   ├── access-control.test.ts
│   ├── time-travel.test.ts
│   └── namespace-queries.test.ts
│
├── nodes/
│   └── backpack-node.test.ts
│
└── flows/
    └── flow.test.ts              # Namespace composition tests
```

---

**Ready to implement:** ✅  
**Estimated LOC:** ~800 lines of implementation + 600 lines of tests
  - Backpack core: ~500 LOC
  - BackpackNode: ~100 LOC
  - Flow (namespace composer): ~200 LOC
  - Tests: ~600 LOC

