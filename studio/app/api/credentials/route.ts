/**
 * Credentials API - List and Create
 * 
 * Handles credential management for BackpackFlow Studio
 */

import { NextRequest, NextResponse } from 'next/server';
import { CredentialManager } from '@backpackflow/credentials/credential-manager';
import { BUILT_IN_CREDENTIAL_TYPES } from '@backpackflow/credentials/credential-types';
import * as path from 'path';

// Initialize credential manager
let credentialManager: CredentialManager;

function getCredentialManager(): CredentialManager {
    if (!credentialManager) {
        const storageDir = path.join(process.cwd(), '..', '.credentials');
        const masterKey = process.env.BACKPACKFLOW_MASTER_KEY || process.env.MASTER_KEY;
        
        if (!masterKey) {
            throw new Error('BACKPACKFLOW_MASTER_KEY environment variable is required');
        }
        
        credentialManager = new CredentialManager({
            storageDir,
            masterKey
        });
        
        // Initialize is async, but we'll handle it in each request
        credentialManager.initialize().catch(err => {
            console.error('Failed to initialize credential manager:', err);
        });
    }
    
    return credentialManager;
}

/**
 * GET /api/credentials
 * 
 * List all credentials
 */
export async function GET(request: NextRequest) {
    try {
        const manager = getCredentialManager();
        await manager.initialize(); // Ensure initialized
        
        const credentials = await manager.list();
        
        // Don't send actual credential data - only metadata
        const sanitized = credentials.map(cred => ({
            id: cred.id,
            type: cred.type,
            name: cred.name,
            createdAt: cred.createdAt,
            updatedAt: cred.updatedAt,
            lastUsed: cred.lastUsed,
            // Don't include 'data' field for security
        }));
        
        return NextResponse.json(sanitized);
        
    } catch (error: any) {
        console.error('[Credentials API] List error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to list credentials' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/credentials
 * 
 * Create a new credential
 * 
 * Body:
 * {
 *   type: string,
 *   data: object,
 *   metadata?: { name, description, tags }
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const manager = getCredentialManager();
        await manager.initialize(); // Ensure initialized
        
        const body = await request.json();
        const { type, data, name } = body;
        
        if (!type || !data) {
            return NextResponse.json(
                { error: 'Missing required fields: type, data' },
                { status: 400 }
            );
        }
        
        // Generate ID
        const id = `cred_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        
        // Store credential
        await manager.add({
            id,
            name: name || id,
            type,
            data,
        });
        
        return NextResponse.json({
            id,
            type,
            name: name || id,
            message: 'Credential created successfully'
        }, { status: 201 });
        
    } catch (error: any) {
        console.error('[Credentials API] Create error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create credential' },
            { status: 500 }
        );
    }
}

// Credential types are handled by /api/credentials/types route
