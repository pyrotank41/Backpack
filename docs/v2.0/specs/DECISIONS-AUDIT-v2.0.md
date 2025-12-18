# Decisions Audit - v2.0 Pre-Implementation Checklist

**Version:** 2.0.0  
**Date:** December 18, 2025  
**Target Release:** December 21, 2025 (Q4 2025)  
**Purpose:** Ensure all v2.0 design decisions from planning discussions are documented before implementation begins.

This document serves as a **snapshot** of architectural decisions made for the v2.0 release. Future major versions (v3.0+) will have their own decision audits.

---

## ✅ Documented Decisions

### Core Architecture

| Decision | Status | Location |
|----------|--------|----------|
| **Graph-Assigned Namespaces** | ✅ Documented | PRD-001 §3.2.1, TECH-SPEC-001 §Decision 5, ROADMAP AD-001 |
| Pattern: Nodes define segments, Flows compose paths | ✅ | TECH-SPEC-001 §2 |
| Namespace composition: `${parent}.${segment}` | ✅ | PRD-001 §3.2.1, TECH-SPEC-001 |
| Nested flows inherit parent namespace | ✅ | PRD-001 §3.2.1, TECH-SPEC-001 §2 |
| **Flow Routing Mechanism** | ✅ Documented | TECH-SPEC-001 §"How Flow Routing Works" |
| Nodes return action strings from `post()` | ✅ | TECH-SPEC-001 |
| `.on(action, nextNode)` maps actions to successors | ✅ | TECH-SPEC-001 |
| `getNextNode(action)` resolves next node | ✅ | TECH-SPEC-001 |
| Config-driven edges compile to `.on()` calls | ✅ | TECH-SPEC-001, PRD-003 |
| **Error Handling** | ✅ Documented | PRD-001 §7.Q1, TECH-SPEC-001 §Decision 1 |
| Hybrid: `unpack()` returns undefined, `unpackRequired()` throws | ✅ | PRD-001, TECH-SPEC-001 |
| **State Sanitization** | ✅ Documented | PRD-001 §3.5 |
| `quarantine()` for pollution, NOT hiding errors from LLM | ✅ | PRD-001 §3.5 |
| Decision matrix: when to quarantine vs pack | ✅ | PRD-001 §3.5 |

### Observability & History

| Decision | Status | Location |
|----------|--------|----------|
| **Commit History Size** | ✅ Documented | TECH-SPEC-001 §Decision 2 |
| Circular buffer with 10,000 commits default | ✅ | TECH-SPEC-001 |
| Configurable via constructor | ✅ | TECH-SPEC-001 |
| **Time-Travel Debugging** | ✅ Documented | PRD-001 §3.3, docs/architecture/debugging-workflow.md |
| `getSnapshotAtCommit(commitId)` | ✅ | PRD-001 §3.3 |
| `getSnapshotBeforeNode(nodeId)` | ✅ | PRD-001 §3.3 |
| `diff(snapshot1, snapshot2)` | ✅ | PRD-001 §3.3 |
| `replayFromCommit(commitId)` | ✅ | PRD-001 §3.3 |
| **Snapshot Reconstruction** | ✅ Documented | docs/architecture/snapshot-reconstruction.md |
| Store `newValue` and `previousValue` in commits | ✅ | snapshot-reconstruction.md |
| Rebuild past state by replaying commits | ✅ | snapshot-reconstruction.md |
| **Memory Management** | ✅ Documented | docs/architecture/memory-management.md |
| Hybrid: Full values + size limits | ✅ | memory-management.md, TECH-SPEC-001 |
| Per-value limit: 100KB default | ✅ | memory-management.md |
| Global budget: 50MB default | ✅ | memory-management.md |
| Offload to disk when budget exceeded | ✅ | memory-management.md |
| **No Rollback in v2.0** | ✅ Documented | TECH-SPEC-001 §Decision 3 |
| Breaks immutability guarantees | ✅ | TECH-SPEC-001 |

### Access Control & Namespaces

| Decision | Status | Location |
|----------|--------|----------|
| **Namespace Wildcards** | ✅ Documented | TECH-SPEC-001 §Decision 4 |
| Support glob patterns: `sales.*` | ✅ | TECH-SPEC-001, PRD-001 |
| Single-level matching in v2.0 | ✅ | ROADMAP AD-001 |
| Deep matching (`**`) in v2.1 | ✅ | ROADMAP AD-001 |
| **Access Control** | ✅ Documented | PRD-001 §3.4 |
| Opt-in for v2.0 (default = no restrictions) | ✅ | ROADMAP §Open Questions Q3 |
| Mandatory in v3.0 | ✅ | ROADMAP §Open Questions Q3 |
| Key-based permissions | ✅ | PRD-001 §3.4 |
| Namespace-based permissions | ✅ | PRD-001 §3.4 |

### Events & Telemetry

| Decision | Status | Location |
|----------|--------|----------|
| **Event Emission Strategy** | ✅ Documented | PRD-002, ROADMAP AD-003 |
| Synchronous emission for in-memory handlers | ✅ | PRD-002, ROADMAP AD-003 |
| Async (fire-and-forget) for network handlers | ✅ | PRD-002, ROADMAP AD-003 |
| **EventStreamer Implementation** | ✅ Documented | PRD-002, ROADMAP AD-003 |
| Thin wrapper around Node.js EventEmitter | ✅ | PRD-002, ROADMAP AD-003 |
| Add: Type safety, wildcard matching, event history | ✅ | PRD-002 |

### Config & Serialization

| Decision | Status | Location |
|----------|--------|----------|
| **Config Versioning** | ✅ Documented | PRD-003 §4.3.Q1 |
| Start with `version: "2.0.0"` from day 1 | ✅ | PRD-003 |
| No v1 config exists (clean start) | ✅ | PRD-003 |
| **Edge Conditions** | ✅ Documented | PRD-003 §4.3.Q4, ROADMAP AD-004 |
| v2.0: String-based conditions | ✅ | PRD-003, ROADMAP AD-004 |
| v2.1: JSON Logic for complex routing | ✅ | PRD-003, ROADMAP AD-004 |
| **No Backwards Compatibility in v2.0** | ✅ Documented | ROADMAP §Open Questions Q1 |
| Clean break, force migration | ✅ | ROADMAP, docs/architecture/V2-BREAKING-CHANGES.md |

### Git Analogy

| Decision | Status | Location |
|----------|--------|----------|
| **Backpack as "Git for agent state"** | ✅ Documented | docs/architecture/git-analogy.md, README.md |
| `pack()` = `git commit` | ✅ | git-analogy.md, README.md |
| `getHistory()` = `git log` | ✅ | git-analogy.md, README.md |
| `getSnapshot()` = `git checkout` | ✅ | git-analogy.md, README.md |
| `diff()` = `git diff` | ✅ | git-analogy.md, README.md |

---

## 📋 Open Questions (Still Being Considered)

| Question | Status | Notes |
|----------|--------|-------|
| **Q2 (ROADMAP):** Handle PocketFlow upstream changes? | 🤔 Proposal | Pin to specific version, document upgrade path |
| **Q2 (PRD-001):** Circular references in `pack()`? | 🤔 Proposal | Let `JSON.stringify` throw (acceptable) |
| **Q3 (PRD-001):** `unpack()` without nodeId bypass? | 🤔 Proposal | Allow for debugging/testing convenience |

**Note:** These are minor implementation details that can be decided during Phase 1 development.

---

## 🎯 Implementation Readiness

### Core Backpack (PRD-001)
- ✅ All major design decisions documented
- ✅ Class structure defined (TECH-SPEC-001 §2)
- ✅ Algorithms specified (TECH-SPEC-001 §4)
- ✅ Data structures defined (TECH-SPEC-001 §3)
- ✅ Implementation phases outlined (TECH-SPEC-001 §8)
- ✅ Test strategy defined (TECH-SPEC-001 §7)

### Telemetry System (PRD-002)
- ✅ Event schema defined
- ✅ Emission strategy decided
- ✅ EventStreamer approach clarified

### Serialization Bridge (PRD-003)
- ✅ Config schema defined
- ✅ FlowLoader pattern specified
- ✅ Edge conditions approach decided

---

## 🚀 Ready to Implement

**Status:** ✅ **ALL CRITICAL DECISIONS DOCUMENTED**

**Next Steps:**
1. Start with Phase 1: Core Backpack implementation
2. Follow TECH-SPEC-001 implementation phases
3. Refer back to PRDs for "why" questions
4. Update this document if new decisions arise during implementation

---

**Last Audit:** December 18, 2025  
**Audited By:** AI Assistant  
**Approved By:** [Project Lead]

