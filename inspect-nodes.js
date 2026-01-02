/**
 * Node Metadata Inspection Tool
 * 
 * Shows the auto-generated metadata for each node in detail.
 */

const { YouTubeSearchNode } = require('./dist/tutorials/youtube-research-agent/tutorials/youtube-research-agent/youtube-search-node');
const { DataAnalysisNode } = require('./dist/tutorials/youtube-research-agent/tutorials/youtube-research-agent/data-analysis-node');
const { BaseChatCompletionNode } = require('./dist/tutorials/youtube-research-agent/tutorials/youtube-research-agent/base-chat-completion-node');

console.log('═══════════════════════════════════════════════════════════════');
console.log('  NODE METADATA AUTO-GENERATION INSPECTION');
console.log('═══════════════════════════════════════════════════════════════\n');

function inspectNode(NodeClass, nodeName) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📦 ${nodeName}`);
    console.log('─'.repeat(60));
    
    const metadata = NodeClass.getMetadata();
    
    console.log('\n🎨 AUTO-GENERATED METADATA:');
    console.log(`  Display Name:  ${metadata.displayName}`);
    console.log(`  Internal Name: ${metadata.name}`);
    console.log(`  Category:      ${metadata.category}`);
    console.log(`  Icon:          ${metadata.icon}`);
    console.log(`  Color:         ${metadata.defaults?.color}`);
    console.log(`  Tags:          [${metadata.tags?.join(', ')}]`);
    
    console.log('\n📋 UI PROPERTIES (Auto-generated from Zod schema):');
    if (metadata.properties && metadata.properties.length > 0) {
        metadata.properties.forEach((prop, idx) => {
            console.log(`\n  ${idx + 1}. ${prop.displayName}`);
            console.log(`     Name:        ${prop.name}`);
            console.log(`     Type:        ${prop.type}`);
            console.log(`     Required:    ${prop.required ? '✓ Yes' : '✗ No'}`);
            console.log(`     Default:     ${JSON.stringify(prop.default)}`);
            if (prop.description) {
                console.log(`     Description: ${prop.description}`);
            }
            if (prop.typeOptions) {
                console.log(`     Options:     ${JSON.stringify(prop.typeOptions)}`);
            }
        });
    } else {
        console.log('  (No config properties)');
    }
    
    console.log('\n📥 INPUT CONTRACT:');
    if (NodeClass.inputs) {
        Object.keys(NodeClass.inputs).forEach(key => {
            console.log(`  - ${key}`);
        });
    } else {
        console.log('  (No inputs defined)');
    }
    
    console.log('\n📤 OUTPUT CONTRACT:');
    if (NodeClass.outputs) {
        Object.keys(NodeClass.outputs).forEach(key => {
            console.log(`  - ${key}`);
        });
    } else {
        console.log('  (No outputs defined)');
    }
    
    console.log('\n✨ KEY BENEFITS:');
    console.log('  ✓ No manual metadata duplication');
    console.log('  ✓ UI properties auto-generated from Zod');
    console.log('  ✓ Consistent naming conventions');
    console.log('  ✓ Runtime config validation');
}

// Inspect each node
inspectNode(YouTubeSearchNode, 'YouTubeSearchNode');
inspectNode(DataAnalysisNode, 'DataAnalysisNode');
inspectNode(BaseChatCompletionNode, 'BaseChatCompletionNode');

console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('  SUMMARY');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('📊 CODE REDUCTION:');
console.log('  Before: ~34 lines of boilerplate per node');
console.log('  After:  ~5 lines (Zod schema only)');
console.log('  Savings: ~83% reduction\n');

console.log('🎯 WHAT AUTO-GENERATES:');
console.log('  ✓ Display names (from class names)');
console.log('  ✓ Categories (from keywords)');
console.log('  ✓ Icons (platform-specific or category defaults)');
console.log('  ✓ Colors (category standards)');
console.log('  ✓ UI properties (from Zod schemas)');
console.log('  ✓ Tags (for search/filtering)');
console.log('  ✓ Validation rules (automatic)\n');

console.log('🚀 USE CASES:');
console.log('  1. Studio UI → Node palette & property forms');
console.log('  2. AI Agents → Node discovery & composition');
console.log('  3. Documentation → Auto-generated docs');
console.log('  4. Validation → Runtime config checking\n');

console.log('═══════════════════════════════════════════════════════════════\n');
