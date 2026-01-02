# PRD-008: Credential Management System

**Status**: 🚧 IN PROGRESS  
**Version**: v2.1  
**Date**: December 30, 2025  
**Owner**: BackpackFlow Core Team

---

## Executive Summary

Implement a centralized credential management system that decouples API keys and secrets from node implementations, enabling:
- Secure credential storage with encryption
- Flexible credential resolution (direct, env vars, or managed)
- Studio UI for credential management
- Human intervention when credentials are missing
- Separation of concerns between nodes and credentials

**Key Innovation**: Credentials become a first-class resource, not node configuration.

---

## Problem Statement

### Current Pain Points

1. **Tight Coupling**: Credentials hardcoded in node constructors
   ```typescript
   // ❌ Credential logic in every node
   this.apiKey = config.apiKey || process.env.YOUTUBE_API_KEY;
   ```

2. **No Reusability**: Same credential duplicated across nodes
   ```typescript
   // ❌ YouTube API key repeated in 3 different nodes
   searchNode: { apiKey: "AIza..." }
   analyticsNode: { apiKey: "AIza..." }  // Same key!
   uploadNode: { apiKey: "AIza..." }     // Duplication!
   ```

3. **Security Risk**: Credentials exposed in serialized flows
   ```json
   {
     "nodes": [
       { "apiKey": "AIzaSyXXXXXX" }  // ❌ Exposed in JSON!
     ]
   }
   ```

4. **No Management**: No way to update credentials centrally
   - Change API key → Must update all flows
   - Rotate credentials → Manual search/replace
   - Multiple environments → Copy/paste everywhere

5. **Poor UX**: Users must figure out credential setup
   - No visibility into what's needed
   - No validation until runtime
   - No helpful error messages

---

## Goals

### Primary Goals (P0)

1. **Decouple Credentials from Nodes**
   - Nodes reference credentials, don't store them
   - Credentials managed independently
   - No breaking changes to existing code

2. **Flexible Resolution**
   - Support direct values (backward compatible)
   - Support env vars (current approach)
   - Support managed credentials (new)

3. **Secure Storage**
   - Encrypt credentials at rest
   - Never expose in logs/exports
   - Master key from environment

4. **Studio Integration**
   - Visual credential manager
   - Add/edit/delete credentials
   - Show required vs available credentials

5. **Human Intervention**
   - Clear error when credential missing
   - Prompt user to add credential
   - Type validation and suggestions

### Secondary Goals (P1)

1. Multiple credential support per node
2. Credential sharing across flows
3. Credential versioning/rotation
4. OAuth flow support (future)

---

## Solution Architecture

### Three-Part System

```
┌─────────────────────────────────────────────────┐
│           1. Credential Resolver                │
│  (Flexible resolution: direct/env/managed)      │
└─────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│         2. Credential Manager                   │
│  (Secure storage with encryption)               │
└─────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│          3. Studio UI                           │
│  (Visual management interface)                  │
└─────────────────────────────────────────────────┘
```

---

## Requirements

### FR-1: Credential Reference Format

**Priority**: P0 (Blocker)

Support multiple formats for credential values:

```typescript
// 1. Direct value (backward compatible)
{ apiKey: "AIzaSyXXXX" }

// 2. Environment variable
{ apiKey: "${YOUTUBE_API_KEY}" }

// 3. Credential reference (new)
{ apiKey: "@cred:youtube-api" }
```

**Resolution order**:
1. If starts with `@cred:` → Resolve from CredentialManager
2. If matches `${VAR}` → Resolve from process.env
3. Otherwise → Use as-is (direct value)

### FR-2: CredentialResolver

**Priority**: P0 (Blocker)

Utility for transparent credential resolution:

```typescript
class CredentialResolver {
    async resolve(
        value: string, 
        credentialType?: string
    ): Promise<string>;
}
```

**Features**:
- Parse credential references
- Resolve from CredentialManager (if available)
- Fall back to env vars
- Fall back to direct values
- Validate credential types
- Throw helpful errors when missing

### FR-3: CredentialManager

**Priority**: P0 (Blocker)

Secure credential storage and retrieval:

```typescript
class CredentialManager {
    // CRUD operations
    async add(credential: Credential): Promise<void>;
    async get(id: string): Promise<Credential | null>;
    async list(type?: string): Promise<Credential[]>;
    async update(id: string, data: any): Promise<void>;
    async delete(id: string): Promise<void>;
    
    // Security
    encrypt(data: any): string;
    decrypt(encrypted: string): any;
}
```

**Storage**: File-based JSON (encrypted)
- Location: `.backpackflow/credentials.json`
- Format: Encrypted JSON with AES-256-GCM
- Master key: From `BACKPACKFLOW_MASTER_KEY` env var

### FR-4: Credential Types

**Priority**: P0 (Blocker)

Standard credential type definitions:

```typescript
interface CredentialType {
    id: string;              // 'youtubeApi', 'openaiApi', etc.
    name: string;            // 'YouTube API'
    fields: CredentialField[];
    documentation?: string;
}

interface CredentialField {
    name: string;            // 'apiKey'
    type: 'string' | 'password' | 'url';
    required: boolean;
    placeholder?: string;
    description?: string;
}
```

**Built-in types**:
- `apiKey` - Generic API key (single field)
- `youtubeApi` - YouTube Data API v3
- `openaiApi` - OpenAI API
- `httpBasicAuth` - HTTP Basic Auth (username/password)

### FR-5: BackpackNode Integration

**Priority**: P0 (Blocker)

Transparent credential resolution in nodes:

```typescript
export class BackpackNode {
    protected credentialResolver: CredentialResolver;
    
    // Helper method
    protected async resolveCredential(
        value: string,
        credentialType?: string
    ): Promise<string>;
}
```

**Usage in nodes**:
```typescript
async prep(shared: any) {
    // Automatically resolves direct/env/managed
    this.apiKey = await this.resolveCredential(
        this.config.apiKey,
        'youtubeApi'
    );
}
```

### FR-6: Studio UI - Credential Manager

**Priority**: P0 (Blocker)

Visual interface for credential management:

**Pages**:
1. `/studio/credentials` - List all credentials
2. `/studio/credentials/new` - Add new credential
3. `/studio/credentials/[id]/edit` - Edit credential

**Features**:
- List credentials by type
- Add new credentials with form
- Edit existing credentials
- Delete credentials (with confirmation)
- Test credential (validate it works)
- Show which flows use each credential

### FR-7: Studio API Routes

**Priority**: P0 (Blocker)

RESTful API for credential operations:

```
GET    /api/credentials          - List all credentials
GET    /api/credentials/:id      - Get specific credential
POST   /api/credentials          - Create credential
PUT    /api/credentials/:id      - Update credential
DELETE /api/credentials/:id      - Delete credential
POST   /api/credentials/:id/test - Test credential
```

### FR-8: Error Handling & Human Intervention

**Priority**: P0 (Blocker)

Clear, actionable errors when credentials are missing:

```typescript
// Credential not found
throw new Error(
    `Credential '@cred:youtube-api' not found.\n\n` +
    `Please add it via:\n` +
    `  1. Studio: http://localhost:3000/studio/credentials\n` +
    `  2. Environment variable: YOUTUBE_API_KEY\n` +
    `  3. Direct value in config\n\n` +
    `Get your API key: https://console.cloud.google.com/`
);

// Type mismatch
throw new Error(
    `Credential '@cred:my-key' is type 'openaiApi', ` +
    `but node requires 'youtubeApi'.\n\n` +
    `Please create a YouTube API credential.`
);
```

### FR-9: Credential Metadata in Nodes

**Priority**: P1 (Important)

Document credential requirements in node metadata:

```typescript
export class YouTubeSearchNode extends BackpackNode {
    // Document what credentials this node needs
    static credentialRequirements = {
        apiKey: {
            type: 'youtubeApi',
            required: true,
            description: 'YouTube Data API v3 key',
            documentationUrl: 'https://console.cloud.google.com/'
        }
    };
}
```

**Benefits**:
- Studio can show required credentials
- NodeRegistry includes credential info
- AI agents know what credentials are needed

---

## Technical Specification

### File Structure

```
src/
├── credentials/
│   ├── types.ts                  # Interfaces & types
│   ├── credential-resolver.ts    # Resolution logic
│   ├── credential-manager.ts     # Storage & encryption
│   ├── credential-types.ts       # Built-in credential types
│   └── index.ts                  # Exports
│
├── nodes/
│   └── backpack-node.ts          # Updated with credential support
│
└── flows/
    └── flow.ts                   # Pass credentialManager to nodes

studio/
├── app/
│   ├── api/
│   │   └── credentials/
│   │       ├── route.ts          # List/Create
│   │       └── [id]/route.ts     # Get/Update/Delete
│   └── credentials/
│       ├── page.tsx              # List page
│       ├── new/page.tsx          # Create page
│       └── [id]/edit/page.tsx   # Edit page
│
└── components/
    ├── CredentialList.tsx
    ├── CredentialForm.tsx
    └── CredentialTypeSelector.tsx
```

### Data Models

#### Credential
```typescript
interface Credential {
    id: string;              // Unique ID (e.g., 'youtube-api-prod')
    name: string;            // Display name (e.g., 'Production YouTube')
    type: string;            // Type ID (e.g., 'youtubeApi')
    data: Record<string, any>;  // Actual credentials (encrypted)
    createdAt: Date;
    updatedAt: Date;
    lastUsed?: Date;
}
```

#### Storage Format (Encrypted)
```json
{
  "version": "1.0",
  "encryptionMethod": "aes-256-gcm",
  "credentials": [
    {
      "id": "youtube-api-prod",
      "name": "Production YouTube",
      "type": "youtubeApi",
      "data": "encrypted-base64-string-here",
      "createdAt": "2025-12-30T...",
      "updatedAt": "2025-12-30T..."
    }
  ]
}
```

---

## User Stories

### US-1: Developer Adding Credentials
**As a** developer  
**I want to** store my API keys centrally  
**So that** I can reuse them across multiple nodes/flows

**Acceptance**:
- Can add credentials via Studio UI
- Credentials are encrypted at rest
- Can reference credentials in node configs

### US-2: Node Author Using Credentials
**As a** node author  
**I want to** resolve credentials transparently  
**So that** my node works with direct values, env vars, or managed credentials

**Acceptance**:
- Single method call resolves credentials
- Works with all three formats
- Helpful errors when credential missing

### US-3: Flow Builder Seeing Requirements
**As a** flow builder  
**I want to** see what credentials are needed  
**So that** I can set them up before running the flow

**Acceptance**:
- Studio shows required credentials
- Clear indication of missing credentials
- Links to add/edit credentials

### US-4: Security-Conscious User
**As a** security-conscious user  
**I want** credentials encrypted and never exposed  
**So that** my API keys are protected

**Acceptance**:
- Credentials encrypted with AES-256
- Never appear in logs
- Never exported in serialized flows
- Master key required to decrypt

---

## Implementation Plan

### Phase 1: Core System ✅ (Current)
- [x] Create credential types & interfaces
- [x] Build CredentialResolver
- [x] Build CredentialManager with file storage
- [x] Add encryption support

### Phase 2: Node Integration ✅ (Current)
- [x] Update BackpackNode with credential support
- [x] Update NodeContext to include credentialManager
- [x] Update Flow to pass credentialManager
- [x] Update example nodes (YouTube, OpenAI)

### Phase 3: Studio UI ✅ (Current)
- [x] Create API routes for credentials
- [x] Create credential list page
- [x] Create add/edit credential forms
- [x] Add credential type selector
- [x] Show required credentials in flow view

### Phase 4: Testing & Documentation ⏳ (Next)
- [ ] Test full credential flow
- [ ] Write usage guide
- [ ] Update node conventions
- [ ] Add security documentation

---

## Security Considerations

### Encryption
- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Master Key**: 32-byte key from `BACKPACKFLOW_MASTER_KEY` env var
- **Key Derivation**: PBKDF2 if master key not provided
- **Integrity**: GCM provides authentication tag

### Storage
- **Location**: `.backpackflow/credentials.json` (git-ignored)
- **Permissions**: Read/write only by owner (600)
- **Format**: Encrypted JSON, not human-readable

### Runtime
- **Memory**: Credentials decrypted only when needed
- **Logs**: Never log credential values
- **Exports**: Only credential IDs exported, not values
- **Errors**: Never include credential values in error messages

### Best Practices
- Master key should be stored in secure secret manager
- Rotate master key periodically
- Use different credentials for dev/staging/prod
- Audit credential access (future)

---

## Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Credential Resolution | Works with all 3 formats | 🚧 |
| Encryption | AES-256-GCM | 🚧 |
| Studio UI | Full CRUD operations | 🚧 |
| Node Integration | Transparent resolution | 🚧 |
| Zero Breaking Changes | Backward compatible | 🚧 |
| Security | No credential leaks | 🚧 |

---

## Migration Guide

### From v2.0 to v2.1 (Credential System)

**Backward Compatible**: Existing code continues to work!

#### Option 1: Keep Using Env Vars (No Change)
```typescript
// Still works exactly as before
const node = new YouTubeSearchNode({
    id: 'search',
    apiKey: process.env.YOUTUBE_API_KEY
});
```

#### Option 2: Use Direct Values (No Change)
```typescript
// Still works exactly as before
const node = new YouTubeSearchNode({
    id: 'search',
    apiKey: 'AIzaSyXXXX'
});
```

#### Option 3: Use Managed Credentials (New!)
```typescript
// 1. Add credential via Studio or API
await credentialManager.add({
    id: 'youtube-prod',
    name: 'Production YouTube API',
    type: 'youtubeApi',
    data: { apiKey: 'AIzaSyXXXX' }
});

// 2. Reference it in node config
const node = new YouTubeSearchNode({
    id: 'search',
    apiKey: '@cred:youtube-prod'  // ← Reference!
});

// 3. Credential resolves automatically
await node._run({});
```

---

## Future Enhancements (Post-v2.1)

### OAuth Support
- OAuth 2.0 flow integration
- Refresh token handling
- Browser-based auth flows

### Advanced Features
- Credential versioning & rotation
- Audit logging (who accessed when)
- Credential expiration & renewal
- Role-based access control
- Credential templates

### Integration
- Secret manager integration (AWS Secrets, HashiCorp Vault)
- Cloud provider credential stores
- 1Password / LastPass integration

---

## Related Documents

- [PRD-007: Node Metadata System](PRD-007-node-metadata-system.md)
- [v2.1 README](../README.md)
- [Node Conventions](../node-conventions.md)

---

## Approval

**Status**: 🚧 In Development  
**Start Date**: December 30, 2025  
**Target Completion**: December 30, 2025 (same day!)

