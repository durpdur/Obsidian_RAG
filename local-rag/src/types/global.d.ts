export { };

type ChatRole = "system" | "user" | "assistant";

export type Msg = {
    role: ChatRole;
    content: string;
};

export type SidecarStatus = "stopped" | "starting" | "running" | "error";

export type LlamaStatus = {
    status: SidecarStatus;
    port: number;
    baseUrl: string;
};

export interface LlamaApi {
    // Lifecycle
    start(): Promise<LlamaStatus>;
    status(): Promise<LlamaStatus>;
    stop(): Promise<LlamaStatus>;

    // Non-streaming chat
    chat(messages: Msg[]): Promise<any>;

    // Streaming
    chatStreamStart(params: {
        requestId: string;
        messages: Msg[];
        temperature?: number;
    }): void;

    chatStreamCancel(): void;

    onChatStreamDelta(
        cb: (payload: { requestId: string; delta: string }) => void
    ): () => void;

    onChatStreamDone(
        cb: (payload: { requestId: string }) => void
    ): () => void;

    onChatStreamError(
        cb: (payload: { requestId: string; error: string }) => void
    ): () => void;
}

declare global {
    interface Window {
        llama: LlamaApi;
    }
}