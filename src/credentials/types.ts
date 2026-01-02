/**
 * Credential Types & Interfaces
 * 
 * Defines the structure for credential management system.
 */

/**
 * Credential - Stored credential with encrypted data
 */
export interface Credential {
    id: string;                    // Unique identifier (e.g., 'youtube-api-prod')
    name: string;                  // Human-readable name (e.g., 'Production YouTube API')
    type: string;                  // Credential type ID (e.g., 'youtubeApi')
    data: Record<string, any>;     // Actual credential data (encrypted at rest)
    createdAt: Date;
    updatedAt: Date;
    lastUsed?: Date;
}

/**
 * Credential Field Definition
 * 
 * Defines a single field in a credential type
 */
export interface CredentialField {
    name: string;                  // Field name (e.g., 'apiKey')
    type: 'string' | 'password' | 'url' | 'email';
    required: boolean;
    placeholder?: string;
    description?: string;
    validation?: {
        minLength?: number;
        maxLength?: number;
        pattern?: string;          // Regex pattern
    };
}

/**
 * Credential Type Definition
 * 
 * Defines the structure and requirements for a credential type
 */
export interface CredentialType {
    id: string;                    // Unique type ID (e.g., 'youtubeApi')
    name: string;                  // Display name (e.g., 'YouTube API')
    description?: string;
    icon?: string;                 // Emoji or icon identifier
    fields: CredentialField[];
    documentationUrl?: string;
    category?: 'api' | 'database' | 'auth' | 'other';
}

/**
 * Credential Storage Format (Encrypted)
 * 
 * Format for storing credentials on disk
 */
export interface CredentialStorage {
    version: string;               // Storage format version
    encryptionMethod: string;      // e.g., 'aes-256-gcm'
    credentials: Array<{
        id: string;
        name: string;
        type: string;
        data: string;              // Encrypted data (base64)
        iv: string;                // Initialization vector (base64)
        authTag: string;           // Authentication tag (base64)
        createdAt: string;
        updatedAt: string;
        lastUsed?: string;
    }>;
}

/**
 * Credential Resolution Result
 */
export interface CredentialResolutionResult {
    value: string;
    source: 'direct' | 'env' | 'managed';
    credentialId?: string;
}

/**
 * Credential Manager Options
 */
export interface CredentialManagerOptions {
    storageDir?: string;           // Directory for credential storage
    masterKey?: string;            // Master encryption key
    autoSave?: boolean;            // Auto-save after changes (default: true)
}

/**
 * Credential Validation Error
 */
export class CredentialValidationError extends Error {
    constructor(
        message: string,
        public field: string,
        public credentialType: string
    ) {
        super(message);
        this.name = 'CredentialValidationError';
    }
}

/**
 * Credential Not Found Error
 */
export class CredentialNotFoundError extends Error {
    constructor(
        public credentialId: string,
        suggestions?: string[]
    ) {
        super(
            `Credential '@cred:${credentialId}' not found.\n\n` +
            `Please add it via:\n` +
            `  1. Studio: http://localhost:3000/studio/credentials\n` +
            `  2. Environment variable\n` +
            `  3. Direct value in config\n` +
            (suggestions ? `\nAvailable credentials:\n${suggestions.map(s => `  - ${s}`).join('\n')}` : '')
        );
        this.name = 'CredentialNotFoundError';
    }
}

/**
 * Credential Type Mismatch Error
 */
export class CredentialTypeMismatchError extends Error {
    constructor(
        public credentialId: string,
        public expectedType: string,
        public actualType: string
    ) {
        super(
            `Credential '@cred:${credentialId}' is type '${actualType}', ` +
            `but node requires '${expectedType}'.\n\n` +
            `Please create a ${expectedType} credential.`
        );
        this.name = 'CredentialTypeMismatchError';
    }
}
