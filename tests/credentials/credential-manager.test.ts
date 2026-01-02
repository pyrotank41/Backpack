/**
 * Tests for CredentialManager
 * 
 * Tests secure credential storage, encryption, and CRUD operations
 */

import { CredentialManager } from '../../src/credentials/credential-manager';
import { CredentialValidationError } from '../../src/credentials/types';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('CredentialManager', () => {
    let manager: CredentialManager;
    let testDir: string;
    const masterKey = 'test-master-key-for-testing-only-32bytes!';
    
    beforeEach(async () => {
        // Create unique temp directory (avoid conflicts in parallel runs)
        testDir = path.join(process.cwd(), `.test-credentials-manager-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        await fs.mkdir(testDir, { recursive: true });
        
        // Initialize manager
        manager = new CredentialManager({
            storageDir: testDir,
            masterKey
        });
        await manager.initialize();
    });
    
    afterEach(async () => {
        // Clean up
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (err) {
            // Ignore
        }
    });
    
    describe('Initialization', () => {
        it('should initialize without existing storage', async () => {
            const newManager = new CredentialManager({
                storageDir: testDir,
                masterKey
            });
            await expect(newManager.initialize()).resolves.not.toThrow();
        });
        
        it('should require master key', () => {
            expect(() => new CredentialManager({ storageDir: testDir }))
                .toThrow('Master key required');
        });
        
        it('should accept master key from environment', () => {
            process.env.BACKPACKFLOW_MASTER_KEY = masterKey;
            const manager = new CredentialManager({ storageDir: testDir });
            expect(manager).toBeDefined();
            delete process.env.BACKPACKFLOW_MASTER_KEY;
        });
    });
    
    describe('CRUD Operations', () => {
        describe('Add', () => {
            it('should add a new credential', async () => {
                await manager.add({
                    id: 'test-1',
                    name: 'Test Credential',
                    type: 'apiKey',
                data: {
                    apiKey: 'test-key-123456789012345678901234567890'
                }
                });
                
                const retrieved = await manager.get('test-1');
                expect(retrieved).toBeDefined();
                expect(retrieved?.id).toBe('test-1');
                expect(retrieved?.name).toBe('Test Credential');
                expect(retrieved?.data.apiKey).toBe('test-key-123456789012345678901234567890');
            });
            
            it('should throw error for duplicate ID', async () => {
                await manager.add({
                    id: 'test-1',
                    name: 'First',
                    type: 'apiKey',
                    data: { apiKey: 'key1-abcdefghijklmnopqrstuvwxyz1234567890' }
                });
                
                await expect(manager.add({
                    id: 'test-1',
                    name: 'Second',
                    type: 'apiKey',
                    data: { apiKey: 'key2-abcdefghijklmnopqrstuvwxyz1234567890' }
                })).rejects.toThrow('already exists');
            });
            
            it('should set timestamps', async () => {
                await manager.add({
                    id: 'test-1',
                    name: 'Test',
                    type: 'apiKey',
                    data: { apiKey: 'key1234567890123456789012345678901234567890' }
                });
                
                const credential = await manager.get('test-1');
                expect(credential?.createdAt).toBeInstanceOf(Date);
                expect(credential?.updatedAt).toBeInstanceOf(Date);
            });
        });
        
        describe('Get', () => {
            it('should return null for non-existent credential', async () => {
                const result = await manager.get('non-existent');
                expect(result).toBeNull();
            });
            
            it('should retrieve added credentials', async () => {
                await manager.add({
                    id: 'test-1',
                    name: 'Test',
                    type: 'apiKey',
                    data: { apiKey: 'key1234567890123456789012345678901234567890' }
                });
                
                const result = await manager.get('test-1');
                expect(result).not.toBeNull();
                expect(result?.id).toBe('test-1');
            });
        });
        
        describe('List', () => {
            beforeEach(async () => {
                await manager.add({
                    id: 'youtube-1',
                    name: 'YouTube 1',
                    type: 'youtubeApi',
                    data: { apiKey: 'AIzaSyTestKey1_1234567890ABCDEFGHIJKLMN' }
                });
                await manager.add({
                    id: 'youtube-2',
                    name: 'YouTube 2',
                    type: 'youtubeApi',
                    data: { apiKey: 'AIzaSyTestKey2_2234567890ABCDEFGHIJKLMN' }
                });
                await manager.add({
                    id: 'openai-1',
                    name: 'OpenAI',
                    type: 'openaiApi',
                    data: { apiKey: 'sk-TestKey3234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcde' }
                });
            });
            
            it('should list all credentials', async () => {
                const all = await manager.list();
                expect(all).toHaveLength(3);
            });
            
            it('should filter by type', async () => {
                const youtube = await manager.list('youtubeApi');
                expect(youtube).toHaveLength(2);
                expect(youtube.every(c => c.type === 'youtubeApi')).toBe(true);
            });
        });
        
        describe('Update', () => {
            beforeEach(async () => {
                await manager.add({
                    id: 'test-1',
                    name: 'Original Name',
                    type: 'apiKey',
                    data: { apiKey: 'original-key-abcdefghijklmnopqrstuvwxyz1234567890' }
                });
            });
            
            it('should update credential data', async () => {
                await manager.update('test-1', {
                    name: 'Updated Name',
                    data: { apiKey: 'updated-key-abcdefghijklmnopqrstuvwxyz1234567890' }
                });
                
                const updated = await manager.get('test-1');
                expect(updated?.name).toBe('Updated Name');
                expect(updated?.data.apiKey).toBe('updated-key-abcdefghijklmnopqrstuvwxyz1234567890');
            });
            
            it('should update timestamp', async () => {
                const before = await manager.get('test-1');
                const originalUpdated = before!.updatedAt;
                
                // Wait a bit to ensure timestamp difference
                await new Promise(resolve => setTimeout(resolve, 10));
                
                await manager.update('test-1', {
                    name: 'New Name'
                });
                
                const after = await manager.get('test-1');
                expect(after!.updatedAt.getTime()).toBeGreaterThan(originalUpdated.getTime());
            });
            
            it('should throw error for non-existent credential', async () => {
                await expect(manager.update('non-existent', { name: 'New' }))
                    .rejects
                    .toThrow('not found');
            });
            
            it('should not change ID or createdAt', async () => {
                const before = await manager.get('test-1');
                
                await manager.update('test-1', {
                    name: 'Updated'
                });
                
                const after = await manager.get('test-1');
                expect(after?.id).toBe(before?.id);
                expect(after?.createdAt.getTime()).toBe(before?.createdAt.getTime());
            });
        });
        
        describe('Delete', () => {
            beforeEach(async () => {
                await manager.add({
                    id: 'test-1',
                    name: 'Test',
                    type: 'apiKey',
                    data: { apiKey: 'key1234567890123456789012345678901234567890' }
                });
            });
            
            it('should delete credential', async () => {
                const deleted = await manager.delete('test-1');
                expect(deleted).toBe(true);
                
                const retrieved = await manager.get('test-1');
                expect(retrieved).toBeNull();
            });
            
            it('should return false for non-existent credential', async () => {
                const deleted = await manager.delete('non-existent');
                expect(deleted).toBe(false);
            });
        });
    });
    
    describe('Encryption & Storage', () => {
        it('should persist credentials to disk', async () => {
            await manager.add({
                id: 'test-1',
                name: 'Test',
                type: 'apiKey',
                data: { apiKey: 'secret-key-abcdefghijklmnopqrstuvwxyz1234567890' }
            });
            
            await manager.save();
            
            // Verify file exists
            const storageFile = path.join(testDir, 'credentials.json');
            const exists = await fs.access(storageFile).then(() => true).catch(() => false);
            expect(exists).toBe(true);
        });
        
        it('should encrypt credentials on disk', async () => {
            await manager.add({
                id: 'test-1',
                name: 'Test',
                type: 'apiKey',
                data: { apiKey: 'secret-key-123' }
            });
            
            await manager.save();
            
            // Read raw file
            const storageFile = path.join(testDir, 'credentials.json');
            const content = await fs.readFile(storageFile, 'utf-8');
            
            // Verify the secret is NOT in plain text
            expect(content).not.toContain('secret-key-123');
        });
        
        it('should load credentials from disk', async () => {
            await manager.add({
                id: 'test-1',
                name: 'Test',
                type: 'apiKey',
                data: { apiKey: 'secret-key-abcdefghijklmnopqrstuvwxyz1234567890' }
            });
            
            await manager.save();
            
            // Create new manager and load
            const newManager = new CredentialManager({
                storageDir: testDir,
                masterKey
            });
            await newManager.initialize();
            
            const loaded = await newManager.get('test-1');
            expect(loaded).toBeDefined();
            expect(loaded?.data.apiKey).toBe('secret-key-abcdefghijklmnopqrstuvwxyz1234567890');
        });
        
        it('should fail to decrypt with wrong master key', async () => {
            await manager.add({
                id: 'test-1',
                name: 'Test',
                type: 'apiKey',
                data: { apiKey: 'secret1234567890abcdefghijklmnopqrstuvwxyz' }
            });
            
            await manager.save();
            
            // Try to load with different key
            const wrongManager = new CredentialManager({
                storageDir: testDir,
                masterKey: 'wrong-key-different-from-original!'
            });
            
            // Should log error but not throw
            await wrongManager.initialize();
            
            const loaded = await wrongManager.get('test-1');
            expect(loaded).toBeNull(); // Failed to decrypt
        });
    });
    
    describe('Validation', () => {
        it('should validate YouTube API key format', async () => {
            await expect(manager.add({
                id: 'youtube-1',
                name: 'YouTube',
                type: 'youtubeApi',
                data: { apiKey: 'too-short' }
            })).rejects.toBeInstanceOf(CredentialValidationError);
        });
        
        it('should accept valid YouTube API key', async () => {
            await manager.add({
                id: 'youtube-valid',
                name: 'YouTube',
                type: 'youtubeApi',
                data: { apiKey: 'AIzaSyValidKey_1234567890ABCDEFGHIJKLMN' }
            });
            
            const cred = await manager.get('youtube-valid');
            expect(cred).toBeDefined();
        });
        
        it('should validate required fields', async () => {
            await expect(manager.add({
                id: 'youtube-1',
                name: 'YouTube',
                type: 'youtubeApi',
                data: {} // Missing apiKey
            })).rejects.toBeInstanceOf(CredentialValidationError);
        });
    });
    
    describe('Last Used Tracking', () => {
        beforeEach(async () => {
            await manager.add({
                id: 'test-1',
                name: 'Test',
                type: 'apiKey',
                data: { apiKey: 'key1234567890123456789012345678901234567890' }
            });
        });
        
        it('should update last used timestamp', async () => {
            await manager.updateLastUsed('test-1');
            
            const cred = await manager.get('test-1');
            expect(cred?.lastUsed).toBeInstanceOf(Date);
        });
        
        it('should not auto-save on last used update', async () => {
            const testDir2 = path.join(process.cwd(), `.test-credentials-autosave-${Date.now()}-${Math.random().toString(36).slice(2)}`);
            await fs.mkdir(testDir2, { recursive: true });
            
            try {
                const manager = new CredentialManager({
                    storageDir: testDir2,
                    masterKey,
                    autoSave: false
                });
                await manager.initialize();
                
                await manager.add({
                    id: 'test-autosave',
                    name: 'Test',
                    type: 'apiKey',
                    data: { apiKey: 'key1234567890123456789012345678901234567890' }
                });
                
                await manager.save();
                await manager.updateLastUsed('test-autosave');
                
                // Load new manager - last used should not be persisted
                const newManager = new CredentialManager({
                    storageDir: testDir2,
                    masterKey
                });
                await newManager.initialize();
                
                const cred = await newManager.get('test-autosave');
                expect(cred?.lastUsed).toBeUndefined();
            } finally {
                await fs.rm(testDir2, { recursive: true, force: true });
            }
        });
    });
});
