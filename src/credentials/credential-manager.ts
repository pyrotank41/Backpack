/**
 * Credential Manager
 * 
 * Secure storage and management of credentials with AES-256-GCM encryption.
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
    Credential,
    CredentialStorage,
    CredentialManagerOptions,
    CredentialValidationError
} from './types';
import { getCredentialType } from './credential-types';

export class CredentialManager {
    private storageFile: string;
    private masterKey: Buffer;
    private credentials: Map<string, Credential>;
    private autoSave: boolean;
    private isLoaded: boolean = false;
    
    constructor(options: CredentialManagerOptions = {}) {
        // Determine storage location
        const storageDir = options.storageDir || path.join(process.cwd(), '.backpackflow');
        this.storageFile = path.join(storageDir, 'credentials.json');
        
        // Get master key from options or environment
        const masterKeyString = options.masterKey || process.env.BACKPACKFLOW_MASTER_KEY;
        
        if (!masterKeyString) {
            throw new Error(
                'Master key required for credential encryption.\n\n' +
                'Set BACKPACKFLOW_MASTER_KEY environment variable:\n' +
                '  export BACKPACKFLOW_MASTER_KEY=$(openssl rand -hex 32)\n\n' +
                'Or provide in options:\n' +
                '  new CredentialManager({ masterKey: "..." })'
            );
        }
        
        // Convert master key to 32-byte buffer
        this.masterKey = this.deriveMasterKey(masterKeyString);
        
        this.autoSave = options.autoSave !== false;
        this.credentials = new Map();
    }
    
    /**
     * Initialize and load credentials from storage
     */
    async initialize(): Promise<void> {
        if (this.isLoaded) {
            return;
        }
        
        try {
            await this.load();
            this.isLoaded = true;
        } catch (err: any) {
            if (err.code === 'ENOENT') {
                // File doesn't exist yet, that's okay
                this.isLoaded = true;
            } else {
                throw err;
            }
        }
    }
    
    /**
     * Add a new credential
     */
    async add(credential: Omit<Credential, 'createdAt' | 'updatedAt'>): Promise<void> {
        await this.ensureLoaded();
        
        // Validate credential
        this.validate(credential);
        
        // Check if ID already exists
        if (this.credentials.has(credential.id)) {
            throw new Error(`Credential with ID '${credential.id}' already exists`);
        }
        
        // Create full credential with timestamps
        const now = new Date();
        const fullCredential: Credential = {
            ...credential,
            createdAt: now,
            updatedAt: now
        };
        
        this.credentials.set(credential.id, fullCredential);
        
        if (this.autoSave) {
            await this.save();
        }
    }
    
    /**
     * Get a credential by ID
     */
    async get(id: string): Promise<Credential | null> {
        await this.ensureLoaded();
        return this.credentials.get(id) || null;
    }
    
    /**
     * List all credentials (optionally filtered by type)
     */
    async list(type?: string): Promise<Credential[]> {
        await this.ensureLoaded();
        
        const all = Array.from(this.credentials.values());
        
        if (type) {
            return all.filter(c => c.type === type);
        }
        
        return all;
    }
    
    /**
     * Update a credential
     */
    async update(id: string, updates: Partial<Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
        await this.ensureLoaded();
        
        const existing = this.credentials.get(id);
        if (!existing) {
            throw new Error(`Credential '${id}' not found`);
        }
        
        const updated: Credential = {
            ...existing,
            ...updates,
            id: existing.id, // Never change ID
            createdAt: existing.createdAt, // Never change creation date
            updatedAt: new Date()
        };
        
        // Validate updated credential
        this.validate(updated);
        
        this.credentials.set(id, updated);
        
        if (this.autoSave) {
            await this.save();
        }
    }
    
    /**
     * Delete a credential
     */
    async delete(id: string): Promise<boolean> {
        await this.ensureLoaded();
        
        const deleted = this.credentials.delete(id);
        
        if (deleted && this.autoSave) {
            await this.save();
        }
        
        return deleted;
    }
    
    /**
     * Update last used timestamp
     */
    async updateLastUsed(id: string): Promise<void> {
        const credential = this.credentials.get(id);
        if (credential) {
            credential.lastUsed = new Date();
            // Don't auto-save for last used updates (too frequent)
        }
    }
    
    /**
     * Save credentials to encrypted storage
     */
    async save(): Promise<void> {
        const storage: CredentialStorage = {
            version: '1.0',
            encryptionMethod: 'aes-256-gcm',
            credentials: []
        };
        
        // Encrypt each credential
        for (const credential of this.credentials.values()) {
            const encrypted = this.encrypt(credential.data);
            
            storage.credentials.push({
                id: credential.id,
                name: credential.name,
                type: credential.type,
                data: encrypted.data,
                iv: encrypted.iv,
                authTag: encrypted.authTag,
                createdAt: credential.createdAt.toISOString(),
                updatedAt: credential.updatedAt.toISOString(),
                lastUsed: credential.lastUsed?.toISOString()
            });
        }
        
        // Ensure storage directory exists
        const dir = path.dirname(this.storageFile);
        await fs.mkdir(dir, { recursive: true });
        
        // Write to file
        await fs.writeFile(
            this.storageFile,
            JSON.stringify(storage, null, 2),
            { mode: 0o600 } // Owner read/write only
        );
    }
    
    /**
     * Load credentials from encrypted storage
     */
    private async load(): Promise<void> {
        const content = await fs.readFile(this.storageFile, 'utf-8');
        const storage: CredentialStorage = JSON.parse(content);
        
        // Validate version
        if (storage.version !== '1.0') {
            throw new Error(`Unsupported credential storage version: ${storage.version}`);
        }
        
        // Decrypt and load credentials
        this.credentials.clear();
        
        for (const stored of storage.credentials) {
            try {
                const data = this.decrypt({
                    data: stored.data,
                    iv: stored.iv,
                    authTag: stored.authTag
                });
                
                const credential: Credential = {
                    id: stored.id,
                    name: stored.name,
                    type: stored.type,
                    data,
                    createdAt: new Date(stored.createdAt),
                    updatedAt: new Date(stored.updatedAt),
                    lastUsed: stored.lastUsed ? new Date(stored.lastUsed) : undefined
                };
                
                this.credentials.set(credential.id, credential);
            } catch (err) {
                console.error(`Failed to decrypt credential ${stored.id}:`, err);
                // Continue loading other credentials
            }
        }
    }
    
    /**
     * Encrypt credential data
     */
    private encrypt(data: Record<string, any>): {
        data: string;
        iv: string;
        authTag: string;
    } {
        // Generate random IV
        const iv = crypto.randomBytes(16);
        
        // Create cipher
        const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
        
        // Encrypt
        const plaintext = JSON.stringify(data);
        let encrypted = cipher.update(plaintext, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        
        // Get auth tag
        const authTag = cipher.getAuthTag();
        
        return {
            data: encrypted,
            iv: iv.toString('base64'),
            authTag: authTag.toString('base64')
        };
    }
    
    /**
     * Decrypt credential data
     */
    private decrypt(encrypted: {
        data: string;
        iv: string;
        authTag: string;
    }): Record<string, any> {
        // Convert from base64
        const iv = Buffer.from(encrypted.iv, 'base64');
        const authTag = Buffer.from(encrypted.authTag, 'base64');
        
        // Create decipher
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
        decipher.setAuthTag(authTag);
        
        // Decrypt
        let decrypted = decipher.update(encrypted.data, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
    }
    
    /**
     * Derive 32-byte master key from string
     */
    private deriveMasterKey(keyString: string): Buffer {
        // If already 64 hex chars (32 bytes), use directly
        if (/^[0-9a-f]{64}$/i.test(keyString)) {
            return Buffer.from(keyString, 'hex');
        }
        
        // Otherwise, derive using PBKDF2
        return crypto.pbkdf2Sync(
            keyString,
            'backpackflow-credentials', // Salt
            100000, // Iterations
            32, // Key length (256 bits)
            'sha256'
        );
    }
    
    /**
     * Validate credential against its type definition
     */
    private validate(credential: Omit<Credential, 'createdAt' | 'updatedAt'> | Credential): void {
        const credType = getCredentialType(credential.type);
        
        if (!credType) {
            // Unknown type, skip validation
            return;
        }
        
        // Validate required fields
        for (const field of credType.fields) {
            if (field.required && !credential.data[field.name]) {
                throw new CredentialValidationError(
                    `Required field '${field.name}' is missing`,
                    field.name,
                    credential.type
                );
            }
            
            const value = credential.data[field.name];
            if (value && field.validation) {
                // Check minLength
                if (field.validation.minLength && value.length < field.validation.minLength) {
                    throw new CredentialValidationError(
                        `Field '${field.name}' must be at least ${field.validation.minLength} characters`,
                        field.name,
                        credential.type
                    );
                }
                
                // Check maxLength
                if (field.validation.maxLength && value.length > field.validation.maxLength) {
                    throw new CredentialValidationError(
                        `Field '${field.name}' must be at most ${field.validation.maxLength} characters`,
                        field.name,
                        credential.type
                    );
                }
                
                // Check pattern
                if (field.validation.pattern) {
                    const regex = new RegExp(field.validation.pattern);
                    if (!regex.test(value)) {
                        throw new CredentialValidationError(
                            `Field '${field.name}' does not match required format`,
                            field.name,
                            credential.type
                        );
                    }
                }
            }
        }
    }
    
    /**
     * Ensure credentials are loaded
     */
    private async ensureLoaded(): Promise<void> {
        if (!this.isLoaded) {
            await this.initialize();
        }
    }
}
