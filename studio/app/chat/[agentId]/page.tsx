"use client";

/**
 * Chat Interface - Talk to AI Agents
 *
 * Conversation is reconstructed from Backpack commits (git-like).
 * No manual state management - Backpack is single source of truth.
 */

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import FlowGraph from "@/components/FlowGraph";
import NodePropertyPanel from "@/components/NodePropertyPanel";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
    ChevronLeft,
    RefreshCcw,
    MessageSquare,
    Box,
    SendHorizontal,
    Zap,
    ChevronDown,
    ChevronRight,
} from "lucide-react";

interface Message {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
}

interface BackpackEvent {
    id: string;
    type: string;
    timestamp: number;
    nodeId: string;
    payload?: Record<string, unknown>;
}

export default function ChatPage() {
    const params = useParams();
    const router = useRouter();
    const agentId = params.agentId as string;

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [agentName, setAgentName] = useState("Agent");
    const [sessionId, setSessionId] = useState("");
    const [viewMode, setViewMode] = useState<"chat" | "blueprint">("blueprint");
    const [activeSidebarTab, setActiveSidebarTab] = useState<
        "chat" | "telemetry" | "state"
    >("chat");
    const [realtimeEvents, setRealtimeEvents] = useState<BackpackEvent[]>([]);
    const [sidebarWidth, setSidebarWidth] = useState(480);
    const [isResizing, setIsResizing] = useState(false);
    const [selectedNode, setSelectedNode] = useState<any>(null);

    // Dev mode toggle - set to true to use sample data
    const DEV_MODE = false;

    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // Initialize sessionId on client side only to avoid hydration mismatch
    useEffect(() => {
        if (!sessionId) {
            setSessionId(`session-${Date.now()}`);
        }
    }, [sessionId]);
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Subscribe to real-time events via SSE
    useEffect(() => {
        if (!sessionId) return;

        const eventSource = new EventSource(`/api/events/${sessionId}`);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setRealtimeEvents((prev) => [...prev, data]);
            } catch (err) {
                console.error("Failed to parse SSE event:", err);
            }
        };

        eventSource.onerror = (err) => {
            console.error("SSE Connection Error:", err);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [sessionId]);

    // Clear session and start fresh
    function clearSession() {
        setMessages([]);
        setRealtimeEvents([]);
        setSessionId(`session-${Date.now()}`);
    }

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Handle sidebar resize
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;

            const newWidth = window.innerWidth - e.clientX;
            if (newWidth >= 320 && newWidth <= 800) {
                setSidebarWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
            document.body.style.cursor = "ew-resize";
            document.body.style.userSelect = "none";
        }

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };
    }, [isResizing]);

    // Send message to agent
    async function sendMessage(e: React.FormEvent) {
        e.preventDefault();

        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput("");
        setLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentId,
                    message: userMessage,
                    sessionId,
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Update messages with reconstructed conversation from Backpack
                setMessages(data.conversation);
                setAgentName(data.metadata.agentName);
            } else {
                // Show error as assistant message
                setMessages((prev) => [
                    ...prev,
                    {
                        role: "user",
                        content: userMessage,
                        timestamp: Date.now(),
                    },
                    {
                        role: "assistant",
                        content: `❌ ${data.error}`,
                        timestamp: Date.now(),
                    },
                ]);
            }
        } catch (error) {
            console.error("Failed to send message:", error);
            setMessages((prev) => [
                ...prev,
                { role: "user", content: userMessage, timestamp: Date.now() },
                {
                    role: "assistant",
                    content: `❌ Network error: ${error}`,
                    timestamp: Date.now(),
                },
            ]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans">
            {/* Unified Top Menu Bar - Spans Entire Width */}
            <header className="bg-background/80 backdrop-blur-2xl border-b h-14 flex items-center px-4 z-30 shrink-0">
                    <div className="flex items-center justify-between w-full">
                    {/* Left Section */}
                    <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push("/")}
                                className="text-muted-foreground hover:text-foreground transition-all flex items-center gap-2 group px-2"
                            >
                            <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                    Exit
                                </span>
                            </Button>
                        <div className="w-px h-5 bg-border" />
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                                    {agentName}
                                    <Badge
                                        variant="outline"
                                    className="text-[8px] h-4 px-1.5 bg-primary/10 text-primary font-mono"
                                    >
                                        v2.0
                                    </Badge>
                                </h1>
                        </div>
                    </div>

                    {/* Center Section - Status */}
                    <div className="flex items-center gap-2">
                                        <div
                                            className={`w-1.5 h-1.5 rounded-full ${
                                                loading
                                                    ? "bg-primary animate-pulse shadow-[0_0_8px_oklch(0.59_0.20_277/0.6)]"
                                    : "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]"
                                            }`}
                                        />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                                            {loading
                                ? "Processing..."
                                : sessionId ? `Session ${sessionId.split("-")[1]}` : "Initializing..."}
                                        </span>
                        </div>

                    {/* Right Section - Controls */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 p-0.5 bg-muted/50 rounded-lg border">
                            <Button
                                variant={
                                    viewMode === "blueprint"
                                        ? "default"
                                        : "ghost"
                                }
                                size="sm"
                                onClick={() => {
                                    if (viewMode === "chat") {
                                        setViewMode("blueprint");
                                        setActiveSidebarTab("chat");
                                    } else {
                                        setViewMode("chat");
                                    }
                                }}
                                className={`text-[9px] h-7 px-3 font-bold uppercase tracking-wider ${
                                    viewMode === "blueprint"
                                        ? "bg-primary text-primary-foreground shadow-md"
                                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                }`}
                            >
                                {viewMode === "chat" ? (
                                    <>
                                        <Box className="w-3 h-3 mr-1.5" />
                                        Blueprint
                                    </>
                                ) : (
                                    <>
                                        <MessageSquare className="w-3 h-3 mr-1.5" />
                                        Focus
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearSession}
                                className="text-[9px] h-7 px-3 text-muted-foreground hover:text-foreground font-bold uppercase tracking-wider hover:bg-accent/50"
                            >
                                <RefreshCcw className="w-3 h-3 mr-1.5" />
                                Reset
                            </Button>
                        </div>
                        <div className="w-px h-5 bg-border" />
                        <ThemeSwitcher />
                        </div>
                    </div>
                </header>

            {/* Main Content Row */}
            <div className="flex flex-1 min-h-0 relative">
                {/* Main Content Area */}
                <div className="flex flex-col flex-1 min-w-0 relative">
                {/* View Content */}
                <div className="flex-1 flex flex-col min-h-0 relative">
                    {viewMode === "chat" ? (
                            <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-500 max-w-5xl mx-auto w-full">
                                <ScrollArea className="flex-1 h-full overflow-auto">
                                    <div className="p-8 space-y-8 min-h-full">
                                    {messages.length === 0 ? (
                                        <div className="text-center py-32 flex flex-col items-center">
                                                <div className="w-24 h-24 bg-muted/50 rounded-[2.5rem] flex items-center justify-center text-5xl mb-8 border shadow-2xl">
                                                    <Box className="w-12 h-12 text-primary" />
                                            </div>
                                                <h2 className="text-4xl font-black text-foreground mb-4 tracking-tighter">
                                                Ready for Deployment
                                            </h2>
                                                <p className="text-muted-foreground max-w-sm text-lg leading-relaxed text-balance font-light">
                                                    Start a session with{" "}
                                                    {agentName} to observe the
                                                    Backpack Flow logic in
                                                    action.
                                            </p>
                                        </div>
                                    ) : (
                                        messages.map((message, index) => (
                                            <MessageBubble
                                                key={index}
                                                message={message}
                                            />
                                        ))
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            </ScrollArea>

                            {/* Focus Mode Chat Input */}
                                <div className="bg-background/20 backdrop-blur-2xl border-t p-8 shrink-0">
                                <div className="max-w-3xl mx-auto">
                                    <form
                                        onSubmit={sendMessage}
                                        className="relative group"
                                    >
                                        <Input
                                            type="text"
                                            value={input}
                                            onChange={(e) =>
                                                setInput(e.target.value)
                                            }
                                            placeholder={`Communicate with ${agentName}...`}
                                            disabled={loading}
                                                className="w-full bg-muted/50 text-foreground rounded-2xl pl-8 pr-32 py-10 focus-visible:ring-primary/30 border transition-all disabled:opacity-50 text-xl shadow-2xl group-hover:border-border/80 font-light tracking-wide h-auto"
                                        />
                                        <Button
                                            type="submit"
                                                disabled={
                                                    loading || !input.trim()
                                                }
                                                className="absolute right-3 top-3 bottom-3 bg-primary hover:bg-primary/90 text-primary-foreground px-8 rounded-xl font-black transition-all shadow-lg flex items-center justify-center uppercase tracking-widest text-[10px]"
                                        >
                                            {loading ? (
                                                <RefreshCcw className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <SendHorizontal className="w-4 h-4 mr-2" />
                                                    Send
                                                </>
                                            )}
                                        </Button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex animate-in fade-in duration-700">
                            {/* Flow Graph */}
                            <div className="flex-1 relative bg-background">
                                <FlowGraph
                                    agentId={agentId}
                                    onNodeSelect={(nodeId, nodeData) => {
                                        setSelectedNode(nodeData);
                                    }}
                                />
                            </div>

                            {/* Property Panel */}
                            {selectedNode && (
                                <div className="w-96 shrink-0">
                                    <NodePropertyPanel
                                        nodeData={selectedNode}
                                        onClose={() => setSelectedNode(null)}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Integrated Workbench Sidebar (Only in Blueprint View) */}
            {viewMode === "blueprint" && (
                    <div
                        ref={sidebarRef}
                        style={{ width: `${sidebarWidth}px` }}
                        className="bg-background/95 backdrop-blur-3xl border-l flex flex-col z-20 animate-in slide-in-from-right duration-300 text-foreground shrink-0 relative"
                    >
                        {/* Resize Handle */}
                        <div
                            className="absolute left-0 top-0 bottom-0 w-1 hover:w-1.5 bg-border/50 hover:bg-primary cursor-ew-resize transition-all z-50 group"
                            onMouseDown={() => setIsResizing(true)}
                        >
                            <div className="absolute inset-y-0 left-0 w-4 -translate-x-1.5" />
                        </div>
                        {/* Sidebar Sub-Header / Tabs */}
                        <div className="h-11 flex items-center px-3 border-b bg-muted/10 shrink-0">
                        <Tabs
                            value={activeSidebarTab}
                            onValueChange={(v) =>
                                setActiveSidebarTab(
                                    v as "chat" | "telemetry" | "state"
                                )
                            }
                            className="w-full"
                        >
                                <TabsList className="grid w-full grid-cols-3 bg-muted/30 p-0.5 rounded-lg border-0 h-8">
                                <TabsTrigger
                                    value="chat"
                                        className="py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border-0 transition-all"
                                >
                                    💬 Chat
                                </TabsTrigger>
                                <TabsTrigger
                                    value="telemetry"
                                        className="py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border-0 transition-all"
                                >
                                    📊 Events
                                </TabsTrigger>
                                <TabsTrigger
                                    value="state"
                                        className="py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border-0 transition-all"
                                >
                                    🎒 State
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-muted/10">
                        {activeSidebarTab === "telemetry" && (
                            <TelemetryView
                                messages={messages}
                                loading={loading}
                                    events={
                                        DEV_MODE ? SAMPLE_TRACE : realtimeEvents
                                    }
                                    devMode={DEV_MODE}
                            />
                        )}

                        {activeSidebarTab === "chat" && (
                            <div className="flex-1 flex flex-col min-h-0 animate-in slide-in-from-right-4 duration-300">
                                    <ScrollArea className="flex-1 h-full overflow-auto">
                                        <div className="px-5 py-5 space-y-5">
                                        {messages.length === 0 ? (
                                            <div className="h-[400px] flex flex-col items-center justify-center italic text-sm space-y-4 text-muted-foreground">
                                                <div className="w-12 h-12 bg-muted/50 rounded-2xl flex items-center justify-center text-2xl border shadow-inner">
                                                    <MessageSquare className="w-6 h-6 text-muted-foreground/50" />
                                                </div>
                                                <p className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground/60 text-center">
                                                        Awaiting session
                                                        start...
                                                </p>
                                            </div>
                                        ) : (
                                                messages.map(
                                                    (message, index) => (
                                                <MessageBubble
                                                    key={index}
                                                    message={message}
                                                    compact
                                                />
                                                    )
                                                )
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>
                                </ScrollArea>
                                <div className="p-5 bg-background/50 border-t backdrop-blur-md shrink-0">
                                    <form
                                        onSubmit={sendMessage}
                                        className="relative group"
                                    >
                                        <Input
                                            type="text"
                                            value={input}
                                            onChange={(e) =>
                                                setInput(e.target.value)
                                            }
                                            placeholder="Direct command..."
                                            disabled={loading}
                                            className="w-full bg-muted/50 text-foreground rounded-xl pl-5 pr-14 py-6 focus-visible:ring-primary/20 border-border/50 text-sm font-light transition-all shadow-inner group-hover:border-border h-auto"
                                        />
                                        <Button
                                            type="submit"
                                                disabled={
                                                    loading || !input.trim()
                                                }
                                            size="icon"
                                            className="absolute right-2 top-2 bottom-2 bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-lg w-10 h-10 rounded-lg"
                                        >
                                            {loading ? (
                                                <RefreshCcw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <SendHorizontal className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {activeSidebarTab === "state" && (
                            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center animate-in slide-in-from-right-4 duration-300 text-foreground">
                                <div className="w-20 h-20 bg-muted/50 rounded-3xl flex items-center justify-center text-4xl mb-6 border shadow-2xl">
                                    🎒
                                </div>
                                <h3 className="text-xl font-black text-foreground uppercase tracking-tighter">
                                    Backpack Explorer
                                </h3>
                                <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-[250px] font-light">
                                        Inspect the real-time state of the
                                        Backpack key-value store.
                                </p>
                                <div className="mt-8 w-full p-5 bg-muted/80 border border-dashed rounded-2xl text-[10px] font-mono text-muted-foreground text-left leading-relaxed shadow-inner">
                                    {
                                        "// Snapshot streaming interface\n// Ready for PRD-002 integration"
                                    }
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}

function MessageBubble({
    message,
    compact = false,
}: {
    message: Message;
    compact?: boolean;
}) {
    const isUser = message.role === "user";

    return (
        <div
            className={`flex ${
                isUser ? "justify-end" : "justify-start"
            } animate-in fade-in slide-in-from-bottom-2 duration-300`}
        >
            <div
                className={`rounded-2xl ${compact ? "p-4" : "p-6"} ${
                    isUser
                        ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/20 ml-12"
                        : "bg-muted text-foreground border shadow-2xl mr-12"
                } ${compact ? "max-w-[95%] rounded-xl" : "max-w-[85%]"}`}
            >
                {/* Role Label */}
                {!compact && (
                    <div
                        className={`text-[10px] uppercase tracking-[0.2em] font-black mb-3 ${
                            isUser
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                        }`}
                    >
                        {isUser ? "User Node" : "Agent Response"}
                    </div>
                )}

                {/* Content */}
                <div
                    className={`${
                        compact ? "text-sm" : "text-[1.05rem]"
                    } leading-relaxed font-light tracking-wide`}
                >
                    {isUser ? (
                        <div className="whitespace-pre-wrap">
                            {message.content}
                        </div>
                    ) : (
                        <div
                            className="prose dark:prose-invert prose-sm max-w-none 
                            prose-p:leading-relaxed
                            prose-headings:font-black prose-headings:tracking-tighter
                            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                            prose-strong:font-bold
                            prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
                            prose-pre:bg-muted/50 prose-pre:border prose-pre:shadow-2xl
                            prose-ol:list-decimal prose-ul:list-disc
                            prose-li:marker:text-primary prose-li:my-1"
                        >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* Timestamp */}
                <div
                    className={`text-[9px] mt-3 font-mono opacity-50 ${
                        isUser ? "text-right" : "text-left"
                    }`}
                >
                    {new Date(message.timestamp).toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
}

interface EventTreeNode {
    event: BackpackEvent;
    children: EventTreeNode[];
    depth: number;
    index: number;
}

// Sample trace data for dev mode
const SAMPLE_TRACE: BackpackEvent[] = [
    {
        id: "1",
        type: "node_start",
        timestamp: Date.now(),
        nodeId: "youtube-research",
        payload: { query: "ai agents" },
    },
    {
        id: "2",
        type: "prep_complete",
        timestamp: Date.now() + 100,
        nodeId: "youtube-research",
        payload: { prepResult: { query: "ai agents" } },
    },
    {
        id: "3",
        type: "node_start",
        timestamp: Date.now() + 200,
        nodeId: "search",
        payload: { query: "ai agents" },
    },
    {
        id: "4",
        type: "prep_complete",
        timestamp: Date.now() + 300,
        nodeId: "search",
        payload: { searchQuery: "ai agents" },
    },
    {
        id: "5",
        type: "exec_complete",
        timestamp: Date.now() + 1000,
        nodeId: "search",
        payload: { videos: [{ id: "xyz", title: "AI Agents Explained" }] },
    },
    {
        id: "6",
        type: "node_end",
        timestamp: Date.now() + 1100,
        nodeId: "search",
        payload: { action: "complete", durationMs: 900 },
    },
    {
        id: "7",
        type: "node_start",
        timestamp: Date.now() + 1200,
        nodeId: "analysis",
        payload: { videos: 5 },
    },
    {
        id: "8",
        type: "prep_complete",
        timestamp: Date.now() + 1300,
        nodeId: "analysis",
        payload: { videos: 5 },
    },
    {
        id: "9",
        type: "node_start",
        timestamp: Date.now() + 1400,
        nodeId: "llm-analyze",
        payload: { model: "gpt-4" },
    },
    {
        id: "10",
        type: "exec_complete",
        timestamp: Date.now() + 3000,
        nodeId: "llm-analyze",
        payload: { summary: "Analysis complete" },
    },
    {
        id: "11",
        type: "node_end",
        timestamp: Date.now() + 3100,
        nodeId: "llm-analyze",
        payload: { durationMs: 1700 },
    },
    {
        id: "12",
        type: "exec_complete",
        timestamp: Date.now() + 3200,
        nodeId: "analysis",
        payload: { insights: "..." },
    },
    {
        id: "13",
        type: "node_end",
        timestamp: Date.now() + 3300,
        nodeId: "analysis",
        payload: { durationMs: 2100 },
    },
    {
        id: "14",
        type: "node_end",
        timestamp: Date.now() + 3400,
        nodeId: "youtube-research",
        payload: { totalDurationMs: 3400 },
    },
];

function TelemetryView({
    messages,
    loading,
    events,
    devMode = false,
}: {
    messages: Message[];
    loading: boolean;
    events: BackpackEvent[];
    devMode?: boolean;
}) {
    const [expandedEvents, setExpandedEvents] = useState<Set<string>>(
        new Set()
    );

    // Auto-expand all nodes in dev mode
    useEffect(() => {
        if (devMode && events.length > 0) {
            const allKeys = new Set<string>();
            events.forEach((event, index) => {
                allKeys.add(`${event.nodeId}-${index}`);
            });
            setExpandedEvents(allKeys);
        }
    }, [devMode, events]);

    // Build hierarchical tree structure - group by nodeId and nest based on execution timing
    const eventTree = useMemo(() => {
        interface NodeScope {
            nodeId: string;
            startTime: number;
            endTime: number;
            startIndex: number;
            endIndex: number;
        }

        // Find all node scopes (node_start to node_end pairs)
        const nodeScopes: NodeScope[] = [];
        const nodeStarts = new Map<string, { time: number; index: number }>();

        events.forEach((event, index) => {
            if (event.type.toLowerCase().includes("node_start")) {
                nodeStarts.set(event.nodeId, { time: event.timestamp, index });
            } else if (event.type.toLowerCase().includes("node_end")) {
                const start = nodeStarts.get(event.nodeId);
                if (start) {
                    nodeScopes.push({
                        nodeId: event.nodeId,
                        startTime: start.time,
                        endTime: event.timestamp,
                        startIndex: start.index,
                        endIndex: index,
                    });
                    nodeStarts.delete(event.nodeId);
                }
            }
        });

        // Build tree by grouping events under their node containers
        const buildTree = (
            startIdx: number,
            endIdx: number,
            depth: number
        ): EventTreeNode[] => {
            const nodes: EventTreeNode[] = [];
            let currentIdx = startIdx;

            while (currentIdx <= endIdx) {
                const event = events[currentIdx];

                // Check if this event starts a node scope
                const scope = nodeScopes.find(
                    (s) => s.startIndex === currentIdx
                );

                if (scope) {
                    // Create a container node for this scope
                    const containerNode: EventTreeNode = {
                        event: events[scope.startIndex], // The START event
                        children: [],
                        depth,
                        index: currentIdx,
                    };

                    // Add all events within this scope as children
                    const scopeEvents: EventTreeNode[] = [];
                    for (
                        let i = scope.startIndex + 1;
                        i <= scope.endIndex;
                        i++
                    ) {
                        const childEvent = events[i];

                        // Check if this child event starts a nested node
                        const nestedScope = nodeScopes.find(
                            (s) => s.startIndex === i
                        );
                        if (nestedScope) {
                            // Recursively build nested nodes
                            const nestedNodes = buildTree(
                                nestedScope.startIndex,
                                nestedScope.endIndex,
                                depth + 1
                            );
                            scopeEvents.push(...nestedNodes);
                            i = nestedScope.endIndex; // Skip to end of nested scope
                        } else {
                            // Regular event belonging to current node
                            scopeEvents.push({
                                event: childEvent,
                                children: [],
                                depth: depth + 1,
                                index: i,
                            });
                        }
                    }

                    containerNode.children = scopeEvents;
                    nodes.push(containerNode);
                    currentIdx = scope.endIndex + 1;
                } else {
                    // Event outside any node scope (shouldn't happen but handle it)
                    nodes.push({
                        event,
                        children: [],
                        depth,
                        index: currentIdx,
                    });
                    currentIdx++;
                }
            }

            return nodes;
        };

        return buildTree(0, events.length - 1, 0);
    }, [events]);

    const toggleEvent = (eventKey: string) => {
        setExpandedEvents((prev) => {
            const next = new Set(prev);
            if (next.has(eventKey)) {
                next.delete(eventKey);
            } else {
                next.add(eventKey);
            }
            return next;
        });
    };

    // Get node color based on node type/id (matching flow graph colors)
    const getNodeColor = (nodeId: string) => {
        const lowerNodeId = nodeId.toLowerCase();

        // Check for specific node types (more specific patterns first)
        // Match standalone "search" nodes, not "research" or "youtube-search"
        if (
            lowerNodeId === "search" ||
            lowerNodeId.startsWith("search-") ||
            lowerNodeId.endsWith("-search")
        ) {
            return {
                bg: "bg-blue-500/10",
                border: "border-blue-500/40",
                text: "text-blue-500",
                badge: "bg-blue-500/10 text-blue-500",
                bullet: "bg-blue-500",
            };
        }
        if (
            lowerNodeId.includes("analysis") ||
            lowerNodeId.includes("analyze")
        ) {
            return {
                bg: "bg-green-500/10",
                border: "border-green-500/40",
                text: "text-green-500",
                badge: "bg-green-500/10 text-green-500",
                bullet: "bg-green-500",
            };
        }
        if (
            lowerNodeId.includes("llm") ||
            lowerNodeId.includes("chat") ||
            lowerNodeId.includes("gpt")
        ) {
            return {
                bg: "bg-orange-500/10",
                border: "border-orange-500/40",
                text: "text-orange-500",
                badge: "bg-orange-500/10 text-orange-500",
                bullet: "bg-orange-500",
            };
        }
        // Default/root nodes (youtube-research, etc)
        return {
            bg: "bg-purple-500/10",
            border: "border-purple-500/40",
            text: "text-purple-500",
            badge: "bg-purple-500/10 text-purple-500",
            bullet: "bg-purple-500",
        };
    };

    const renderEventNode = (node: EventTreeNode) => {
        const hasChildren = node.children.length > 0;
        const eventKey = `${node.event.nodeId}-${node.index}`;
        const isExpanded = expandedEvents.has(eventKey);
        const indentWidth = 20;
        const isNodeStart = node.event.type
            .toLowerCase()
            .includes("node_start");
        const isNodeEnd = node.event.type.toLowerCase().includes("node_end");
        const nodeColors = getNodeColor(node.event.nodeId);

        // If this is a node_start event with children, render as a collapsible node container
        if (isNodeStart && hasChildren) {
    return (
                <div
                    key={eventKey}
                    className="relative mb-1.5"
                    style={{ paddingLeft: `${node.depth * indentWidth}px` }}
                >
                    {/* Node Container */}
                    <div
                        className={`${nodeColors.bg} border ${nodeColors.border} rounded-lg overflow-hidden`}
                    >
                        {/* Header - clickable to expand/collapse */}
                        <button
                            onClick={() => toggleEvent(eventKey)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-left"
                        >
                            {/* Expand/Collapse Icon */}
                            <div className={nodeColors.text}>
                                {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                )}
                            </div>

                            {/* Node Name */}
                            <span
                                className={`font-bold text-[11px] ${nodeColors.text} uppercase tracking-wide`}
                            >
                                {node.event.nodeId}
                            </span>

                            {/* node_start badge */}
                            <span
                                className={`font-mono text-[8px] px-1.5 py-0.5 rounded ${nodeColors.badge} opacity-70`}
                            >
                                START
                            </span>

                            {/* Event count */}
                            <span className="text-[9px] text-muted-foreground/60 font-mono">
                                ({node.children.length} events)
                            </span>

                            {/* Timestamp */}
                            <span className="text-[8px] text-muted-foreground/70 ml-auto font-mono">
                                {new Date(
                                    node.event.timestamp
                                ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                    fractionalSecondDigits: 3,
                                })}
                            </span>
                        </button>

                        {/* Payload (if exists) */}
                        {node.event.payload && (
                            <div className="px-3 pb-2 text-[9px] text-muted-foreground/80 font-mono">
                                <code className="break-all">
                                    {JSON.stringify(
                                        node.event.payload,
                                        null,
                                        2
                                    ).slice(0, 150)}
                                    {JSON.stringify(node.event.payload).length >
                                        150 && "..."}
                                </code>
                            </div>
                        )}

                        {/* Children Events */}
                        {isExpanded && (
                            <div className="border-t border-border/30">
                                <div className="p-2 space-y-0.5">
                                    {node.children
                                        .filter(
                                            (child) =>
                                                !child.event.type
                                                    .toLowerCase()
                                                    .includes("node_end")
                                        )
                                        .map((child) => renderEventNode(child))}
                                </div>

                                {/* Node End Footer */}
                                {(() => {
                                    const endEvent = node.children.find(
                                        (child) =>
                                            child.event.type
                                                .toLowerCase()
                                                .includes("node_end")
                                    );
                                    if (endEvent) {
                                        return (
                                            <div className="border-t border-border/30 bg-black/5 dark:bg-white/5">
                                                <div className="flex items-center gap-2 px-3 py-1.5">
                                                    {/* End bullet */}
                                                    <div
                                                        className={`w-2 h-2 rounded-full ${nodeColors.bullet}`}
                                                    />

                                                    {/* Node Name */}
                                                    <span
                                                        className={`font-bold text-[10px] ${nodeColors.text} uppercase tracking-wide`}
                                                    >
                                                        {endEvent.event.nodeId}
                                                    </span>

                                                    {/* node_end badge */}
                                                    <span
                                                        className={`font-mono text-[8px] px-1.5 py-0.5 rounded ${nodeColors.badge} opacity-70`}
                                                    >
                                                        END
                                                    </span>

                                                    {/* Payload (duration, etc) */}
                                                    {endEvent.event.payload && (
                                                        <span className="text-[9px] text-muted-foreground/70 font-mono">
                                                            {typeof endEvent
                                                                .event
                                                                .payload ===
                                                                "object" &&
                                                                "durationMs" in
                                                                    endEvent
                                                                        .event
                                                                        .payload &&
                                                                `${endEvent.event.payload.durationMs}ms`}
                                                            {typeof endEvent
                                                                .event
                                                                .payload ===
                                                                "object" &&
                                                                "totalDurationMs" in
                                                                    endEvent
                                                                        .event
                                                                        .payload &&
                                                                `${endEvent.event.payload.totalDurationMs}ms`}
                                                        </span>
                                                    )}

                                                    {/* Timestamp */}
                                                    <span className="text-[8px] text-muted-foreground/70 ml-auto font-mono">
                                                        {new Date(
                                                            endEvent.event.timestamp
                                                        ).toLocaleTimeString(
                                                            [],
                                                            {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                                second: "2-digit",
                                                                fractionalSecondDigits: 3,
                                                            }
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // Regular event (not a node_start, or node_start without children)
        return (
            <div
                key={eventKey}
                className="relative"
                style={{ paddingLeft: `${node.depth * indentWidth}px` }}
            >
                {/* Event Row */}
                <div
                    className={`group hover:bg-muted/40 transition-all rounded-md px-3 py-1 font-mono ${
                        isNodeEnd
                            ? `${nodeColors.bg} border-l-2 ${nodeColors.border}`
                            : ""
                    }`}
                >
                    {/* Tree Lines - show vertical line for indented items */}
                    {node.depth > 0 && (
                        <>
                            {/* Vertical guide line */}
                            <div
                                className={`absolute top-0 bottom-0 w-px ${nodeColors.border} opacity-30`}
                                style={{
                                    left: `-4px`,
                                }}
                            />
                            {/* Horizontal connector (L shape) */}
                            <div
                                className={`absolute w-4 h-px ${nodeColors.border} opacity-30`}
                                style={{
                                    left: `-4px`,
                                    top: "50%",
                                }}
                            />
                        </>
                    )}

                    <div className="flex items-start gap-2 relative">
                        {/* Expand/Collapse Icon or Bullet */}
                        {hasChildren ? (
                            <button
                                onClick={() => toggleEvent(eventKey)}
                                className={`mt-1 hover:text-foreground transition-colors shrink-0 z-10 ${nodeColors.text}`}
                            >
                                {isExpanded ? (
                                    <ChevronDown className="w-3 h-3" />
                                ) : (
                                    <ChevronRight className="w-3 h-3" />
                                )}
                            </button>
                        ) : (
                            <div className="w-3 shrink-0 flex items-center justify-center mt-1">
                                <div
                                    className={`w-1.5 h-1.5 rounded-full ${
                                        isNodeStart || isNodeEnd
                                            ? nodeColors.bullet
                                            : "bg-border"
                                    }`}
                                />
                            </div>
                        )}

                        {/* Event Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span
                                    className={`font-semibold text-[11px] ${nodeColors.text}`}
                                >
                                    {node.event.nodeId}
                                </span>
                                <span
                                    className={`text-[10px] ${nodeColors.text} opacity-50`}
                                >
                                    →
                                </span>
                                <span
                                    className={`font-mono text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap ${
                                        node.event.type.includes("ERROR")
                                            ? "bg-destructive/10 text-destructive"
                                            : isNodeStart || isNodeEnd
                                            ? `${nodeColors.badge} font-bold`
                                            : "bg-muted/50 text-muted-foreground"
                                    }`}
                                >
                                    {node.event.type}
                                </span>
                                <span className="text-[8px] text-muted-foreground/70 ml-auto font-mono">
                                    {new Date(
                                        node.event.timestamp
                                    ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                        fractionalSecondDigits: 3,
                                    })}
                                </span>
                            </div>

                            {/* Payload (if exists) */}
                            {node.event.payload &&
                                (!hasChildren || isExpanded) && (
                                    <div className="text-[9px] text-muted-foreground/80 mt-1.5 pl-1 border-l-2 border-border/30 ml-0.5">
                                        <code className="break-all">
                                            {JSON.stringify(
                                                node.event.payload,
                                                null,
                                                2
                                            ).slice(0, 200)}
                                            {JSON.stringify(node.event.payload)
                                                .length > 200 && "..."}
                                        </code>
                                    </div>
                                )}
                        </div>
                    </div>
                </div>

                {/* Children (recursively rendered) */}
                {hasChildren && isExpanded && (
                    <div className="relative">
                        {node.children.map((child) => renderEventNode(child))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 animate-in slide-in-from-right-4 duration-300 overflow-y-auto">
            <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-muted/40 border rounded-2xl p-5 shadow-inner">
                        <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2 font-black">
                            Total Comms
                        </div>
                        <div className="text-4xl font-black text-foreground tracking-tighter">
                            {messages.length}
                        </div>
                    </div>
                    <div className="bg-muted/40 border rounded-2xl p-5 shadow-inner">
                        <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2 font-black">
                            Realtime Trace
                        </div>
                        <div className="text-xs font-mono text-primary mt-2 font-bold tracking-tighter uppercase">
                            {events.length} Events
                        </div>
                    </div>
                </div>

                <div className="bg-muted/40 border rounded-3xl p-6 shadow-inner relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-primary">
                        <Zap className="w-8 h-8" />
                    </div>
                    <div className="flex justify-between items-center mb-6">
                        <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-black">
                            Engine Status
                        </div>
                        <Badge
                            variant="outline"
                            className={`flex items-center gap-2 text-[9px] font-black px-3 py-1 rounded-full border-0 ${
                                loading
                                    ? "bg-yellow-500/10 text-yellow-500 dark:bg-yellow-500/20"
                                    : "bg-green-500/10 text-green-500 dark:bg-green-500/20"
                            }`}
                        >
                            <div
                                className={`w-1.5 h-1.5 rounded-full ${
                                    loading
                                        ? "bg-yellow-500 animate-pulse"
                                        : "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                                }`}
                            />
                            {loading ? "PROCESSING" : "READY_STANDBY"}
                        </Badge>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-muted-foreground">
                                Volatile Memory
                            </span>
                            <span className="text-foreground">42.8 MB</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden border">
                            <div className="h-full bg-primary w-1/3 rounded-full shadow-[0_0_10px_var(--primary)]" />
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-black flex items-center gap-2">
                                            <span
                                className={`w-1 h-1 rounded-full ${
                                    devMode
                                        ? "bg-yellow-500 animate-pulse"
                                        : "bg-primary"
                                }`}
                            />
                            {devMode
                                ? "Dev Mode - Sample Trace"
                                : "Live Flow Trace"}{" "}
                            (Execution Tree)
                            {devMode && (
                                <Badge
                                    variant="outline"
                                    className="text-[8px] h-4 px-1.5 bg-yellow-500/10 text-yellow-500 border-yellow-500/20 ml-2"
                                >
                                    MOCK DATA
                                </Badge>
                            )}
                        </div>
                        {/* Color Legend */}
                        <div className="flex items-center gap-2 text-[8px]">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span className="text-muted-foreground">
                                    Search
                                            </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="text-muted-foreground">
                                    Analysis
                                            </span>
                                        </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                <span className="text-muted-foreground">
                                    LLM
                                </span>
                                        </div>
                                        </div>
                                    </div>
                    <div className="pr-1 bg-muted/10 rounded-xl p-3 pl-6 font-mono text-xs">
                        {events.length > 0 ? (
                            <div className="space-y-0.5">
                                {eventTree.map((node) => renderEventNode(node))}
                            </div>
                        ) : (
                            <div className="text-muted-foreground text-center py-16 border border-dashed rounded-3xl font-bold uppercase tracking-widest text-[10px]">
                                {devMode
                                    ? "No sample data"
                                    : "Trace buffer empty"}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
