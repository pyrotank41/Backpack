# BackpackFlow Documentation

Welcome to the BackpackFlow documentation hub!

> 📋 **See [STRUCTURE.md](./STRUCTURE.md)** for a complete visual directory tree and navigation guide.

---

## 📂 Documentation by Version

```
docs/
├── v2.0/           # 🚧 Current Development (Dec 21, 2025)
├── v2.1/           # 🔮 Future Release (Q1 2026)
└── legacy/         # 📦 Archived (pre-v2.0)
```

---

## 🚀 v2.0 - Current Development

**Status:** In Development  
**Target Release:** December 21, 2025 (Q4 2025)

### Quick Links

- 📖 **[v2.0 Documentation Hub](./v2.0/README.md)** - Start here!
- ✅ **[Pre-Implementation Checklist](./v2.0/specs/DECISIONS-AUDIT-v2.0.md)** - All decisions documented
- 📋 **[PRD-001: Backpack Architecture](./v2.0/prds/PRD-001-backpack-architecture.md)** - Core concepts
- 🔧 **[TECH-SPEC-001: Implementation Guide](./v2.0/specs/TECH-SPEC-001-backpack-implementation.md)** - How to build
- 🔄 **[Migration Guide v1→v2](./v2.0/migration/MIGRATION-v1-to-v2.md)** - Upgrade path

### v2.0 Contents

```
v2.0/
├── prds/              # Product Requirements (What & Why)
│   ├── PRD-001-backpack-architecture.md
│   ├── PRD-002-telemetry-system.md
│   └── PRD-003-serialization-bridge.md
│
├── specs/             # Technical Specifications (How to Build)
│   ├── DECISIONS-AUDIT-v2.0.md        # Pre-implementation checklist
│   └── TECH-SPEC-001-backpack-implementation.md
│
├── guides/            # Implementation Guides & Deep Dives
│   ├── git-analogy.md                 # Mental model
│   ├── backpack-flow-example.md       # Complete walkthrough
│   ├── debugging-workflow.md          # Time-travel debugging
│   ├── snapshot-reconstruction.md     # How snapshots work
│   ├── memory-management.md           # Size limits & disk offload
│   └── streaming-architecture-diagram.md
│
└── migration/         # Upgrade Guides
    ├── MIGRATION-v1-to-v2.md          # Step-by-step upgrade
    └── BREAKING-CHANGES.md            # Complete breaking changes list
```

**Full index:** See [v2.0/README.md](./v2.0/README.md)

---

## 🔮 v2.1 - Future Release

**Status:** Planned  
**Target Release:** Q1 2026

### Planned Features

- **Enhanced Observability** - Web-based tracer UI, event persistence, trace replay
- **Advanced Routing** - JSON Logic edge conditions, deep namespace matching
- **Hot-Reloading** - Swap configs in running agents

**Full details:** See [v2.1/README.md](./v2.1/README.md)

---

## 📦 Legacy Documentation

Archived documentation from pre-v2.0:

- **[PRD-legacy.md](./legacy/PRD-legacy.md)** - Original combined PRD (superseded)

**Full archive:** See [legacy/README.md](./legacy/README.md)

---

## 🎯 Key Architectural Decisions (v2.0)

| Decision | Summary |
|----------|---------|
| **AD-001** | **Graph-Assigned Namespaces** - Nodes define segments, flows compose paths |
| **AD-002** | **Hybrid Error Handling** - `unpack()` returns undefined, `unpackRequired()` throws |
| **AD-003** | **Event Emission Strategy** - Synchronous with async handler support |
| **AD-004** | **Edge Conditions** - String-based in v2.0, JSON Logic in v2.1 |

**Complete audit:** [v2.0/specs/DECISIONS-AUDIT-v2.0.md](./v2.0/specs/DECISIONS-AUDIT-v2.0.md)

---

## 🛠️ For Implementers

**Starting v2.0 implementation?** Follow this path:

1. ✅ **[DECISIONS-AUDIT-v2.0.md](./v2.0/specs/DECISIONS-AUDIT-v2.0.md)** - Confirm all decisions documented
2. 📖 **[git-analogy.md](./v2.0/guides/git-analogy.md)** - Understand the mental model
3. 📋 **[PRD-001](./v2.0/prds/PRD-001-backpack-architecture.md)** - Read the "what & why"
4. 🔧 **[TECH-SPEC-001](./v2.0/specs/TECH-SPEC-001-backpack-implementation.md)** - Follow implementation phases
5. 🧪 **Test as you go** - See test strategy in TECH-SPEC-001

---

## 📚 Additional Resources

- **[Project README](../README.md)** - Project overview & quick start
- **[ROADMAP.md](../ROADMAP.md)** - Full v2.0 release plan & timeline
- **[tutorials/](../tutorials/)** - Learning guides & examples
- **[tasks/](../tasks/)** - Task definitions & work items

---

## 🤝 Contributing to Docs

### Adding New Documentation

1. **v2.0 docs** → Add to appropriate subdirectory in `docs/v2.0/`
2. **v2.1 docs** → Add to `docs/v2.1/`
3. **Version-agnostic** → Consider if it belongs in project root
4. **Update READMEs** → Add links to relevant README files

### Naming Conventions

- **PRDs:** `PRD-NNN-feature-name.md`
- **Tech Specs:** `TECH-SPEC-NNN-topic.md`
- **Guides:** `descriptive-name.md` (lowercase with hyphens)
- **Decisions:** `DECISIONS-AUDIT-vX.Y.md`

---

**Last Updated:** December 18, 2025  
**Current Version:** v2.0 (in development)
