/**
 * Credential Types API
 * 
 * Returns available credential types for the UI
 */

import { NextRequest, NextResponse } from 'next/server';
import { BUILT_IN_CREDENTIAL_TYPES } from '@backpackflow/credentials/credential-types';

/**
 * GET /api/credentials/types
 * 
 * List all available credential types with their schemas
 */
export async function GET(request: NextRequest) {
    try {
        const types = Object.entries(BUILT_IN_CREDENTIAL_TYPES).map(([key, type]) => ({
            id: type.id,
            name: type.name,
            description: type.description,
            fields: type.fields.map(f => ({
                name: f.name,
                type: f.type,
                required: f.required,
                description: f.description,
                placeholder: f.placeholder,
                validation: f.validation ? {
                    minLength: f.validation.minLength,
                    maxLength: f.validation.maxLength,
                    pattern: f.validation.pattern,
                } : undefined
            }))
        }));
        
        return NextResponse.json(types);
        
    } catch (error: any) {
        console.error('[Credential Types API] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to list credential types' },
            { status: 500 }
        );
    }
}
