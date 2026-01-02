# PRD-007: Node Metadata & Discovery System

**Status**: ✅ COMPLETE  
**Version**: v2.1  
**Date**: December 30, 2025  
**Owner**: BackpackFlow Core Team

---

## Executive Summary

Implement an auto-generation system for node metadata that eliminates ~83% of boilerplate code while enabling:
- Studio UI to auto-generate node palettes and property forms
- AI agents to discover and compose nodes programmatically
- Documentation to auto-generate from metadata

**Key Innovation**: Define once (Zod schema), use everywhere (UI, AI, docs).

---

## Problem Statement

### Current Pain Points (v2.0)

1. **Code Duplication**: Each node requires 30+ lines of manual metadata
2. **Inconsistency**: No standards for naming, colors, or icons
3. **No Discovery**: AI agents cannot find/understand nodes
4. **Manual UI**: Studio must hand-code property forms
5. **Poor DX**: Developers repeat themselves constantly

### Example (v2.0)
```typescript
// Manual config interface: 13 lines
export interface MyNodeConfig extends NodeConfig {
    apiKey: string;
    maxResults?: number;
    timeout?: number;
}

// Manual UI properties: 15+ lines
const properties = [
    { name: 'apiKey', type: 'string', required: true, ... },
    { name: 'maxResults', type: 'number', default: 50, ... },
    ...
];

// Total: 30+ lines of boilerplate per node!
```

---

## Goals

### Primary Goals
1. **Reduce Boilerplate**: 83% reduction in repetitive code
2. **Enable AI Discovery**: AI agents can find/compose nodes
3. **Auto-Generate UI**: Studio generates forms from metadata
4. **Ensure Consistency**: Convention-based naming/styling

### Secondary Goals
1. Runtime config validation
2. Improved developer experience
3. Documentation auto-generation foundation
4. Community contribution friendliness

---

## Solution Architecture

### Three Components

1. **Zod-to-Properties Converter**
   - Converts Zod schemas → UI properties
   - Extracts types, constraints, defaults, descriptions
   
2. **Metadata Generator**
   - Class name → Display name, category, icon
   - Convention-based inference
   
3. **NodeRegistry**
   - Central catalog of all nodes
   - Search, filter, discovery APIs

### Data Flow

```
Node Definition (Zod schemas)
    ↓
Metadata Generator
    ↓
NodeRegistry
    ↓
Consumers (Studio, AI, Docs)
```

---

## Requirements

### FR-1: Auto-Generation from Zod

**Priority**: P0 (Blocker)

Node authors define a single Zod schema:
```typescript
static config = z.object({
    apiKey: z.string().describe('Your API key'),
    maxResults: z.number().min(1).max(100).default(50)
});
```

System auto-generates:
- UI property definitions
- Type validation
- Default values
- Min/max constraints
- Descriptions

### FR-2: Convention-Based Inference

**Priority**: P0 (Blocker)

From class name, infer:
- Display name (YouTubeSearchNode → "YouTube Search")
- Category (keywords: API/Search → "api-client")
- Icon (YouTube → 🎥, API → 🔌)
- Color (api-client → Blue #2196F3)
- Tags (for search/filtering)

### FR-3: NodeRegistry API

**Priority**: P0 (Blocker)

Provide APIs for:
```typescript
// Registration
NodeRegistry.register('NodeType', NodeClass);

// Discovery
NodeRegistry.list({ category: 'api-client' });
NodeRegistry.search('youtube');
NodeRegistry.listByCategory();

// Metadata
const metadata = NodeClass.getMetadata();
```

### FR-4: Three-Schema Pattern

**Priority**: P0 (Blocker)

Every node defines:
1. `config` - Configuration schema (auto-generates UI)
2. `inputs` - Input validation contract
3. `outputs` - Output documentation contract

### FR-5: Backward Compatibility

**Priority**: P1 (Important)

- v2.0 nodes continue to work
- No breaking changes to existing APIs
- Migration path provided

---

## Technical Specification

### File Structure

```
src/
├── types/
│   └── node-metadata.ts       # Type definitions
├── utils/
│   ├── zod-to-properties.ts   # Zod → UI converter
│   └── node-metadata-generator.ts  # Auto-generation
├── nodes/
│   ├── backpack-node.ts       # Base class (updated)
│   └── registry.ts            # Central catalog
```

### Key Interfaces

```typescript
// Node metadata
interface NodeDescription {
    displayName: string;
    name: string;
    icon: string;
    category: string;
    description: string;
    properties?: NodeProperty[];
    tags?: string[];
}

// UI property
interface NodeProperty {
    displayName: string;
    name: string;
    type: 'string' | 'number' | 'boolean' | 'options' | 'json';
    required?: boolean;
    default?: any;
    description?: string;
    options?: Array<{name: string; value: any}>;
    typeOptions?: {minValue?: number; maxValue?: number};
}
```

---

## User Stories

### US-1: Node Author
**As a** node author  
**I want to** define my node config once  
**So that** UI, validation, and docs auto-generate

### US-2: Studio Developer
**As a** Studio developer  
**I want to** get all nodes by category  
**So that** I can render a categorized node palette

### US-3: AI Agent
**As an** AI agent  
**I want to** search for nodes by functionality  
**So that** I can compose flows programmatically

---

## Implementation Plan

### Phase 1: Core System ✅
- [x] Create type definitions
- [x] Build zod-to-properties converter
- [x] Build metadata generator
- [x] Create NodeRegistry

### Phase 2: Base Class Integration ✅
- [x] Update BackpackNode with getMetadata()
- [x] Add config schema support
- [x] Add auto-validation
- [x] Update exports

### Phase 3: Example Implementation ✅
- [x] Refactor YouTubeSearchNode
- [x] Refactor DataAnalysisNode
- [x] Refactor BaseChatCompletionNode
- [x] Create registration utility

### Phase 4: Testing & Documentation ✅
- [x] Write comprehensive tests
- [x] Validate all auto-generation
- [x] Write implementation guide
- [x] Write migration guide

---

## Success Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Code Reduction | >70% | ~83% ✅ |
| Metadata Coverage | 100% | 100% ✅ |
| Test Coverage | >90% | 100% ✅ |
| Zero Linter Errors | Yes | Yes ✅ |
| Build Success | Yes | Yes ✅ |

---

## Testing Strategy

### Unit Tests
- Zod-to-properties conversion
- Name generation logic
- Category/icon inference

### Integration Tests
- Full metadata generation
- NodeRegistry operations
- Search functionality

### Manual Validation
- Visual inspection of generated metadata
- Test with real nodes
- Verify Studio compatibility

---

## Documentation

### Required Documentation ✅
- [x] Implementation summary
- [x] Migration guide
- [x] Naming conventions reference
- [x] Strategic vision document
- [x] This PRD

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Breaking changes | High | Maintain v2.0 compatibility |
| Inconsistent conventions | Medium | Clear documentation |
| Performance overhead | Low | Metadata cached after generation |
| Adoption friction | Medium | Clear migration path + examples |

---

## Future Enhancements

### Post-v2.1
- Custom icon/color overrides
- Multi-language display names
- Visual node editor integration
- Community node marketplace
- Auto-generated documentation site

---

## Related Documents

- [NODE-METADATA-IMPLEMENTATION-SUMMARY.md](../NODE-METADATA-IMPLEMENTATION-SUMMARY.md)
- [node-restructuring-guide.md](../node-restructuring-guide.md)
- [ai-first-architecture.md](../ai-first-architecture.md)
- [node-conventions.md](../node-conventions.md)

---

## Approval

**Approved by**: BackpackFlow Core Team  
**Date**: December 30, 2025  
**Status**: Implemented & Deployed

