# v2.0 Documentation

**Status:** 🚧 **In Development**  
**Target Release:** December 21, 2025 (Q4 2025)

This directory contains all documentation for BackpackFlow v2.0.

---

## 📂 Directory Structure

```
v2.0/
├── prds/           # Product Requirements Documents (What & Why)
├── specs/          # Technical Specifications (How to Build)
├── guides/         # Implementation Guides & Deep Dives
└── migration/      # Upgrade guides from v1.x
```

---

## 🚀 Quick Start

**New to v2.0?** Start here:

1. **[DECISIONS-AUDIT-v2.0.md](./specs/DECISIONS-AUDIT-v2.0.md)** - Pre-implementation checklist
2. **[PRD-001: Backpack Architecture](./prds/PRD-001-backpack-architecture.md)** - Core state management
3. **[Git Analogy Guide](./guides/git-analogy.md)** - Understand the mental model
4. **[TECH-SPEC-001](./specs/TECH-SPEC-001-backpack-implementation.md)** - Start building

---

## 📋 PRDs (What & Why)

| Document | Status | Priority | Description |
|----------|--------|----------|-------------|
| [PRD-001: Backpack Architecture](./prds/PRD-001-backpack-architecture.md) | Draft | P0 | Core state management with Git-like history |
| [PRD-002: Telemetry System](./prds/PRD-002-telemetry-system.md) | Draft | P0 | Automatic event emission for observability |
| [PRD-003: Serialization Bridge](./prds/PRD-003-serialization-bridge.md) | Draft | P1 | Config-driven node instantiation |

---

## 🔧 Technical Specs (How to Build)

| Document | Purpose |
|----------|---------|
| [DECISIONS-AUDIT-v2.0.md](./specs/DECISIONS-AUDIT-v2.0.md) | **START HERE** - Complete decision checklist |
| [TECH-SPEC-001](./specs/TECH-SPEC-001-backpack-implementation.md) | Backpack implementation guide |

---

## 📚 Guides & Deep Dives

### Conceptual Understanding
- **[git-analogy.md](./guides/git-analogy.md)** - Why "Git for agent state"
- **[backpack-flow-example.md](./guides/backpack-flow-example.md)** - Complete 3-node walkthrough

### Implementation Details
- **[debugging-workflow.md](./guides/debugging-workflow.md)** - Time-travel debugging in practice
- **[snapshot-reconstruction.md](./guides/snapshot-reconstruction.md)** - How `getSnapshot()` works
- **[memory-management.md](./guides/memory-management.md)** - Size limits & disk offload

### Legacy
- **[streaming-architecture-diagram.md](./guides/streaming-architecture-diagram.md)** - Event streaming visuals

---

## 🔄 Migration from v1.x

| Document | Purpose |
|----------|---------|
| [MIGRATION-v1-to-v2.md](./migration/MIGRATION-v1-to-v2.md) | Step-by-step upgrade guide |
| [BREAKING-CHANGES.md](./migration/BREAKING-CHANGES.md) | Complete list of breaking changes |

---

## 🎯 Key Architectural Decisions

- **AD-001:** Graph-Assigned Namespaces (nodes define segments, flows compose paths)
- **AD-002:** Hybrid Error Handling (`unpack()` vs `unpackRequired()`)
- **AD-003:** Event Emission Strategy (sync with async handlers)
- **AD-004:** Edge Conditions (strings in v2.0, JSON Logic in v2.1)

**Full details:** See [DECISIONS-AUDIT-v2.0.md](./specs/DECISIONS-AUDIT-v2.0.md)

---

## 🛠️ Implementation Phases

1. **Phase 1:** Core Backpack (Storage, History, Access Control)
2. **Phase 2:** BackpackNode & Flow Integration
3. **Phase 3:** Telemetry System
4. **Phase 4:** Serialization Bridge
5. **Phase 5:** Testing & Release

**Full roadmap:** See [../../ROADMAP.md](../../ROADMAP.md)

---

**Last Updated:** December 18, 2025

