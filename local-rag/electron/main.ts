import { app, BrowserWindow, ipcMain } from "electron"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { LlamaSidecar } from "./llamaSidecar.js";

const isDev = !app.isPackaged
// if (isDev) console.log("Dev URL:", process.env.VITE_DEV_SERVER_URL);

// - Environment variables -----------------------------
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


// - Registering the llamaSideCare ----------------------
const llama = new LlamaSidecar();

function registerLlamaIpc() {
    ipcMain.handle("llama:start", async () => {
        await llama.start();
        return llama.getStatus();
    });

    ipcMain.handle("llama:status", async () => {
        return llama.getStatus();
    });

    ipcMain.handle("llama:stop", async () => {
        llama.stop();
        return llama.getStatus();
    });

    ipcMain.handle("llama:chat", async (_event, messages) => {
        return await llama.chatCompletions({
            model: "local-model",
            messages,
            temperature: 0.7,
            stream: false,
        });
    });
}

// - Streaming llama ipc handler -----------------------
// keep a map so you can cancel a stream per renderer
const streamAborters = new Map<number, AbortController>();

ipcMain.on("llama:chat_stream_start", async (event, { requestId, messages, temperature }) => {
    // ensure sidecar is running
    if (llama.getStatus().status !== "running") {
        try { await llama.start(); } catch (e: any) {
            event.sender.send("llama:chat_stream_error", { requestId, error: String(e?.message ?? e) });
            return;
        }
    }

    const wcId = event.sender.id;
    const ac = new AbortController();
    streamAborters.set(wcId, ac);

    try {
        const res = await fetch(`${llama.getStatus().baseUrl}/v1/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: ac.signal,
            body: JSON.stringify({
                model: "local-model",
                messages,
                temperature: temperature ?? 0.7,
                stream: true, // ✅ SSE
            }),
        });

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

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

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
                        const delta = json?.choices?.[0]?.delta?.content ?? "";
                        if (delta) {
                            event.sender.send("llama:chat_stream_delta", { requestId, delta });
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

// - Creates window --------------------------
function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, "preload.mjs"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    })

    if (isDev) {
        const devUrl = process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173";
        win.loadURL(devUrl);
        // win.webContents.openDevTools()
    } else {
        win.loadFile(path.join(__dirname, "../dist/index.html"))
    }
}

app.whenReady().then(async () => {
    registerLlamaIpc();
    createWindow();
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit()
})

app.on("before-quit", () => {
    llama.stop();
});