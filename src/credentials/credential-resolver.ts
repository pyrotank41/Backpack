/**
 * Credential Resolver
 * 
 * Resolves credential values from multiple sources:
 * 1. Direct values (backward compatible)
 * 2. Environment variables (${VAR})
 * 3. Managed credentials (@cred:id)
 */

import { CredentialNotFoundError, CredentialTypeMismatchError } from './types';
import type { CredentialManager } from './credential-manager';

export class CredentialResolver {
    constructor(private credentialManager?: CredentialManager) {}
    
    /**
     * Resolve a credential value from any source
     * 
     * @param value - Can be:
     *   - Direct string: "AIzaSy..."
     *   - Env var reference: "${YOUTUBE_API_KEY}"
     *   - Credential reference: "@cred:youtube-api"
     * @param credentialType - Expected credential type (optional)
     * @returns Resolved credential value
     * 
     * @example
     * ```typescript
     * // Direct value
     * await resolver.resolve("AIzaSyXXX") // Returns "AIzaSyXXX"
     * 
     * // Env var
     * await resolver.resolve("${YOUTUBE_API_KEY}") // Returns process.env.YOUTUBE_API_KEY
     * 
     * // Managed credential
     * await resolver.resolve("@cred:youtube-prod", "youtubeApi") // Resolves from manager
     * ```
     */
    async resolve(value: string, credentialType?: string): Promise<string> {
        if (!value) {
            throw new Error('Credential value cannot be empty');
        }
        
        // 1. Check if it's a credential reference (@cred:xxx)
        if (value.startsWith('@cred:')) {
            return await this.resolveFromManager(value, credentialType);
        }
        
        // 2. Check if it's env var reference (${VAR})
        if (value.startsWith('${') && value.endsWith('}')) {
            return this.resolveFromEnv(value);
        }
        
        // 3. Use as-is (direct value)
        return value;
    }
    
    /**
     * Resolve credential from CredentialManager
     */
    private async resolveFromManager(
        reference: string,
        expectedType?: string
    ): Promise<string> {
        if (!this.credentialManager) {
            throw new Error(
                `Credential reference '${reference}' requires CredentialManager.\n\n` +
                `To use managed credentials:\n` +
                `  1. Initialize CredentialManager in your flow context\n` +
                `  2. Or use environment variables: \${VAR}\n` +
                `  3. Or use direct values in config`
            );
        }
        
        // Extract credential ID
        const credId = reference.slice(6); // Remove "@cred:"
        
        // Fetch credential
        const credential = await this.credentialManager.get(credId);
        
        if (!credential) {
            // Get suggestions for helpful error
            const all = await this.credentialManager.list();
            const suggestions = all.map(c => `@cred:${c.id} (${c.name})`);
            
            throw new CredentialNotFoundError(credId, suggestions);
        }
        
        // Validate type if specified
        if (expectedType && credential.type !== expectedType) {
            throw new CredentialTypeMismatchError(
                credId,
                expectedType,
                credential.type
            );
        }
        
        // Update last used timestamp
        try {
            await this.credentialManager.updateLastUsed(credId);
        } catch (err) {
            // Non-critical, just log
            console.warn(`Failed to update last used for credential ${credId}:`, err);
        }
        
        // Extract the actual credential value
        // Common field names: apiKey, token, bearerToken, password, etc.
        const data = credential.data;
        return data.apiKey 
            || data.token 
            || data.bearerToken 
            || data.password
            || data.value
            || Object.values(data)[0] as string;
    }
    
    /**
     * Resolve credential from environment variable
     */
    private resolveFromEnv(reference: string): string {
        // Extract variable name from ${VAR}
        const varName = reference.slice(2, -1);
        
        const value = process.env[varName];
        
        if (!value) {
            throw new Error(
                `Environment variable '${varName}' is not set.\n\n` +
                `To fix:\n` +
                `  1. Set the environment variable: export ${varName}=...\n` +
                `  2. Add to .env file: ${varName}=...\n` +
                `  3. Or use a credential reference: @cred:xxx\n` +
                `  4. Or use a direct value in config`
            );
        }
        
        return value;
    }
    
    /**
     * Check if a value is a credential reference
     */
    isCredentialReference(value: string): boolean {
        return value.startsWith('@cred:');
    }
    
    /**
     * Check if a value is an environment variable reference
     */
    isEnvVarReference(value: string): boolean {
        return value.startsWith('${') && value.endsWith('}');
    }
    
    /**
     * Extract credential ID from reference
     */
    extractCredentialId(reference: string): string | null {
        if (!this.isCredentialReference(reference)) {
            return null;
        }
        return reference.slice(6);
    }
    
    /**
     * Extract env var name from reference
     */
    extractEnvVarName(reference: string): string | null {
        if (!this.isEnvVarReference(reference)) {
            return null;
        }
        return reference.slice(2, -1);
    }
}
