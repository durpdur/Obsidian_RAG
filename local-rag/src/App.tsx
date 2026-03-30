import { useEffect, useMemo, useRef, useState } from "react";
import FileWatcherPicker from "./components/FileWatcherPicker";
import type { SearchResult, Msg, LlamaStatus } from "./types/global";
import AppShell from "./components/layout/AppShell";
import SidebarNav from "./components/layout/SidebarNav";
import MainCanvas from "./components/layout/MainCanvas";
import ChatThreadTopBar from "./components/chatThread/ChatThreadTopBar";
import ChatThreadContent from "./components/chatThread/ChatTheadContent";

type NavKey = 'chat' | 'files' | 'vault' | 'history' | 'storage' | 'help';

type AppProps = {
    selectedTheme: 'light' | 'dark';
    onToggleTheme: () => void;
};

function App({ selectedTheme, onToggleTheme }: AppProps) {
    /******************************************** 
    * Layout States
    ********************************************/
    const [sideNavActiveItem, setSideNavActiveItem] = useState<NavKey>(`chat`);

    /******************************************** 
    * States  
    --------------------------------------
    - Chat Model
    - Embedding Model
    - File Watcher
    - Database (Maybe)
    ********************************************/
    // Overall App State
    const [starting, setStarting] = useState(true);

    // Chat Model
    const [chatModelReady, setChatModelReady] = useState(false);
    const [chatModelStatus, setChatModelStatus] = useState<LlamaStatus | null>(null);

    // Messages
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Msg[]>([
        { role: "system", content: "You are a helpful assistant." },
    ]);

    // Chat Stream
    const [lastRetrieved, setLastRetrieved] = useState<SearchResult[]>([]);

    const [isGenerating, setIsGenerating] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);

    const messagesRef = useRef<Msg[]>(messages);

    useEffect(() => {
        let mounted = true;

        (async () => {
            setStarting(true);
            setLastError(null);
            try {
                await window.llama.start();
                await window.api.embedder.start();
                const st: LlamaStatus = await window.llama.status();
                if (!mounted) return;
                setChatModelStatus(st);
                setChatModelReady(st.status === "running" || st.status === "starting"); // allow UI; chat guarded below
            } catch (e: any) {
                if (!mounted) return;
                setLastError(String(e?.message ?? e));
                setChatModelReady(false);
                setChatModelStatus({ status: "error", port: 0, baseUrl: "", modelType: "" });
            } finally {
                if (mounted) setStarting(false);
            }
        })();

        const interval = setInterval(async () => {
            try {
                const st: LlamaStatus = await window.llama.status();
                if (mounted) setChatModelStatus(st);
            } catch {
                // ignore
            }
        }, 1500);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    const stop = () => {
        try {
            window.llama.chatStreamCancel?.();
        } catch {
            // ignore
        }
        setIsGenerating(false);
    };

    const send = async () => {
        const content = input.trim();
        if (!content || isGenerating) return;

        setLastError(null);
        setInput("");

        const userMsg: Msg = { role: "user", content };

        // Optimistic UI update: add user message + empty assistant message (we'll fill it with deltas)
        setMessages((prev) => [...prev, userMsg, { role: "assistant", content: "" }]);

        // Unique requestId for routing events
        const requestId =
            (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);

        setIsGenerating(true);

        // NEW: retrieve relevant chunks before calling the model
        let ragResults: SearchResult[] = [];
        let ragSystemMsg: Msg | null = null;

        try {
            ragResults = await window.api.rag.search(content, 5);
            setLastRetrieved(ragResults);
            ragSystemMsg = buildRagSystemMessage(ragResults);
        } catch (e: any) {
            // retrieval failure should not necessarily block chat
            console.error("RAG search failed:", e);
            setLastError(`RAG search failed: ${String(e?.message ?? e)}`);
        }

        const history = messagesRef.current;
        const nextMessages = ragSystemMsg
            ? [...history, ragSystemMsg, userMsg]
            : [...history, userMsg];


        // Subscribe to streaming events
        const offDelta = window.llama.onChatStreamDelta?.((payload: any) => {
            if (payload?.requestId !== requestId) return;
            const delta = String(payload?.delta ?? "");
            if (!delta) return;

            setMessages((prev) => {
                const i = prev.length - 1;
                const last = prev[i];
                if (!last || last.role !== "assistant") return prev;

                const next = prev.slice();
                next[i] = { ...last, content: last.content + delta };
                return next;
            });
        });

        const cleanup = () => {
            try { offDelta?.(); } catch { }
            try { offDone?.(); } catch { }
            try { offErr?.(); } catch { }
        };

        const offDone = window.llama.onChatStreamDone?.((payload: any) => {
            if (payload?.requestId !== requestId) return;
            setIsGenerating(false);
            cleanup();
        });

        const offErr = window.llama.onChatStreamError?.((payload: any) => {
            if (payload?.requestId !== requestId) return;
            setIsGenerating(false);
            setLastError(String(payload?.error ?? "Unknown error"));
            // Replace the empty assistant bubble with the error (or append)
            setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.role === "assistant" && !last.content) {
                    last.content = `⚠️ ${String(payload?.error ?? "Unknown error")}`;
                    return copy;
                }
                return [...copy, { role: "assistant", content: `⚠️ ${String(payload?.error ?? "Unknown error")}` }];
            });
            cleanup();
        });

        // Start the stream
        try {
            if (!window.llama.chatStreamStart) {
                throw new Error("Streaming API not available on window.llama");
            }
            window.llama.chatStreamStart({
                requestId,
                messages: nextMessages,
                temperature: 0.2,
            });
        } catch (e: any) {
            setIsGenerating(false);
            setLastError(String(e?.message ?? e));
            cleanup();
        }
    };

    const buildRagSystemMessage = (results: SearchResult[]): Msg | null => {
        if (!results.length) return null;

        const context = results
            .map((r, i) => {
                return [
                    `Source ${i + 1}:`,
                    `File: ${r.fileName}`,
                    `Path: ${r.documentPath}`,
                    `Distance: ${r.distance}`,
                    `Content:`,
                    r.content,
                ].join("\n");
            })
            .join("\n\n---\n\n");

        return {
            role: "system",
            content:
                "Use the retrieved context below to answer the user's question. " +
                "Prefer the retrieved context when it is relevant. " +
                "If the context is insufficient, say so plainly.\n\n" +
                context,
        };
    };

    const renderCanvasContent = () => {
        switch (sideNavActiveItem) {
            case "chat":
                return (
                    <ChatThreadContent
                        messages={messages}
                        lastError={lastError}
                        lastRetrieved={lastRetrieved}
                        input={input}
                        setInput={setInput}
                        send={send}
                        stop={stop}
                        isGenerating={isGenerating}
                        chatModelReady={chatModelReady}
                        starting={starting}
                    />
                );

            case "files":
                return <FileWatcherPicker />;

            case "vault":
                return <div>Vault view</div>;

            case "history":
                return <div>History view</div>;

            case "storage":
                return <div>Storage view</div>;

            case "help":
                return <div>Help view</div>;

            default:
                return null;
        }
    };

    return (
        <AppShell
            sideBar={
                <SidebarNav
                    activeItem={sideNavActiveItem}
                    onSelect={setSideNavActiveItem}
                    onNewChat={() => setSideNavActiveItem('chat')}
                    selectedTheme={selectedTheme}
                    onThemeChange={onToggleTheme}
                />}
            mainCanvas={
                <MainCanvas
                    topBar={
                        <ChatThreadTopBar
                            starting={starting}
                            chatModelStatus={chatModelStatus}
                            sessionLabel={sideNavActiveItem}
                            homeLabel="Home"
                            statusLabel={chatModelStatus?.status ?? "unknown"}
                        />
                    }

                    canvasContent={renderCanvasContent()}

                    bottomDock={<div></div>}
                />
            }
        />
    );
}

export default App;