/**
 * Zod to Properties Converter
 * 
 * Automatically generates n8n-style UI properties from Zod schemas.
 * This eliminates duplication - define your schema once, UI generates automatically.
 */

import { z, ZodTypeAny, ZodObject, ZodOptional, ZodDefault } from 'zod';
import { NodeProperty } from '../types/node-metadata';

/**
 * Convert Zod object schema to array of UI properties
 * 
 * @param schema - Zod object schema (e.g., z.object({ apiKey: z.string() }))
 * @returns Array of NodeProperty for UI generation
 * 
 * @example
 * ```typescript
 * const schema = z.object({
 *   apiKey: z.string().describe('Your API key'),
 *   maxResults: z.number().min(1).max(100).default(50)
 * });
 * 
 * const properties = zodToProperties(schema);
 * // Returns UI property definitions for Studio
 * ```
 */
export function zodToProperties(schema: ZodObject<any>): NodeProperty[] {
    const properties: NodeProperty[] = [];
    const shape = schema.shape;
    
    for (const [name, zodType] of Object.entries(shape)) {
        const prop = zodTypeToProperty(name, zodType as ZodTypeAny);
        if (prop) {
            properties.push(prop);
        }
    }
    
    return properties;
}

/**
 * Convert a single Zod type to a NodeProperty
 */
function zodTypeToProperty(name: string, zodType: ZodTypeAny): NodeProperty | null {
    const description = zodType.description || '';
    
    // Unwrap optional and default types
    let baseType = zodType;
    let isOptional = false;
    let defaultValue: any = undefined;
    
    // Handle ZodOptional
    if (zodType._def.typeName === 'ZodOptional') {
        isOptional = true;
        baseType = (zodType as ZodOptional<any>)._def.innerType;
    }
    
    // Handle ZodDefault
    if (baseType._def.typeName === 'ZodDefault') {
        const defaultType = baseType as ZodDefault<any>;
        defaultValue = defaultType._def.defaultValue();
        baseType = defaultType._def.innerType;
    }
    
    // Convert based on Zod type
    const typeName = baseType._def.typeName;
    
    switch (typeName) {
        case 'ZodString':
            return {
                displayName: nameToDisplayName(name),
                name,
                type: 'string',
                default: defaultValue ?? '',
                required: !isOptional,
                description,
            };
            
        case 'ZodNumber':
            const numberChecks = baseType._def.checks || [];
            const minCheck = numberChecks.find((c: any) => c.kind === 'min');
            const maxCheck = numberChecks.find((c: any) => c.kind === 'max');
            
            return {
                displayName: nameToDisplayName(name),
                name,
                type: 'number',
                default: defaultValue ?? 0,
                required: !isOptional,
                description,
                typeOptions: {
                    minValue: minCheck?.value,
                    maxValue: maxCheck?.value,
                },
            };
            
        case 'ZodBoolean':
            return {
                displayName: nameToDisplayName(name),
                name,
                type: 'boolean',
                default: defaultValue ?? false,
                required: !isOptional,
                description,
            };
            
        case 'ZodEnum':
            const enumValues = baseType._def.values;
            return {
                displayName: nameToDisplayName(name),
                name,
                type: 'options',
                default: defaultValue ?? enumValues[0],
                required: !isOptional,
                description,
                options: enumValues.map((val: string) => ({
                    name: nameToDisplayName(val),
                    value: val,
                })),
            };
            
        case 'ZodObject':
        case 'ZodArray':
        case 'ZodRecord':
            return {
                displayName: nameToDisplayName(name),
                name,
                type: 'json',
                default: defaultValue ?? (typeName === 'ZodArray' ? [] : {}),
                required: !isOptional,
                description,
            };
            
        default:
            console.warn(`[zodToProperties] Unsupported Zod type: ${typeName} for field '${name}'`);
            // Return a generic JSON field as fallback
            return {
                displayName: nameToDisplayName(name),
                name,
                type: 'json',
                default: defaultValue,
                required: !isOptional,
                description,
            };
    }
}

/**
 * Convert camelCase to Display Name
 * 
 * @example
 * nameToDisplayName('apiKey') // "API Key"
 * nameToDisplayName('maxResults') // "Max Results"
 * nameToDisplayName('bearerToken') // "Bearer Token"
 */
function nameToDisplayName(name: string): string {
    return name
        // Insert space before capital letters
        .replace(/([A-Z])/g, ' $1')
        // Capitalize first letter
        .replace(/^./, str => str.toUpperCase())
        // Normalize spaces
        .trim()
        .replace(/\s+/g, ' ');
}
