#!/usr/bin/env ts-node
/**
 * BackpackFlow v2.0 - Research Agent Tutorial
 * 
 * This tutorial demonstrates the new v2.0 features:
 * - BackpackNode with automatic metadata injection
 * - Flow with namespace composition
 * - Backpack for state management with history
 * - Multi-node workflows with proper tracing
 * 
 * Run with: npm run tutorial:research-agent
 * Or: npx ts-node tutorials/v2.0-research-agent.ts "your research query"
 */

import { BackpackNode, NodeConfig, NodeContext } from '../src/nodes/backpack-node';
import { Flow } from '../src/flows/flow';

// ===== NODES =====

/**
 * ChatNode - Analyzes user query and decides if research is needed
 */
class ChatNode extends BackpackNode {
    static namespaceSegment = "chat";
    
    async prep(shared: any): Promise<any> {
        console.log('\n🤖 [ChatNode] Analyzing your query...');
        return shared;
    }
    
    async exec(prepRes: any): Promise<any> {
        const userQuery = prepRes.query;
        this.pack('userQuery', userQuery);
        
        // Simple logic: if query contains certain keywords, do research
        const needsResearch = /search|find|research|learn|what is|how to/i.test(userQuery);
        
        this.pack('analysis', {
            query: userQuery,
            needsResearch,
            confidence: needsResearch ? 0.9 : 0.3
        });
        
        console.log(`   📊 Analysis: ${needsResearch ? 'Research needed' : 'Direct answer possible'}`);
        console.log(`   🎯 Confidence: ${needsResearch ? '90%' : '30%'}`);
        
        return { needsResearch };
    }
    
    async post(shared: any, prepRes: any, execRes: any): Promise<string | undefined> {
        return execRes.needsResearch ? 'needs_research' : 'direct_answer';
    }
}

/**
 * ResearchNode - Simulates web research (in real app, would call APIs)
 */
class ResearchNode extends BackpackNode {
    static namespaceSegment = "research";
    
    async prep(shared: any): Promise<any> {
        console.log('\n🔍 [ResearchNode] Conducting research...');
        return shared;
    }
    
    async exec(prepRes: any): Promise<any> {
        const query = this.unpack('userQuery');
        
        // Simulate research delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Simulate research results
        const results = [
            {
                title: `Understanding: ${query}`,
                snippet: `This is a comprehensive overview of ${query}. Key points include...`,
                source: 'https://example.com/resource1'
            },
            {
                title: `Deep Dive: ${query}`,
                snippet: `Advanced concepts and best practices for ${query}...`,
                source: 'https://example.com/resource2'
            },
            {
                title: `${query} - Latest Updates`,
                snippet: `Recent developments and trends in ${query}...`,
                source: 'https://example.com/resource3'
            }
        ];
        
        this.pack('researchResults', results);
        
        console.log(`   ✅ Found ${results.length} relevant sources`);
        results.forEach((r, i) => {
            console.log(`   ${i + 1}. ${r.title}`);
        });
        
        return { resultsCount: results.length };
    }
    
    async post(shared: any, prepRes: any, execRes: any): Promise<string | undefined> {
        return 'summarize';
    }
}

/**
 * SummaryNode - Creates final summary from research
 */
class SummaryNode extends BackpackNode {
    static namespaceSegment = "summary";
    
    async prep(shared: any): Promise<any> {
        console.log('\n📝 [SummaryNode] Synthesizing findings...');
        return shared;
    }
    
    async exec(prepRes: any): Promise<any> {
        const query = this.unpack('userQuery');
        const results = this.unpack<any[]>('researchResults') || [];
        const analysis = this.unpack<any>('analysis');
        
        // Create summary
        const summary = {
            query,
            sourcesAnalyzed: results.length,
            keyFindings: results.map(r => r.snippet),
            confidence: analysis?.confidence || 0.8,
            timestamp: new Date().toISOString()
        };
        
        this.pack('finalSummary', summary);
        
        console.log(`   ✨ Summary complete!`);
        console.log(`   📚 Analyzed ${summary.sourcesAnalyzed} sources`);
        
        return summary;
    }
}

/**
 * DirectAnswerNode - Handles simple queries without research
 */
class DirectAnswerNode extends BackpackNode {
    static namespaceSegment = "directAnswer";
    
    async prep(shared: any): Promise<any> {
        console.log('\n💬 [DirectAnswerNode] Generating direct response...');
        return shared;
    }
    
    async exec(prepRes: any): Promise<any> {
        const query = this.unpack('userQuery');
        
        const answer = {
            query,
            response: `Based on my knowledge, here's what I can tell you about: "${query}"...`,
            confidence: 0.7,
            timestamp: new Date().toISOString()
        };
        
        this.pack('finalAnswer', answer);
        
        console.log(`   ✅ Direct answer provided`);
        
        return answer;
    }
}

// ===== MAIN FLOW =====

async function runResearchAgent(userQuery: string) {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 BackpackFlow v2.0 - Research Agent');
    console.log('='.repeat(80));
    console.log(`\n📥 Query: "${userQuery}"\n`);
    
    // Create flow with namespace
    const flow = new Flow({ 
        namespace: 'research-agent',
        backpackOptions: {
            maxHistorySize: 1000
        }
    });
    
    // Add nodes - namespaces are automatically composed
    const chat = flow.addNode(ChatNode, { id: 'chat' });
    const research = flow.addNode(ResearchNode, { id: 'research' });
    const summary = flow.addNode(SummaryNode, { id: 'summary' });
    const directAnswer = flow.addNode(DirectAnswerNode, { id: 'direct' });
    
    // Define flow routing
    chat.on('needs_research', research);
    chat.on('direct_answer', directAnswer);
    research.on('summarize', summary);
    
    // Run the flow
    console.log('⚙️  Initializing workflow...');
    await flow.run(chat, { query: userQuery });
    
    // Display results
    console.log('\n' + '='.repeat(80));
    console.log('📊 EXECUTION SUMMARY');
    console.log('='.repeat(80));
    
    // Show final result
    const finalSummary = flow.backpack.unpack('finalSummary');
    const finalAnswer = flow.backpack.unpack('finalAnswer');
    
    if (finalSummary) {
        console.log('\n✅ Research Complete!');
        console.log(`   Query: ${finalSummary.query}`);
        console.log(`   Sources: ${finalSummary.sourcesAnalyzed}`);
        console.log(`   Confidence: ${(finalSummary.confidence * 100).toFixed(0)}%`);
    } else if (finalAnswer) {
        console.log('\n✅ Direct Answer Provided!');
        console.log(`   Query: ${finalAnswer.query}`);
        console.log(`   Confidence: ${(finalAnswer.confidence * 100).toFixed(0)}%`);
    }
    
    // Show namespace hierarchy
    console.log('\n📂 Namespace Hierarchy:');
    const namespaces = flow.backpack.getNamespaces();
    namespaces.forEach(ns => {
        console.log(`   └─ ${ns}`);
    });
    
    // Show execution trace
    console.log('\n📜 Execution Trace:');
    const history = flow.backpack.getHistory();
    const packCommits = history.filter(h => h.action === 'pack').slice(0, 10);
    packCommits.forEach((commit, i) => {
        console.log(`   ${i + 1}. [${commit.nodeName}] packed "${commit.key}" → ${commit.namespace}`);
    });
    
    // Show flow stats
    const stats = flow.getStats();
    console.log('\n📈 Flow Statistics:');
    console.log(`   Nodes: ${stats.nodeCount}`);
    console.log(`   Backpack Size: ${stats.backpackSize} items`);
    console.log(`   History: ${history.length} commits`);
    
    // Show all data in Backpack
    console.log('\n💾 Backpack Contents:');
    const allKeys = flow.backpack.keys();
    allKeys.forEach(key => {
        const item = flow.backpack.getItem(key);
        if (item) {
            console.log(`   ${key}:`);
            console.log(`      Source: ${item.metadata.sourceNodeName}`);
            console.log(`      Namespace: ${item.metadata.sourceNamespace}`);
            console.log(`      Version: ${item.metadata.version}`);
        }
    });
    
    // Demonstrate time-travel
    console.log('\n⏰ Time-Travel Demo:');
    console.log('   Taking snapshot at current state...');
    const snapshot = flow.backpack.toJSON();
    console.log(`   Snapshot captured: ${snapshot.items.length} items, ${snapshot.history.length} commits`);
    
    console.log('\n' + '='.repeat(80));
    console.log('✨ Demo complete! Check the output above to see:');
    console.log('   • Automatic namespace composition (research-agent.chat, etc.)');
    console.log('   • Metadata injection (nodeId, nodeName, namespace)');
    console.log('   • Complete execution history and tracing');
    console.log('   • State management with Backpack');
    console.log('='.repeat(80) + '\n');
    
    return flow;
}

// ===== CLI INTERFACE =====

async function main() {
    const args = process.argv.slice(2);
    const userQuery = args.length > 0 
        ? args.join(' ')
        : 'How to use BackpackFlow v2.0?';
    
    try {
        await runResearchAgent(userQuery);
    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main();
}

export { runResearchAgent };

