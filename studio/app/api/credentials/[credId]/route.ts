/**
 * Credentials API - Individual Credential Operations
 * 
 * Handles get, update, and delete for specific credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { CredentialManager } from '@backpackflow/credentials/credential-manager';
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
 * GET /api/credentials/[credId]
 * 
 * Get a specific credential (without sensitive data)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ credId: string }> }
) {
    try {
        const manager = getCredentialManager();
        await manager.initialize();
        
        const { credId } = await params;
        const credential = await manager.get(credId);
        
        if (!credential) {
            return NextResponse.json(
                { error: 'Credential not found' },
                { status: 404 }
            );
        }
        
        // Return metadata only - don't expose actual credential data
        return NextResponse.json({
            id: credential.id,
            type: credential.type,
            name: credential.name,
            createdAt: credential.createdAt,
            updatedAt: credential.updatedAt,
            lastUsed: credential.lastUsed,
            // data field omitted for security
        });
        
    } catch (error: any) {
        console.error('[Credentials API] Get error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to retrieve credential' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/credentials/[credId]
 * 
 * Update a credential
 * 
 * Body:
 * {
 *   data?: object,
 *   metadata?: object
 * }
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ credId: string }> }
) {
    try {
        const manager = getCredentialManager();
        await manager.initialize();
        
        const { credId } = await params;
        const body = await request.json();
        const { name, data } = body;
        
        // Get existing credential
        const existing = await manager.get(credId);
        
        if (!existing) {
            return NextResponse.json(
                { error: 'Credential not found' },
                { status: 404 }
            );
        }
        
        // Update credential
        const updates: any = {};
        if (name) updates.name = name;
        if (data) updates.data = data;
        
        await manager.update(credId, updates);
        
        return NextResponse.json({
            id: credId,
            message: 'Credential updated successfully'
        });
        
    } catch (error: any) {
        console.error('[Credentials API] Update error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update credential' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/credentials/[credId]
 * 
 * Delete a credential
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ credId: string }> }
) {
    try {
        const manager = getCredentialManager();
        await manager.initialize();
        
        const { credId } = await params;
        await manager.delete(credId);
        
        return NextResponse.json({
            id: credId,
            message: 'Credential deleted successfully'
        });
        
    } catch (error: any) {
        console.error('[Credentials API] Delete error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete credential' },
            { status: 500 }
        );
    }
}
