"use client";

import React, { useEffect, useState } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    ConnectionLineType,
    BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { transformToReactFlow } from "../lib/flow-graph";
import { useTheme } from "./theme-provider";

interface FlowGraphProps {
    agentId: string;
    onNodeSelect?: (nodeId: string, nodeData: any) => void;
}

export default function FlowGraph({ agentId, onNodeSelect }: FlowGraphProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nodeMetadata, setNodeMetadata] = useState<Record<string, any>>({});
    const { theme } = useTheme();
    const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(
        "dark"
    );

    // Resolve system theme to actual theme
    useEffect(() => {
        if (theme === "system") {
            const systemTheme = window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches
                ? "dark"
                : "light";
            setResolvedTheme(systemTheme);

            // Listen for system theme changes
            const mediaQuery = window.matchMedia(
                "(prefers-color-scheme: dark)"
            );
            const handler = (e: MediaQueryListEvent) => {
                setResolvedTheme(e.matches ? "dark" : "light");
            };
            mediaQuery.addEventListener("change", handler);
            return () => mediaQuery.removeEventListener("change", handler);
        } else {
            setResolvedTheme(theme as "light" | "dark");
        }
    }, [theme]);

    useEffect(() => {
        async function fetchGraph() {
            setLoading(true);
            setError(null);
            try {
                // Fetch graph data
                const graphResponse = await fetch(`/api/agents/${agentId}/graph`);
                const graphData = await graphResponse.json();

                if (!graphData.success || !graphData.graph) {
                    setError(graphData.error || "Failed to load graph");
                    return;
                }

                let config = graphData.graph;

                // Unwrap internal flow if needed
                if (
                    config.nodes.length === 1 &&
                    config.nodes[0].internalFlow
                ) {
                    config = config.nodes[0].internalFlow;
                }

                // Fetch node metadata for all node types in the graph
                const nodeTypes = Array.from(new Set<string>(config.nodes.map((n: any) => n.type)));
                const metadataPromises = nodeTypes.map(async (type: string) => {
                    try {
                        const res = await fetch(`/api/nodes/${type}`);
                        if (res.ok) {
                            const metadata = await res.json();
                            return [type, metadata];
                        }
                    } catch (err) {
                        console.warn(`Failed to fetch metadata for ${type}:`, err);
                    }
                    return [type, null];
                });

                const metadataEntries = await Promise.all(metadataPromises);
                const metadata = Object.fromEntries(metadataEntries.filter(([, m]) => m !== null));
                setNodeMetadata(metadata);

                // Transform to React Flow format with metadata
                const { nodes: flowNodes, edges: flowEdges } =
                    transformToReactFlow(config, graphData.metadata, metadata);
                setNodes(flowNodes as any);
                setEdges(flowEdges as any);

            } catch (err) {
                console.error("Failed to fetch agent graph:", err);
                setError("Failed to fetch graph from API");
            } finally {
                setLoading(false);
            }
        }

        if (agentId) {
            fetchGraph();
        }
    }, [agentId, setNodes, setEdges]);

    // Handle node click
    const handleNodeClick = React.useCallback((_event: React.MouseEvent, node: any) => {
        if (onNodeSelect && node.data.nodeType) {
            const metadata = nodeMetadata[node.data.nodeType];
            onNodeSelect(node.id, {
                ...node.data,
                metadata
            });
        }
    }, [onNodeSelect, nodeMetadata]);

    if (loading) {
        return (
            <div className="h-full w-full bg-background flex items-center justify-center">
                <div className="text-muted-foreground animate-pulse text-xs font-black uppercase tracking-widest">
                    Initializing Flow...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full w-full bg-background flex items-center justify-center p-4 text-center">
                <div className="text-destructive text-sm font-bold">
                    ❌ {error}
                </div>
            </div>
        );
    }



    return (
        <div className="h-full w-full overflow-hidden relative bg-background">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                connectionLineType={ConnectionLineType.SmoothStep}
                fitView
                colorMode={resolvedTheme}
            >
                <Background
                    color="var(--border)"
                    gap={16}
                    size={1}
                    variant={BackgroundVariant.Dots}
                />
                <Controls className="bg-background border-border text-foreground fill-foreground" />
            </ReactFlow>

            {/* Legend Overlay */}
            <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-md p-3 rounded-xl border border-border text-[10px] space-y-2 z-10 shadow-2xl">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <span className="text-muted-foreground font-bold uppercase tracking-tighter">
                        Tools / Search
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    <span className="text-muted-foreground font-bold uppercase tracking-tighter">
                        Analysis
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                    <span className="text-muted-foreground font-bold uppercase tracking-tighter">
                        LLM / AI
                    </span>
                </div>
            </div>
        </div>
    );
}
