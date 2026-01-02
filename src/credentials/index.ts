/**
 * Credential Management System
 * 
 * Central export for credential-related functionality
 */

// Core exports
export { CredentialManager } from './credential-manager';
export { CredentialResolver } from './credential-resolver';

// Types
export type {
    Credential,
    CredentialField,
    CredentialType,
    CredentialStorage,
    CredentialResolutionResult,
    CredentialManagerOptions
} from './types';

// Errors
export {
    CredentialValidationError,
    CredentialNotFoundError,
    CredentialTypeMismatchError
} from './types';

// Built-in credential types
export {
    API_KEY_CREDENTIAL,
    YOUTUBE_API_CREDENTIAL,
    OPENAI_API_CREDENTIAL,
    HTTP_BASIC_AUTH_CREDENTIAL,
    BEARER_TOKEN_CREDENTIAL,
    TWITTER_API_CREDENTIAL,
    BUILT_IN_CREDENTIAL_TYPES,
    getCredentialType,
    getCredentialTypesByCategory
} from './credential-types';
