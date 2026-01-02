/**
 * Built-in Credential Types
 * 
 * Standard credential type definitions for common services
 */

import { CredentialType } from './types';

/**
 * Generic API Key
 */
export const API_KEY_CREDENTIAL: CredentialType = {
    id: 'apiKey',
    name: 'API Key',
    description: 'Generic API key credential',
    icon: '🔑',
    category: 'api',
    fields: [
        {
            name: 'apiKey',
            type: 'password',
            required: true,
            placeholder: 'Enter your API key',
            description: 'API key for authentication'
        }
    ]
};

/**
 * YouTube Data API v3
 */
export const YOUTUBE_API_CREDENTIAL: CredentialType = {
    id: 'youtubeApi',
    name: 'YouTube API',
    description: 'YouTube Data API v3 credentials',
    icon: '🎥',
    category: 'api',
    fields: [
        {
            name: 'apiKey',
            type: 'password',
            required: true,
            placeholder: 'AIzaSy...',
            description: 'YouTube Data API v3 key',
            validation: {
                minLength: 30,
                pattern: '^AIza[0-9A-Za-z-_]{35}$'
            }
        }
    ],
    documentationUrl: 'https://console.cloud.google.com/apis/credentials'
};

/**
 * OpenAI API
 */
export const OPENAI_API_CREDENTIAL: CredentialType = {
    id: 'openaiApi',
    name: 'OpenAI API',
    description: 'OpenAI API credentials',
    icon: '🤖',
    category: 'api',
    fields: [
        {
            name: 'apiKey',
            type: 'password',
            required: true,
            placeholder: 'sk-...',
            description: 'OpenAI API key',
            validation: {
                pattern: '^sk-[A-Za-z0-9]{48}$'
            }
        },
        {
            name: 'organization',
            type: 'string',
            required: false,
            placeholder: 'org-...',
            description: 'OpenAI organization ID (optional)'
        }
    ],
    documentationUrl: 'https://platform.openai.com/api-keys'
};

/**
 * HTTP Basic Auth
 */
export const HTTP_BASIC_AUTH_CREDENTIAL: CredentialType = {
    id: 'httpBasicAuth',
    name: 'HTTP Basic Auth',
    description: 'HTTP Basic Authentication (username/password)',
    icon: '🔐',
    category: 'auth',
    fields: [
        {
            name: 'username',
            type: 'string',
            required: true,
            placeholder: 'Enter username',
            description: 'Username for authentication'
        },
        {
            name: 'password',
            type: 'password',
            required: true,
            placeholder: 'Enter password',
            description: 'Password for authentication'
        }
    ]
};

/**
 * Bearer Token
 */
export const BEARER_TOKEN_CREDENTIAL: CredentialType = {
    id: 'bearerToken',
    name: 'Bearer Token',
    description: 'Bearer token for API authentication',
    icon: '🎫',
    category: 'auth',
    fields: [
        {
            name: 'token',
            type: 'password',
            required: true,
            placeholder: 'Enter bearer token',
            description: 'Bearer token for Authorization header'
        }
    ]
};

/**
 * Twitter API (OAuth 2.0)
 */
export const TWITTER_API_CREDENTIAL: CredentialType = {
    id: 'twitterApi',
    name: 'Twitter API',
    description: 'Twitter API v2 credentials',
    icon: '🐦',
    category: 'api',
    fields: [
        {
            name: 'bearerToken',
            type: 'password',
            required: true,
            placeholder: 'AAAA...',
            description: 'Twitter API v2 Bearer Token'
        }
    ],
    documentationUrl: 'https://developer.twitter.com/en/portal/dashboard'
};

/**
 * Registry of all built-in credential types
 */
export const BUILT_IN_CREDENTIAL_TYPES: CredentialType[] = [
    API_KEY_CREDENTIAL,
    YOUTUBE_API_CREDENTIAL,
    OPENAI_API_CREDENTIAL,
    HTTP_BASIC_AUTH_CREDENTIAL,
    BEARER_TOKEN_CREDENTIAL,
    TWITTER_API_CREDENTIAL
];

/**
 * Get credential type by ID
 */
export function getCredentialType(typeId: string): CredentialType | undefined {
    return BUILT_IN_CREDENTIAL_TYPES.find(t => t.id === typeId);
}

/**
 * Get all credential types by category
 */
export function getCredentialTypesByCategory(category: string): CredentialType[] {
    return BUILT_IN_CREDENTIAL_TYPES.filter(t => t.category === category);
}
