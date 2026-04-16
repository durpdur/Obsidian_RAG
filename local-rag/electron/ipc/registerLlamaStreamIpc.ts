import { ipcMain } from "electron";
import { llama, streamAborters } from "../services.js";
import { weatherTools } from "../tools/tools";

/* -- Chat Model Streaming IPC -----------------------
    steamAborters: { webContent.id : AbortController}
    ------------------------------------------------------
    llama:chat_stream_start
    ARGS
    - requestId: For React to match deltas (Determines which page the stream gets rendered to)
    - messages: Chat history
    - temperature: Model temp, refer to chatModelTemperature
    ------------------------------------------------------
    llama:chat_stream_cancel
    DESC
    - React calls ipcRenderer => emits llama:chat_stream_cancel to abort stream
*/
const chatModelTemperature = 0.4;

export function registerLlamaStreamIpc() {
    ipcMain.on("llama:chat_stream_start", async (event, { requestId, messages, temperature }) => {
        if (llama.getStatus().status !== "running") {
            try { await llama.start(); } catch (e: any) {
                event.sender.send("llama:chat_stream_error", { requestId, error: String(e?.message ?? e) });
                return;
            }
        }

        // Registoring the webContent ID to allow the ability to cancel per stream
        const wcId = event.sender.id;
        const ac = new AbortController();
        streamAborters.set(wcId, ac);

        console.log(messages); // debug

        try {
            // Start fetch to local server with "stream: true" (SSE)
            const res = await fetch(`${llama.getStatus().baseUrl}/v1/chat/completions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: ac.signal,
                body: JSON.stringify({
                    model: "local-model",
                    messages,
                    tools: weatherTools,
                    temperature: temperature ?? chatModelTemperature,
                    stream: true,
                }),
            });

            // If fetch request fails, send error
            if (!res.ok || !res.body) {
                const txt = await res.text().catch(() => "");
                event.sender.send("llama:chat_stream_error", {
                    requestId,
                    error: `HTTP ${res.status}: ${txt}`,
                });
                return;
            }

            // Tell renderer stream started
            event.sender.send("llama:chat_stream_started", { requestId });

            // Read SSE text stream
            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";

            // Stream is bytes => decode to text => parse SSE frames
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true }); // decode to text

                // SSE frames separated by \n\n
                let idx;
                while ((idx = buffer.indexOf("\n\n")) !== -1) {
                    const frame = buffer.slice(0, idx);
                    buffer = buffer.slice(idx + 2);

                    // SSE lines: "data: {...}"
                    for (const line of frame.split("\n")) {
                        const trimmed = line.trim();
                        if (!trimmed.startsWith("data:")) continue;

                        const data = trimmed.slice(5).trim();
                        if (!data) continue;

                        if (data === "[DONE]") {
                            event.sender.send("llama:chat_stream_done", { requestId });
                            streamAborters.delete(wcId);
                            return;
                        }

                        // parse JSON chunk (OpenAI-style)
                        try {
                            const json = JSON.parse(data);
                            const choice = json?.choices?.[0];
                            const delta = choice?.delta;

                            const textDelta = delta?.content ?? "";
                            if (textDelta) {
                                event.sender.send("llama:chat_stream_delta", { requestId, delta: textDelta });
                            }

                            const toolCalls = delta?.tool_calls;
                            if (toolCalls) {
                                // console.log("TOOL CALL DELTA:", JSON.stringify(toolCalls, null, 2));
                                event.sender.send("llama:tool_call_delta", { requestId, toolCalls });
                            }
                        } catch {
                            // ignore malformed chunk
                        }
                    }
                }
            }

            event.sender.send("llama:chat_stream_done", { requestId });
        } catch (e: any) {
            const aborted = e?.name === "AbortError";
            event.sender.send("llama:chat_stream_error", {
                requestId,
                error: aborted ? "aborted" : String(e?.message ?? e),
            });
        } finally {
            streamAborters.delete(event.sender.id);
        }
    });

    ipcMain.on("llama:chat_stream_cancel", (event) => {
        const ac = streamAborters.get(event.sender.id);
        if (ac) ac.abort();
        streamAborters.delete(event.sender.id);
    });
}