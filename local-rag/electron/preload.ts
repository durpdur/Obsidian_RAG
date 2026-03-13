// preload.ts
import { contextBridge, ipcRenderer } from "electron";

type Msg = { role: "system" | "user" | "assistant"; content: string };

type StreamStartedPayload = { requestId: string };
type StreamDeltaPayload = { requestId: string; delta: string };
type StreamDonePayload = { requestId: string };
type StreamErrorPayload = { requestId: string; error: string };

contextBridge.exposeInMainWorld("llama", {
    // lifecycle APIs
    start: () => ipcRenderer.invoke("llama:start"),
    status: () => ipcRenderer.invoke("llama:status"),
    stop: () => ipcRenderer.invoke("llama:stop"),

    // non-streaming chat (Deprecated)
    chat: (messages: Msg[], temperature?: number) =>
        ipcRenderer.invoke("llama:chat", messages, temperature),

    // Chat Streaming controls
    chatStreamStart: (params: { requestId: string; messages: Msg[]; temperature?: number }) =>
        ipcRenderer.send("llama:chat_stream_start", params),

    chatStreamCancel: () => ipcRenderer.send("llama:chat_stream_cancel"),

    // Chat Streaming events
    onChatStreamStarted: (cb: (payload: StreamStartedPayload) => void) => {
        const handler = (_: unknown, payload: StreamStartedPayload) => cb(payload);
        ipcRenderer.on("llama:chat_stream_started", handler);
        return () => ipcRenderer.removeListener("llama:chat_stream_started", handler);
    },

    onChatStreamDelta: (cb: (payload: StreamDeltaPayload) => void) => {
        const handler = (_: unknown, payload: StreamDeltaPayload) => cb(payload);
        ipcRenderer.on("llama:chat_stream_delta", handler);
        return () => ipcRenderer.removeListener("llama:chat_stream_delta", handler);
    },

    onChatStreamDone: (cb: (payload: StreamDonePayload) => void) => {
        const handler = (_: unknown, payload: StreamDonePayload) => cb(payload);
        ipcRenderer.on("llama:chat_stream_done", handler);
        return () => ipcRenderer.removeListener("llama:chat_stream_done", handler);
    },

    onChatStreamError: (cb: (payload: StreamErrorPayload) => void) => {
        const handler = (_: unknown, payload: StreamErrorPayload) => cb(payload);
        ipcRenderer.on("llama:chat_stream_error", handler);
        return () => ipcRenderer.removeListener("llama:chat_stream_error", handler);
    },
});