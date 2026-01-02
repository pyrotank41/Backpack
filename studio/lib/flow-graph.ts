/**
 * Flow Graph Utilities
 * 
 * Transforms BackpackFlow exported JSON into React Flow format.
 */

import { Node, Edge, MarkerType, Position } from '@xyflow/react';

export interface ReactFlowGraph {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Transform BackpackFlow config to React Flow format (Vertical Layout)
 */
export function transformToReactFlow(config: any, metadata?: any, nodeMetadata?: Record<string, any>): ReactFlowGraph {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const chatTrigger = metadata?.triggers?.find((t: any) => t.type === 'chat');
  const chatOutput = metadata?.outputs?.chat;

  const sourcePosition = Position.Bottom;
  const targetPosition = Position.Top;

  // 1. Add Entry Node (Trigger)
  const entryNodeId = 'trigger-node';
  nodes.push({
    id: entryNodeId,
    type: 'input',
    data: { label: chatTrigger ? `👤 ${chatTrigger.inputKey}` : '👤 User Input' },
    position: { x: 125, y: 0 },
    sourcePosition,
    targetPosition,
    style: { 
      background: 'var(--background)', 
      color: 'var(--foreground)', 
      border: '2px solid var(--border)', 
      borderRadius: '20px', 
      width: 120, 
      fontSize: '11px', 
      fontWeight: 'bold' 
    }
  });

  // 2. Add Parent Container for the main agent
  const containerY = 80;
  nodes.push({
    id: 'agent-container',
    data: { label: `📦 ${config.namespace}` },
    position: { x: 50, y: containerY },
    style: { 
      backgroundColor: 'rgba(147, 51, 234, 0.03)', 
      border: '2px dashed var(--primary)', 
      width: 300, 
      height: (config.nodes.length * 100) + 80,
      borderRadius: '12px',
      paddingTop: '30px',
      color: 'var(--primary)'
    },
  });

  // 3. Map nodes
  config.nodes.forEach((node: any, index: number) => {
    const nodeMeta = nodeMetadata?.[node.type];
    
    nodes.push({
      id: node.id,
      parentId: 'agent-container',
      data: { 
        label: getNodeLabel(node, nodeMeta),
        nodeType: node.type,
        nodeParams: node.params
      },
      position: { x: 75, y: 60 + (index * 90) },
      extent: 'parent',
      sourcePosition,
      targetPosition,
      style: getNodeStyle(node, nodeMeta),
    });
  });

  // 4. Map internal edges
  config.edges.forEach((edge: any, index: number) => {
    edges.push({
      id: `e-${edge.from}-${edge.to}-${index}`,
      source: edge.from,
      target: edge.to,
      label: edge.condition !== 'default' ? edge.condition : undefined,
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: 'var(--muted-foreground)',
      },
      style: { stroke: 'var(--muted-foreground)' },
    });
  });

  // 5. Connect Trigger to first node
  if (config.entryNodeId) {
    edges.push({
      id: 'e-trigger-entry',
      source: entryNodeId,
      target: config.entryNodeId,
      animated: true,
      style: { strokeDasharray: '5,5' }
    });
  }

  // 6. Add Exit Node (Output)
  const exitNodeId = 'output-node';
  const exitY = containerY + (config.nodes.length * 100) + 100;
  
  nodes.push({
    id: exitNodeId,
    type: 'output',
    data: { label: chatOutput ? `📄 ${chatOutput.outputKey}` : '📄 Response' },
    position: { x: 125, y: exitY },
    sourcePosition,
    targetPosition,
    style: { background: 'var(--background)', color: 'var(--foreground)', border: '2px solid var(--border)', borderRadius: '20px', width: 120, fontSize: '11px', fontWeight: 'bold' }
  });

  // 7. Connect last node to Output
  const sourceNodeIds = new Set(config.edges.map((e: any) => e.from));
  const leafNodes = config.nodes.filter((n: any) => !sourceNodeIds.has(n.id));

  leafNodes.forEach((node: any, idx: number) => {
    edges.push({
      id: `e-${node.id}-output-${idx}`,
      source: node.id,
      target: exitNodeId,
      animated: true,
      style: { strokeDasharray: '5,5' }
    });
  });

  return { nodes, edges };
}

function getNodeLabel(node: any, nodeMeta?: any): string {
  // Use metadata display name if available
  if (nodeMeta?.displayName) {
    const icon = nodeMeta.icon || getIconForCategory(nodeMeta.category);
    return `${icon} ${nodeMeta.displayName}`;
  }
  
  // Fallback to old logic
  const type = node.type.toLowerCase();
  if (type.includes('search')) return `🔍 ${node.id}`;
  if (type.includes('analysis')) return `📊 ${node.id}`;
  if (type.includes('llm') || type.includes('chat')) return `🧠 ${node.id}`;
  if (node.id === 'unpack') return `📥 Unpack`;
  if (node.id === 'pack') return `📤 Pack`;
  return node.id;
}

function getNodeStyle(node: any, nodeMeta?: any): any {
  const baseStyle = { width: 150, borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' };

  // Use metadata color if available
  if (nodeMeta?.defaults?.color) {
    const color = nodeMeta.defaults.color;
    return { 
      ...baseStyle, 
      background: `${color}15`, // 15 = ~8% opacity 
      border: `1px solid ${color}`, 
      color: color 
    };
  }
  
  // Fallback to category-based colors
  if (nodeMeta?.category) {
    const categoryColor = getCategoryColor(nodeMeta.category);
    if (categoryColor) {
      return {
        ...baseStyle,
        background: categoryColor.bg,
        border: categoryColor.border,
        color: categoryColor.text
      };
    }
  }

  // Fallback to old logic
  const type = node.type.toLowerCase();
  if (type.includes('search')) {
    return { ...baseStyle, background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', color: '#3b82f6' };
  }
  if (type.includes('analysis')) {
    return { ...baseStyle, background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', color: '#22c55e' };
  }
  if (type.includes('llm') || type.includes('chat')) {
    return { ...baseStyle, background: 'rgba(249, 115, 22, 0.1)', border: '1px solid #f97316', color: '#f97316' };
  }
  if (node.id === 'unpack' || node.id === 'pack') {
    return { ...baseStyle, background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' };
  }
  
  return { ...baseStyle, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' };
}

function getIconForCategory(category: string): string {
  const categoryIcons: Record<string, string> = {
    'data-sources': '📥',
    'ai': '🤖',
    'llm': '🧠',
    'transform': '⚙️',
    'api-client': '🔌',
    'storage': '💾',
    'utility': '🔧',
    'analysis': '📊',
    'search': '🔍'
  };
  return categoryIcons[category] || '📦';
}

function getCategoryColor(category: string): { bg: string; border: string; text: string } | null {
  const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
    'data-sources': { bg: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', text: '#3b82f6' },
    'ai': { bg: 'rgba(249, 115, 22, 0.1)', border: '1px solid #f97316', text: '#f97316' },
    'llm': { bg: 'rgba(249, 115, 22, 0.1)', border: '1px solid #f97316', text: '#f97316' },
    'transform': { bg: 'rgba(168, 85, 247, 0.1)', border: '1px solid #a855f7', text: '#a855f7' },
    'api-client': { bg: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', text: '#3b82f6' },
    'storage': { bg: 'rgba(14, 165, 233, 0.1)', border: '1px solid #0ea5e9', text: '#0ea5e9' },
    'utility': { bg: 'rgba(100, 116, 139, 0.1)', border: '1px solid #64748b', text: '#64748b' },
    'analysis': { bg: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', text: '#22c55e' },
    'search': { bg: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', text: '#3b82f6' }
  };
  return categoryColors[category] || null;
}
