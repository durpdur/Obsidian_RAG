import { useMemo } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    Chip,
    Icon,
    Stack,
    TextField,
    Typography,
    useTheme,
} from "@mui/material";
import type { Msg, SearchResult } from "../../types/global";

type ChatThreadContentProps = {
    messages: Msg[];
    lastError: string | null;
    lastRetrieved: SearchResult[];
    input: string;
    setInput: (value: string) => void;
    send: () => void;
    isGenerating: boolean;
    chatModelReady: boolean;
    starting: boolean;
};

type PromptCardProps = {
    icon: React.ReactNode;
    title: string;
    body: string;
    wide?: boolean;
    onClick?: () => void;
};

function PromptCard({ icon, title, body, wide, onClick }: PromptCardProps) {
    const theme = useTheme();

    return (
        <Card
            variant="outlined"
            onClick={onClick}
            sx={{
                p: 2.25,
                cursor: onClick ? "pointer" : "default",
                backgroundColor: theme.palette.surface.low,
                borderColor: "transparent",
                transition: "all 180ms ease",
                gridColumn: wide ? { md: "span 2" } : undefined,
                "&:hover": {
                    backgroundColor: theme.palette.surface.high,
                    borderColor: "rgba(72,72,72,0.35)",
                },
            }}
        >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Box sx={{ color: theme.palette.secondary.main, display: "flex" }}>{icon}</Box>
                <Typography
                    variant="caption"
                    sx={{
                        color: theme.palette.text.secondary,
                        opacity: 0.7,
                    }}
                >
                    ↗
                </Typography>
            </Stack>

            <Typography variant="subtitle1" sx={{ mb: 0.5, fontWeight: 600 }}>
                {title}
            </Typography>

            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, lineHeight: 1.6 }}>
                {body}
            </Typography>
        </Card>
    );
}

function ChatBubble({ message, isGenerating }: { message: Msg; isGenerating: boolean }) {
    const theme = useTheme();
    const isUser = message.role === "user";

    return (
        <Box
            sx={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
            }}
        >
            <Box
                sx={{
                    maxWidth: { xs: "92%", md: "78%" },
                    px: 1.75,
                    py: 1.4,
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.outline.variant}`,
                    backgroundColor: isUser
                        ? "rgba(209, 188, 255, 0.10)"
                        : theme.palette.surface.mid,
                    backdropFilter: "blur(10px)",
                }}
            >
                <Typography
                    variant="caption"
                    sx={{
                        display: "block",
                        mb: 0.5,
                        color: isUser ? theme.palette.primary.main : theme.palette.text.secondary,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                    }}
                >
                    {isUser ? "You" : "Assistant"}
                </Typography>

                <Typography
                    variant="body2"
                    sx={{
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.6,
                        color: theme.palette.text.primary,
                    }}
                >
                    {message.content || (!isUser && isGenerating ? "…" : "")}
                </Typography>
            </Box>
        </Box>
    );
}

function ChatThreadContent({
    messages,
    lastError,
    lastRetrieved,
    input,
    setInput,
    send,
    isGenerating,
    chatModelReady,
    starting,
}: ChatThreadContentProps) {
    const theme = useTheme();

    const visibleMessages = useMemo(
        () => messages.filter((m) => m.role !== "system"),
        [messages]
    );

    const hasConversation = visibleMessages.length > 0;

    const suggestionPrompts = [
        "What causes a false burrow alert at South Lintel?",
        "What is the threshold for acceptable hydrophone cleaning recovery?",
        "Which site is most affected by trench-driven salinity pulses in Needle Rain season?",
    ];

    return (
        <Box
            sx={{
                position: "relative",
                minHeight: "calc(100vh - 120px)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                overflow: "hidden",
            }}
        >
            {/* Background glow */}
            <Box
                sx={{
                    position: "absolute",
                    top: -140,
                    right: -160,
                    width: 420,
                    height: 420,
                    borderRadius: "50%",
                    background: "rgba(209, 188, 255, 0.06)",
                    filter: "blur(100px)",
                    pointerEvents: "none",
                }}
            />
            <Box
                sx={{
                    position: "absolute",
                    left: -100,
                    bottom: -100,
                    width: 280,
                    height: 280,
                    borderRadius: "50%",
                    background: "rgba(96, 56, 178, 0.12)",
                    filter: "blur(90px)",
                    pointerEvents: "none",
                }}
            />

            <Box
                sx={{
                    position: "relative",
                    zIndex: 1,
                    flex: 1,
                    width: "100%",
                    maxWidth: 980,
                    mx: "auto",
                    px: { xs: 2, md: 3 },
                    pt: { xs: 2, md: 3 },
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: hasConversation ? "flex-start" : "center",
                }}
            >
                {lastError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {lastError}
                    </Alert>
                )}

                {!hasConversation ? (
                    <Box
                        sx={{
                            width: "100%",
                            maxWidth: 760,
                            mx: "auto",
                            textAlign: "center",
                            py: { xs: 4, md: 8 },
                        }}
                    >
                        <Box
                            sx={{
                                mb: 3,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                p: 2,
                                borderRadius: 2,
                                border: `1px solid ${theme.palette.outline.variant}`,
                                backgroundColor: theme.palette.surface.high,
                            }}
                        >
                            <Icon sx={{ fontSize: 50, color: theme.palette.primary.main }}>tokens</Icon>
                        </Box>

                        <Typography
                            sx={{
                                fontSize: { xs: 34, md: 56 },
                                lineHeight: 1.05,
                                fontWeight: 700,
                                letterSpacing: "-0.03em",
                                mb: 2,
                            }}
                        >
                            Hi Obi.{" "}
                            <Box component="span" sx={{ color: "rgba(209, 188, 255, 0.8)" }}>
                                What's in my vault?
                            </Box>
                        </Typography>

                        <Typography
                            variant="body1"
                            sx={{
                                maxWidth: 560,
                                mx: "auto",
                                color: theme.palette.text.secondary,
                                lineHeight: 1.75,
                                mb: 5,
                                fontSize: { xs: 15, md: 18 },
                            }}
                        >
                            Access your private knowledge base, processed entirely on your local hardware.
                        </Typography>

                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                                gap: 2,
                                textAlign: "left",
                            }}
                        >
                            <PromptCard
                                icon={<Icon>stars_2</Icon>}
                                title="Synthesize my notes"
                                body={suggestionPrompts[0]}
                                onClick={() => setInput(suggestionPrompts[0])}
                            />
                            <PromptCard
                                icon={<Icon>terminal</Icon>}
                                title="Audit security logs"
                                body={suggestionPrompts[1]}
                                onClick={() => setInput(suggestionPrompts[1])}
                            />
                            <PromptCard
                                icon={<Icon>inventory_2</Icon>}
                                title='Deep search: "Zero-Knowledge Proofs"'
                                body={suggestionPrompts[2]}
                                wide
                                onClick={() => setInput(suggestionPrompts[2])}
                            />
                        </Box>
                    </Box>
                ) : (
                    <Card
                        variant="outlined"
                        sx={{
                            mt: 1,
                            backgroundColor: "rgba(19, 19, 19, 0.72)",
                            backdropFilter: "blur(12px)",
                            borderColor: "rgba(72,72,72,0.8)",
                            overflow: "hidden",
                        }}
                    >
                        <Box
                            sx={{
                                px: 2,
                                py: 1.25,
                                borderBottom: `1px solid ${theme.palette.outline.variant}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{
                                    color: theme.palette.text.secondary,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                }}
                            >
                                Conversation
                            </Typography>

                            {lastRetrieved.length > 0 && (
                                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                                    {lastRetrieved.map((r) => (
                                        <Chip
                                            key={r.chunkId}
                                            size="small"
                                            variant="outlined"
                                            label={`${r.fileName} · ${r.distance.toFixed(2)}`}
                                            sx={{
                                                maxWidth: 220,
                                                height: 24,
                                                backgroundColor: theme.palette.surface.mid,
                                                borderColor: theme.palette.outline.variant,
                                                "& .MuiChip-label": {
                                                    px: 1,
                                                    fontSize: 11,
                                                    color: theme.palette.text.secondary,
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                },
                                            }}
                                        />
                                    ))}
                                </Stack>
                            )}
                        </Box>

                        <Stack
                            spacing={1.25}
                            sx={{
                                p: 2,
                                maxHeight: 540,
                                overflowY: "auto",
                            }}
                        >
                            {visibleMessages.map((m, i) => (
                                <ChatBubble key={i} message={m} isGenerating={isGenerating} />
                            ))}
                        </Stack>
                    </Card>
                )}
            </Box>

            {/* Composer */}
            <Box
                sx={{
                    position: "relative",
                    zIndex: 1,
                    width: "100%",
                    maxWidth: 980,
                    mx: "auto",
                    px: { xs: 2, md: 3 },
                    pb: { xs: 3, md: 4 },
                    pt: 2,
                }}
            >
                <Box sx={{ position: "relative" }}>
                    <Box
                        sx={{
                            position: "absolute",
                            inset: 0,
                            borderRadius: 3,
                            background: "rgba(209, 188, 255, 0.06)",
                            filter: "blur(20px)",
                            pointerEvents: "none",
                        }}
                    />

                    <Card
                        variant="outlined"
                        sx={{
                            position: "relative",
                            overflow: "hidden",
                            backgroundColor: "rgba(38, 38, 38, 0.78)",
                            backdropFilter: "blur(18px)",
                            borderColor: "rgba(72,72,72,0.5)",
                            borderRadius: 3,
                        }}
                    >
                        <Box
                            sx={{
                                px: 2,
                                py: 1.25,
                                borderBottom: "1px solid rgba(72,72,72,0.35)",
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                                flexWrap: "wrap",
                            }}
                        >
                            <Button
                                variant="text"
                                startIcon={<Icon sx={{ fontSize: 18 }}>attach_file</Icon>}
                                sx={{
                                    minWidth: 0,
                                    p: 0,
                                    color: theme.palette.text.secondary,
                                    textTransform: "none",
                                    justifyContent: "flex-start",
                                    fontSize: 10,
                                    letterSpacing: "0.08em",
                                    fontFamily: `'Space Grotesk', sans-serif`,
                                    "& .MuiButton-startIcon": {
                                        mr: 0.75,
                                    },
                                    "& .MuiSvgIcon-root, & .MuiIcon-root": {
                                        fontSize: 18,
                                    },
                                    "&:hover": {
                                        backgroundColor: "transparent",
                                        color: theme.palette.primary.main,
                                    },
                                }}
                            >
                                <Box
                                    component="span"
                                    sx={{
                                        textTransform: "uppercase",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    Reference Vault
                                </Box>
                            </Button>

                            <Button
                                variant="text"
                                startIcon={<Icon sx={{ fontSize: 18 }}>image</Icon>}
                                sx={{
                                    minWidth: 0,
                                    p: 0,
                                    color: theme.palette.text.secondary,
                                    textTransform: "none",
                                    justifyContent: "flex-start",
                                    fontSize: 10,
                                    letterSpacing: "0.08em",
                                    fontFamily: `'Space Grotesk', sans-serif`,
                                    "& .MuiButton-startIcon": {
                                        mr: 0.75,
                                    },
                                    "& .MuiSvgIcon-root, & .MuiIcon-root": {
                                        fontSize: 18,
                                    },
                                    "&:hover": {
                                        backgroundColor: "transparent",
                                        color: theme.palette.primary.main,
                                    },
                                }}
                            >
                                <Box
                                    component="span"
                                    sx={{
                                        textTransform: "uppercase",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    Canvas
                                </Box>
                            </Button>
                        </Box>

                        {lastRetrieved.length > 0 && !hasConversation && (
                            <Box
                                sx={{
                                    px: 2,
                                    pt: 1.5,
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 0.75,
                                }}
                            >
                                {lastRetrieved.map((r) => (
                                    <Chip
                                        key={r.chunkId}
                                        size="small"
                                        variant="outlined"
                                        label={`${r.fileName} · ${r.distance.toFixed(2)}`}
                                        sx={{
                                            maxWidth: 220,
                                            height: 24,
                                            backgroundColor: theme.palette.surface.mid,
                                            borderColor: theme.palette.outline.variant,
                                            "& .MuiChip-label": {
                                                px: 1,
                                                fontSize: 11,
                                                color: theme.palette.text.secondary,
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            },
                                        }}
                                    />
                                ))}
                            </Box>
                        )}

                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "flex-end",
                                gap: 1.5,
                                p: 2,
                            }}
                        >
                            <TextField
                                fullWidth
                                multiline
                                minRows={2}
                                maxRows={8}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Describe your query..."
                                disabled={!chatModelReady || starting}
                                variant="outlined"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey && !(e as any).isComposing) {
                                        e.preventDefault();
                                        send();
                                    }
                                }}
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        backgroundColor: "transparent",
                                        borderRadius: 2,
                                        alignItems: "flex-start",
                                        "& fieldset": {
                                            borderColor: "transparent",
                                        },
                                        "&:hover fieldset": {
                                            borderColor: "transparent",
                                        },
                                        "&.Mui-focused fieldset": {
                                            borderColor: "transparent",
                                        },
                                    },
                                    "& textarea": {
                                        py: 0.5,
                                    },
                                }}
                            />

                            <Button
                                variant="contained"
                                onClick={send}
                                disabled={
                                    !chatModelReady || starting || isGenerating || !input.trim()
                                }
                                sx={{
                                    minWidth: 44,
                                    width: 44,
                                    height: 44,
                                    borderRadius: 2,
                                    p: 0,
                                }}
                            >
                                <Icon>arrow_forward</Icon>
                            </Button>
                        </Box>

                        <Box
                            sx={{
                                px: 2,
                                py: 1,
                                backgroundColor: "rgba(0,0,0,0.18)",
                                borderTop: `1px solid rgba(72,72,72,0.28)`,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 2,
                                flexWrap: "wrap",
                            }}
                        >
                            <Stack direction="row" spacing={0.75} alignItems="center">
                                <Icon>lock</Icon>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: theme.palette.text.secondary,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.08em",
                                    }}
                                >
                                    End-to-End Encrypted Session
                                </Typography>
                            </Stack>

                            <Typography
                                variant="caption"
                                sx={{
                                    color: "rgba(172,171,170,0.6)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                }}
                            >
                                {isGenerating ? "Generating…" : "Tokens: 0/32k"}
                            </Typography>
                        </Box>
                    </Card>
                </Box>

                <Typography
                    variant="caption"
                    sx={{
                        display: "block",
                        textAlign: "center",
                        mt: 1.5,
                        color: "rgba(172,171,170,0.4)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                    }}
                >
                    Obi is local. Your data never leaves this machine.
                </Typography>
            </Box>
        </Box>
    );
}

export default ChatThreadContent;