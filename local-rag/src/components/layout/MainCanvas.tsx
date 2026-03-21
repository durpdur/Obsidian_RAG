import type { ReactNode } from 'react';
import { Box } from '@mui/material';

type MainCanvasProps = {
    topBar?: ReactNode;
    children: ReactNode;
    bottomDock?: ReactNode;
    contentMaxWidth?: number | string;
    centered?: boolean;
};

export default function MainCanvas({
    topBar,
    children,
    bottomDock,
    contentMaxWidth = 960,
    centered = true,
}: MainCanvasProps) {
    return (
        <Box
            sx={(theme) => ({
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: theme.palette.background.default,
            })}
        >
            {/* Top Bar */}
            {topBar && (
                <Box
                    sx={(theme) => ({
                        position: 'sticky',
                        top: 0,
                        zIndex: 20,
                        minHeight: 56,
                        display: 'flex',
                        alignItems: 'center',
                        px: 4,
                        backdropFilter: 'blur(12px)',
                        backgroundColor:
                            theme.palette.mode === 'dark'
                                ? 'rgba(14, 14, 14, 0.55)'
                                : 'rgba(252, 249, 248, 0.78)',
                        borderBottom: `1px solid ${theme.palette.outline.variant}`,
                    })}
                >
                    <Box
                        sx={{
                            width: '100%',
                            maxWidth: contentMaxWidth,
                            mx: 'auto',
                        }}
                    >
                        {topBar}
                    </Box>
                </Box>
            )}

            {/* Main Content */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: centered ? 'center' : 'stretch',
                    justifyContent: 'center',
                    px: 4,
                    py: topBar ? 4 : 6,
                }}
            >
                <Box
                    sx={{
                        width: '100%',
                        maxWidth: contentMaxWidth,
                        mx: 'auto',
                    }}
                >
                    {children}
                </Box>
            </Box>

            {/* Main Content */}
            {bottomDock && (
                <Box
                    sx={{
                        px: 4,
                        pb: 6,
                        pt: 2,
                    }}
                >
                    <Box
                        sx={{
                            width: '100%',
                            maxWidth: contentMaxWidth,
                            mx: 'auto',
                        }}
                    >
                        {bottomDock}
                    </Box>
                </Box>
            )}
        </Box>
    );
}