/**
 * Node Metadata Types
 * 
 * Defines the structure for node metadata used by Studio and AI agents.
 * Inspired by n8n's node description format but enhanced for BackpackFlow.
 */

import { z, ZodTypeAny } from 'zod';

/**
 * UI property definition (n8n-style)
 * 
 * Defines how a config parameter is displayed in the Studio UI.
 */
export interface NodeProperty {
    displayName: string;
    name: string;
    type: 'string' | 'number' | 'boolean' | 'options' | 'json' | 'collection';
    default?: any;
    required?: boolean;
    placeholder?: string;
    description?: string;
    options?: Array<{ name: string; value: any; description?: string }>;
    typeOptions?: {
        minValue?: number;
        maxValue?: number;
        multipleValues?: boolean;
    };
}

/**
 * Node metadata (combines n8n + BackpackFlow)
 * 
 * Complete metadata for a node, used by:
 * - Studio for UI generation
 * - AI agents for discovery and composition
 * - Documentation generation
 */
export interface NodeDescription {
    // n8n-style UI metadata
    displayName: string;
    name: string;
    icon?: string;
    group: string;
    version: string;
    description: string;
    defaults?: {
        name?: string;
        color?: string;
    };
    properties?: NodeProperty[];
    
    // BackpackFlow additions
    category: string;
    tags?: string[];
    author?: string;
    documentationUrl?: string;
}

/**
 * Data contract (BackpackFlow v2.0)
 * 
 * Zod schemas for runtime validation of inputs/outputs
 */
export type DataContract = Record<string, ZodTypeAny>;

/**
 * Complete node metadata including schemas
 */
export interface FullNodeMetadata {
    description: NodeDescription;
    config?: z.ZodObject<any>;
    inputs?: DataContract;
    outputs?: DataContract;
    namespaceSegment?: string;
}
