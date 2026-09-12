import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { Minus, Square, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function Titlebar() {
    const [isMaximized, setIsMaximized] = useState(false);
    const location = useLocation();

    useEffect(() => {
        let unlisten: (() => void) | undefined;
        try {
            const appWindow = getCurrentWindow();
            const updateMaximized = async () => {
                try {
                    const max = await appWindow.isMaximized();
                    setIsMaximized(max);
                } catch {
                    // Ignore non-Tauri browser environments
                }
            };
            updateMaximized();

            appWindow.onResized(() => {
                updateMaximized();
            }).then((fn) => {
                if (fn) unlisten = fn;
            }).catch(() => {});
        } catch {
            // Running in browser
        }

        return () => {
            if (unlisten) unlisten();
        };
    }, []);

    // Never render titlebar for copilot floating overlay window
    if (location.pathname === '/copilot') {
        return null;
    }

    const handleMinimize = async () => {
        try {
            await getCurrentWindow().minimize();
        } catch {
            try {
                await invoke('window_minimize');
            } catch (e) {
                console.warn('Minimize fallback error:', e);
            }
        }
    };

    const handleToggleMaximize = async () => {
        try {
            const appWindow = getCurrentWindow();
            const max = await appWindow.isMaximized();
            if (max) {
                await appWindow.unmaximize();
                setIsMaximized(false);
            } else {
                await appWindow.maximize();
                setIsMaximized(true);
            }
        } catch {
            try {
                await invoke('window_maximize');
                setIsMaximized(prev => !prev);
            } catch (e) {
                console.warn('Maximize fallback error:', e);
            }
        }
    };

    const handleClose = async () => {
        try {
            // Close minimizes to tray so background capture persists safely
            await invoke('window_close');
        } catch {
            try {
                await getCurrentWindow().close();
            } catch (e) {
                console.warn('Close fallback error:', e);
            }
        }
    };

    return (
        <>
            {/* Draggable Titlebar Region across the top edge except right buttons */}
            <div
                data-tauri-drag-region
                className="fixed top-0 left-0 right-36 h-7 z-[99998] pointer-events-auto select-none"
            />

            {/* Standard Windows Control Buttons */}
            <div className="fixed top-0 right-0 z-[99999] flex items-center h-8 pointer-events-auto select-none">
                <div className="flex items-center h-full bg-[#141517]/95 border-b border-l border-white/15 rounded-bl-lg shadow-md overflow-hidden">
                    <button
                        type="button"
                        onClick={handleMinimize}
                        className="w-11 h-full flex items-center justify-center text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="Minimize"
                    >
                        <Minus size={14} strokeWidth={2} />
                    </button>

                    <button
                        type="button"
                        onClick={handleToggleMaximize}
                        className="w-11 h-full flex items-center justify-center text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title={isMaximized ? "Restore" : "Maximize"}
                    >
                        {isMaximized ? (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <rect x="4" y="2" width="10" height="10" rx="1" />
                                <path d="M2 5V13C2 13.5523 2.44772 14 3 14H11" />
                            </svg>
                        ) : (
                            <Square size={12} strokeWidth={1.8} />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleClose}
                        className="w-11 h-full flex items-center justify-center text-white/75 hover:bg-[#E81123] hover:text-white transition-colors cursor-pointer"
                        title="Close"
                    >
                        <X size={15} strokeWidth={2} />
                    </button>
                </div>
            </div>
        </>
    );
}
