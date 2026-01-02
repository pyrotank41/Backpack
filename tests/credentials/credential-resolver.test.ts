/**
 * Tests for CredentialResolver
 * 
 * Tests credential resolution from multiple sources:
 * - Direct values
 * - Environment variables
 * - Managed credentials
 */

import { CredentialResolver } from '../../src/credentials/credential-resolver';
import { CredentialManager } from '../../src/credentials/credential-manager';
import { CredentialNotFoundError, CredentialTypeMismatchError } from '../../src/credentials/types';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('CredentialResolver', () => {
    let resolver: CredentialResolver;
    let credentialManager: CredentialManager;
    let testDir: string;
    
    beforeEach(async () => {
        // Create unique temp directory for test credentials (avoid conflicts in parallel runs)
        testDir = path.join(process.cwd(), `.test-credentials-resolver-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        await fs.mkdir(testDir, { recursive: true });
        
        // Set master key
        process.env.BACKPACKFLOW_MASTER_KEY = 'test-master-key-for-testing-only-32bytes!';
        
        // Initialize credential manager
        credentialManager = new CredentialManager({
            storageDir: testDir,
            masterKey: process.env.BACKPACKFLOW_MASTER_KEY
        });
        await credentialManager.initialize();
        
        // Create resolver with manager
        resolver = new CredentialResolver(credentialManager);
    });
    
    afterEach(async () => {
        // Clean up test directory
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (err) {
            // Ignore errors
        }
        
        // Clean up env vars
        delete process.env.BACKPACKFLOW_MASTER_KEY;
        delete process.env.TEST_API_KEY;
    });
    
    describe('Direct Value Resolution', () => {
        it('should return direct values as-is', async () => {
            const result = await resolver.resolve('my-direct-api-key');
            expect(result).toBe('my-direct-api-key');
        });
        
        it('should handle empty strings', async () => {
            await expect(resolver.resolve('')).rejects.toThrow('Credential value cannot be empty');
        });
    });
    
    describe('Environment Variable Resolution', () => {
        it('should resolve env vars with ${VAR} syntax', async () => {
            process.env.TEST_API_KEY = 'test-key-from-env';
            
            const result = await resolver.resolve('${TEST_API_KEY}');
            expect(result).toBe('test-key-from-env');
        });
        
        it('should throw error for missing env var', async () => {
            await expect(resolver.resolve('${MISSING_VAR}'))
                .rejects
                .toThrow("Environment variable 'MISSING_VAR' is not set");
        });
        
        it('should handle env vars with special characters', async () => {
            process.env.MY_API_KEY_123 = 'special-key';
            
            const result = await resolver.resolve('${MY_API_KEY_123}');
            expect(result).toBe('special-key');
        });
    });
    
    describe('Managed Credential Resolution', () => {
        beforeEach(async () => {
            // Add test credentials
            await credentialManager.add({
                id: 'test-api-1',
                name: 'Test API 1',
                type: 'apiKey',
                data: {
                    apiKey: 'secret-key-123'
                }
            });
            
            await credentialManager.add({
                id: 'test-api-2',
                name: 'Test API 2',
                type: 'apiKey',
                data: {
                    apiKey: 'another-key-456'
                }
            });
        });
        
        it('should resolve credential references', async () => {
            const result = await resolver.resolve('@cred:test-api-1');
            expect(result).toBe('secret-key-123');
        });
        
        it('should throw error for non-existent credential', async () => {
            await expect(resolver.resolve('@cred:non-existent'))
                .rejects
                .toBeInstanceOf(CredentialNotFoundError);
        });
        
        it('should provide suggestions when credential not found', async () => {
            try {
                await resolver.resolve('@cred:missing');
                fail('Should have thrown error');
            } catch (err: any) {
                expect(err.message).toContain('@cred:test-api-1');
                expect(err.message).toContain('@cred:test-api-2');
            }
        });
        
        it('should validate credential type', async () => {
            await expect(
                resolver.resolve('@cred:test-api-1', 'bearerToken')
            ).rejects.toBeInstanceOf(CredentialTypeMismatchError);
        });
        
        it('should allow credential resolution without type validation', async () => {
            const result = await resolver.resolve('@cred:test-api-1');
            expect(result).toBe('secret-key-123');
        });
        
        it('should handle credentials with different field names', async () => {
            await credentialManager.add({
                id: 'bearer-token',
                name: 'Bearer Token',
                type: 'bearerToken',
                data: {
                    token: 'bearer-test-token'
                }
            });
            
            const result = await resolver.resolve('@cred:bearer-token');
            expect(result).toBe('bearer-test-token');
        });
    });
    
    describe('Resolver without CredentialManager', () => {
        beforeEach(() => {
            resolver = new CredentialResolver(); // No manager
        });
        
        it('should resolve direct values', async () => {
            const result = await resolver.resolve('direct-key');
            expect(result).toBe('direct-key');
        });
        
        it('should resolve env vars', async () => {
            process.env.TEST_KEY = 'env-key';
            const result = await resolver.resolve('${TEST_KEY}');
            expect(result).toBe('env-key');
        });
        
        it('should throw error for credential references', async () => {
            await expect(resolver.resolve('@cred:any'))
                .rejects
                .toThrow('requires CredentialManager');
        });
    });
    
    describe('Helper Methods', () => {
        it('should identify credential references', () => {
            expect(resolver.isCredentialReference('@cred:test')).toBe(true);
            expect(resolver.isCredentialReference('direct-value')).toBe(false);
            expect(resolver.isCredentialReference('${VAR}')).toBe(false);
        });
        
        it('should identify env var references', () => {
            expect(resolver.isEnvVarReference('${VAR}')).toBe(true);
            expect(resolver.isEnvVarReference('@cred:test')).toBe(false);
            expect(resolver.isEnvVarReference('direct-value')).toBe(false);
        });
        
        it('should extract credential ID', () => {
            expect(resolver.extractCredentialId('@cred:my-cred')).toBe('my-cred');
            expect(resolver.extractCredentialId('direct-value')).toBeNull();
        });
        
        it('should extract env var name', () => {
            expect(resolver.extractEnvVarName('${MY_VAR}')).toBe('MY_VAR');
            expect(resolver.extractEnvVarName('direct-value')).toBeNull();
        });
    });
});
