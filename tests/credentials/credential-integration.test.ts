/**
 * Integration Tests for Credential System
 * 
 * Tests full credential flow with BackpackNode and Flow integration
 */

import { BackpackNode, NodeConfig, NodeContext } from '../../src/nodes/backpack-node';
import { Flow } from '../../src/flows/flow';
import { CredentialManager } from '../../src/credentials/credential-manager';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

// Test node that uses credentials
class TestAPINode extends BackpackNode {
    static config = z.object({
        apiKey: z.string().describe('API key (direct, @cred:xxx, or ${VAR})')
    });
    
    private nodeConfig: any;
    private resolvedApiKey?: string;
    
    constructor(config: NodeConfig, context: NodeContext) {
        super(config, context);
        // Store config for later use
        const { id, ...rest } = config;
        this.nodeConfig = rest;
    }
    
    async prep(shared: any) {
        this.resolvedApiKey = await this.resolveCredential(
            this.nodeConfig.apiKey,
            'apiKey'
        );
        return { apiKey: this.resolvedApiKey };
    }
    
    async _exec(input: any) {
        return { apiKey: input.apiKey };
    }
    
    async post(shared: any, prep: any, exec: any) {
        // Pack with explicit nodeId for testing
        this.backpack.pack('apiKeyUsed-' + this.id, exec.apiKey, { nodeId: this.id });
        return 'complete';
    }
}

describe('Credential Integration', () => {
    let credentialManager: CredentialManager;
    let testDir: string;
    const masterKey = 'test-master-key-for-testing-only-32bytes!';
    
    beforeEach(async () => {
        // Setup unique temp directory (avoid conflicts in parallel runs)
        testDir = path.join(process.cwd(), `.test-credentials-integration-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        await fs.mkdir(testDir, { recursive: true });
        
        credentialManager = new CredentialManager({
            storageDir: testDir,
            masterKey
        });
        await credentialManager.initialize();
    });
    
    afterEach(async () => {
        // Cleanup
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (err) {
            // Ignore
        }
        delete process.env.TEST_API_KEY;
    });
    
    describe('Flow Integration', () => {
        it('should pass credentialManager to nodes', async () => {
            const flow = new Flow({
                namespace: 'test',
                credentialManager
            });
            
            await credentialManager.add({
                id: 'test-api',
                name: 'Test API',
                type: 'apiKey',
                data: { apiKey: 'managed-key-123456789012345678901234567890' }
            });
            
            const node = flow.addNode(TestAPINode, {
                id: 'test-node',
                apiKey: '@cred:test-api'
            });
            
            flow.setEntryNode(node);
            await flow.run({});
            
            const result = flow.backpack.unpack('apiKeyUsed-test-node', 'test-node');
            expect(result).toBe('managed-key-123456789012345678901234567890');
        });
        
        it('should work without credentialManager (env vars)', async () => {
            process.env.TEST_API_KEY = 'env-key-789';
            
            const flow = new Flow({
                namespace: 'test'
                // No credentialManager!
            });
            
            const node = flow.addNode(TestAPINode, {
                id: 'test-node',
                apiKey: '${TEST_API_KEY}'
            });
            
            flow.setEntryNode(node);
            await flow.run({});
            
            const result = flow.backpack.unpack('apiKeyUsed-test-node', 'test-node');
            expect(result).toBe('env-key-789');
        });
        
        it('should work with direct values', async () => {
            const flow = new Flow({
                namespace: 'test'
            });
            
            const node = flow.addNode(TestAPINode, {
                id: 'test-node',
                apiKey: 'direct-key-456'
            });
            
            flow.setEntryNode(node);
            await flow.run({});
            
            const result = flow.backpack.unpack('apiKeyUsed-test-node', 'test-node');
            expect(result).toBe('direct-key-456');
        });
    });
    
    describe('Multiple Nodes Sharing Credentials', () => {
        it('should allow multiple nodes to use same credential', async () => {
            await credentialManager.add({
                id: 'shared-api',
                name: 'Shared API',
                type: 'apiKey',
                data: { apiKey: 'shared-key-999012345678901234567890123456789' }
            });
            
            const flow = new Flow({
                namespace: 'test',
                credentialManager
            });
            
            const node1 = flow.addNode(TestAPINode, {
                id: 'node-1',
                apiKey: '@cred:shared-api'
            });
            
            const node2 = flow.addNode(TestAPINode, {
                id: 'node-2',
                apiKey: '@cred:shared-api'
            });
            
            node1.onComplete(node2);
            flow.setEntryNode(node1);
            
            await flow.run({});
            
            const result1 = flow.backpack.unpack('apiKeyUsed-node-1', 'node-1');
            const result2 = flow.backpack.unpack('apiKeyUsed-node-2', 'node-2');
            
            expect(result1).toBe('shared-key-999012345678901234567890123456789');
            expect(result2).toBe('shared-key-999012345678901234567890123456789');
        });
    });
    
    describe('Error Handling', () => {
        it('should throw helpful error when credential not found', async () => {
            const flow = new Flow({
                namespace: 'test',
                credentialManager
            });
            
            const node = flow.addNode(TestAPINode, {
                id: 'test-node',
                apiKey: '@cred:non-existent'
            });
            
            flow.setEntryNode(node);
            
            await expect(flow.run({}))
                .rejects
                .toThrow("Credential '@cred:non-existent' not found");
        });
        
        it('should throw error when credentialManager required but not provided', async () => {
            const flow = new Flow({
                namespace: 'test'
                // No credentialManager
            });
            
            const node = flow.addNode(TestAPINode, {
                id: 'test-node',
                apiKey: '@cred:any-credential'
            });
            
            flow.setEntryNode(node);
            
            await expect(flow.run({}))
                .rejects
                .toThrow('requires CredentialManager');
        });
        
        it('should throw error for missing env var', async () => {
            const flow = new Flow({
                namespace: 'test'
            });
            
            const node = flow.addNode(TestAPINode, {
                id: 'test-node',
                apiKey: '${MISSING_ENV_VAR}'
            });
            
            flow.setEntryNode(node);
            
            await expect(flow.run({}))
                .rejects
                .toThrow("Environment variable 'MISSING_ENV_VAR' is not set");
        });
    });
    
    describe('Mixed Credential Sources', () => {
        it('should support mixing direct, env, and managed credentials', async () => {
            process.env.ENV_KEY = 'from-env';
            
            await credentialManager.add({
                id: 'managed-key',
                name: 'Managed',
                type: 'apiKey',
                data: { apiKey: 'from-manager123456789012345678901234567890' }
            });
            
            const flow = new Flow({
                namespace: 'test',
                credentialManager
            });
            
            const node1 = flow.addNode(TestAPINode, {
                id: 'direct',
                apiKey: 'direct-value'
            });
            
            const node2 = flow.addNode(TestAPINode, {
                id: 'env',
                apiKey: '${ENV_KEY}'
            });
            
            const node3 = flow.addNode(TestAPINode, {
                id: 'managed',
                apiKey: '@cred:managed-key'
            });
            
            node1.onComplete(node2);
            node2.onComplete(node3);
            flow.setEntryNode(node1);
            
            await flow.run({});
            
            expect(flow.backpack.unpack('apiKeyUsed-direct', 'direct')).toBe('direct-value');
            expect(flow.backpack.unpack('apiKeyUsed-env', 'env')).toBe('from-env');
            expect(flow.backpack.unpack('apiKeyUsed-managed', 'managed')).toBe('from-manager123456789012345678901234567890');
        });
    });
});
