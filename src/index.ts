// BackpackFlow - A config-driven LLM framework built on top of PocketFlow

// Core PocketFlow framework
export * from './pocketflow';

// Production-ready nodes for building AI applications
export * from './nodes';

// LLM providers and abstractions (v1.x - commented out for v2.0)
// export * from './providers';

// Event streaming system
export * from './events';

// Types
export * from './types/llm';
export * from './types/events';

// Storage capabilities (explicit exports to avoid conflicts)
export { 
    BaseStorage, 
    SearchCapable, 
    ChatCapable, 
    DocumentCapable, 
    TaskCapable, 
    MemoryCapable,
    ResearchStorage,
    DocumentProcessingStorage,
    SimpleChatStorage,
    AgentStorage,
    createStorage,
    updateStorage,
    hasCapability
} from './storage/capabilities';

// v2.0: Backpack storage system (Git-like state management)
export {
    Backpack,
    BackpackError,
    AccessDeniedError,
    KeyNotFoundError,
    ValidationError,
    InvalidCommitError
} from './storage';

// v2.0: Backpack types
export type {
    BackpackItem,
    BackpackItemMetadata,
    BackpackCommit,
    BackpackOptions,
    PackOptions,
    NodePermissions,
    BackpackSnapshot,
    BackpackDiff,
    ValidationResult,
    NodeContext
} from './storage';

// Utilities (terminal interface, streaming chatbot, etc.)
export * from './utils';

// Examples (v1.x - commented out for v2.0)
// export * from './examples';

// Simple API for tutorials and quick prototyping
// export * from './simple'; // TODO: Implement simple API

// Re-export core PocketFlow classes for convenience
export { Node, Flow, BatchNode, ParallelBatchNode, BaseNode } from './pocketflow';

// BackpackFlow v2.0 - Flow with namespace composition
export { Flow as BackpackFlow } from './flows/flow';
export type { FlowConfig } from './flows/flow';

// v2.0: Serialization Bridge (PRD-003)
export { 
    DependencyContainer, 
    FlowLoader 
} from './serialization';

// v2.0: Serialization types
export type {
    NodeConfig as SerializedNodeConfig,
    FlowConfig as SerializedFlowConfig,
    FlowEdge,
    DependencyManifest,
    SerializableNode,
    SerializableNodeClass
} from './serialization'; 

// v2.1: Node Metadata System (Auto-generation from Zod schemas)
export { NodeRegistry } from './nodes/registry';
export type { NodeMetadata } from './nodes/registry';
export { generateNodeMetadata } from './utils/node-metadata-generator';
export { zodToProperties } from './utils/zod-to-properties';

// v2.1: Node Metadata Types
export type {
    NodeDescription,
    NodeProperty,
    DataContract,
    FullNodeMetadata
} from './types/node-metadata';

// v2.1: Credential Management System
export {
    CredentialManager,
    CredentialResolver,
    CredentialValidationError,
    CredentialNotFoundError,
    CredentialTypeMismatchError,
    BUILT_IN_CREDENTIAL_TYPES,
    getCredentialType,
    getCredentialTypesByCategory
} from './credentials';

// v2.1: Credential Types
export type {
    Credential,
    CredentialField,
    CredentialType,
    CredentialManagerOptions
} from './credentials'; 