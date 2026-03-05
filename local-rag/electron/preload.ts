import { contextBridge, ipcRenderer } from "electron"

type Msg = { role: "system" | "user" | "assistant"; content: string };

// Example API
contextBridge.exposeInMainWorld("api", {
    ping: () => "pong"
})

contextBridge.exposeInMainWorld("llama", {
    // llama lifecycle APIs
    start: () => ipcRenderer.invoke("llama:start"),
    status: () => ipcRenderer.invoke("llama:status"),
    stop: () => ipcRenderer.invoke("llama:stop"),
    chat: (messages: Array<{ role: string; content: string }>) =>
        ipcRenderer.invoke("llama:chat", messages),

    // Streaming APIs
    chatStreamStart: (params: { requestId: string; messages: Msg[]; temperature?: number }) =>
        ipcRenderer.send("llama:chat_stream_start", params),

    chatStreamCancel: () => ipcRenderer.send("llama:chat_stream_cancel"),

    onChatStreamDelta: (cb: (payload: { requestId: string; delta: string }) => void) => {
        const handler = (_: any, payload: any) => cb(payload);
        ipcRenderer.on("llama:chat_stream_delta", handler);
        return () => ipcRenderer.removeListener("llama:chat_stream_delta", handler);
    },

    onChatStreamDone: (cb: (payload: { requestId: string }) => void) => {
        const handler = (_: any, payload: any) => cb(payload);
        ipcRenderer.on("llama:chat_stream_done", handler);
        return () => ipcRenderer.removeListener("llama:chat_stream_done", handler);
    },

    onChatStreamError: (cb: (payload: { requestId: string; error: string }) => void) => {
        const handler = (_: any, payload: any) => cb(payload);
        ipcRenderer.on("llama:chat_stream_error", handler);
        return () => ipcRenderer.removeListener("llama:chat_stream_error", handler);
    },
});