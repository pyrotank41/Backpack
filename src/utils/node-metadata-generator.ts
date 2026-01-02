/**
 * Node Metadata Generator
 * 
 * Auto-generates node metadata from class names and Zod schemas.
 * Uses conventions to infer category, icon, color, etc.
 */

import { NodeDescription } from '../types/node-metadata';
import { zodToProperties } from './zod-to-properties';
import { z } from 'zod';

/**
 * Auto-generate complete node metadata from class and schemas
 * 
 * @param nodeClass - The BackpackNode class
 * @returns Complete NodeDescription with auto-inferred values
 * 
 * @example
 * ```typescript
 * class TwitterAPINode extends BackpackNode {
 *   static config = z.object({ ... });
 * }
 * 
 * const metadata = generateNodeMetadata(TwitterAPINode);
 * // Returns:
 * // {
 * //   displayName: "Twitter API",
 * //   name: "twitterAPI",
 * //   category: "api-client",
 * //   icon: "🔌",
 * //   ...
 * // }
 * ```
 */
export function generateNodeMetadata(nodeClass: any): NodeDescription {
    const className = nodeClass.name;
    
    // Auto-generate from class name
    const displayName = classNameToDisplayName(className);
    const name = classNameToName(className);
    const category = inferCategory(className);
    const icon = inferIcon(category, className);
    const color = inferColor(category);
    
    // Get or generate namespace segment
    const namespaceSegment = nodeClass.namespaceSegment || name;
    
    // Auto-generate properties from config schema
    const properties = nodeClass.config 
        ? zodToProperties(nodeClass.config)
        : [];
    
    return {
        displayName,
        name,
        icon,
        group: category,
        category,
        version: '1.0.0',
        description: `${displayName} for BackpackFlow`,
        defaults: {
            name: displayName,
            color,
        },
        properties,
        tags: generateTags(className, category),
    };
}

/**
 * Convert class name to display name
 * 
 * @example
 * classNameToDisplayName('YouTubeSearchNode') // "YouTube Search"
 * classNameToDisplayName('TwitterAPINode') // "Twitter API"
 * classNameToDisplayName('DataAnalysisNode') // "Data Analysis"
 */
function classNameToDisplayName(className: string): string {
    return className
        .replace(/Node$/, '')           // Remove "Node" suffix
        .replace(/([A-Z])/g, ' $1')     // Add space before capitals
        .trim()
        .replace(/\s+/g, ' ');          // Normalize spaces
}

/**
 * Convert class name to node name (camelCase)
 * 
 * @example
 * classNameToName('YouTubeSearchNode') // "youtubeSearch"
 * classNameToName('TwitterAPINode') // "twitterAPI"
 */
function classNameToName(className: string): string {
    const withoutNode = className.replace(/Node$/, '');
    return withoutNode.charAt(0).toLowerCase() + withoutNode.slice(1);
}

/**
 * Infer category from class name
 * 
 * Uses naming conventions to determine the category.
 */
function inferCategory(className: string): string {
    const name = className.toLowerCase();
    
    // API clients
    if (name.includes('api') || name.includes('search') || name.includes('fetch')) {
        return 'api-client';
    }
    
    // Analysis nodes
    if (name.includes('analysis') || name.includes('analyze') || name.includes('statistics')) {
        return 'analysis';
    }
    
    // LLM nodes
    if (name.includes('llm') || name.includes('chat') || name.includes('completion') || name.includes('gpt')) {
        return 'llm';
    }
    
    // Transform/conversion nodes
    if (name.includes('transform') || name.includes('convert') || name.includes('mapper')) {
        return 'transform';
    }
    
    // Agent nodes
    if (name.includes('agent')) {
        return 'agent';
    }
    
    // Data processing
    if (name.includes('filter') || name.includes('sort') || name.includes('aggregate')) {
        return 'data';
    }
    
    // Default to utility
    return 'utility';
}

/**
 * Infer icon from category and class name
 * 
 * Provides smart defaults with platform-specific overrides.
 */
function inferIcon(category: string, className: string): string {
    const name = className.toLowerCase();
    
    // Platform-specific icons
    if (name.includes('youtube')) return '🎥';
    if (name.includes('twitter')) return '🐦';
    if (name.includes('reddit')) return '🤖';
    if (name.includes('linkedin')) return '💼';
    if (name.includes('github')) return '🐙';
    if (name.includes('slack')) return '💬';
    if (name.includes('discord')) return '🎮';
    
    // Category default icons
    const categoryIcons: Record<string, string> = {
        'api-client': '🔌',
        'analysis': '📊',
        'llm': '🤖',
        'transform': '🔄',
        'agent': '🤵',
        'data': '📦',
        'utility': '🔧',
    };
    
    return categoryIcons[category] || '📦';
}

/**
 * Infer color from category
 * 
 * Provides consistent color scheme across categories.
 */
function inferColor(category: string): string {
    const categoryColors: Record<string, string> = {
        'api-client': '#2196F3',    // Blue
        'analysis': '#4CAF50',      // Green
        'llm': '#9C27B0',           // Purple
        'transform': '#FF9800',     // Orange
        'agent': '#F44336',         // Red
        'data': '#00BCD4',          // Cyan
        'utility': '#607D8B',       // Blue Grey
    };
    
    return categoryColors[category] || '#9E9E9E';
}

/**
 * Generate tags from class name and category
 * 
 * Extracts meaningful tags for search and filtering.
 */
function generateTags(className: string, category: string): string[] {
    const tags = [category];
    
    // Extract words from class name
    const words = className
        .replace(/Node$/, '')
        .match(/[A-Z][a-z]+/g) || [];
    
    // Add lowercase words as tags
    tags.push(...words.map(w => w.toLowerCase()));
    
    // Deduplicate
    return [...new Set(tags)];
}
