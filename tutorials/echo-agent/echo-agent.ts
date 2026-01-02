/**
 * Echo Agent - Simple test agent (no API keys required)
 * 
 * Just echoes back what you say with some fun formatting.
 * Perfect for testing Studio without needing API keys!
 */

import { BackpackNode } from '../../src/nodes/backpack-node';

export class EchoAgentNode extends BackpackNode {
    static namespaceSegment = "echo-agent";

    async prep(shared: any): Promise<any> {
        // Read user input from metadata.json's inputKey
        const userMessage = this.unpackRequired<string>('message');
        
        console.log(`[Echo Agent] Received: "${userMessage}"`);
        
        return { userMessage };
    }

    async _exec(input: { userMessage: string }): Promise<any> {
        // Create a fun echo response
        const echo = this.createEchoResponse(input.userMessage);
        
        // Pack response to metadata.json's outputKey
        this.backpack.pack('response', echo, {
            nodeId: this.id,
            nodeName: 'Echo Agent',
            tags: ['echo', 'test']
        });
        
        console.log(`[Echo Agent] Responded with ${echo.length} characters`);
        
        return { success: true };
    }

    private createEchoResponse(message: string): string {
        const wordCount = message.split(' ').length;
        const charCount = message.length;
        
        return `## 🔊 Echo Response

You said: **"${message}"**

### 📊 Analysis
- **Words**: ${wordCount}
- **Characters**: ${charCount}
- **Uppercase**: ${(message.match(/[A-Z]/g) || []).length}
- **Lowercase**: ${(message.match(/[a-z]/g) || []).length}
- **Numbers**: ${(message.match(/[0-9]/g) || []).length}

### 🔄 Reversed
${message.split('').reverse().join('')}

### 📣 SHOUTED
${message.toUpperCase()}

### 🤫 whispered
${message.toLowerCase()}

---

*This is a test agent to verify Studio is working! 🎉*
`;
    }
}

// Export for registry
export { EchoAgentNode };
