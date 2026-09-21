import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Minus, Square, X } from 'lucide-react';

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
                className="fixed top-0 left-0 right-24 h-8 z-[99998] pointer-events-auto select-none"
            />

            {/* Windows-style Window Controls (Right Aligned) */}
            <div className="fixed top-0 right-0 z-[99999] flex items-center h-8 pointer-events-auto select-none text-[#A1A1A6]">
                
                <div 
                    onClick={handleMinimize}
                    className="h-full w-12 flex items-center justify-center cursor-pointer hover:bg-white/10 hover:text-white transition-colors"
                    title="Minimize"
                >
                    <Minus size={16} strokeWidth={2} />
                </div>

                <div 
                    onClick={handleToggleMaximize}
                    className="h-full w-12 flex items-center justify-center cursor-pointer hover:bg-white/10 hover:text-white transition-colors"
                    title={isMaximized ? "Restore" : "Maximize"}
                >
                    <Square size={14} strokeWidth={2} />
                </div>
                
                <div 
                    onClick={handleClose}
                    className="h-full w-12 flex items-center justify-center cursor-pointer hover:bg-red-500 hover:text-white transition-colors"
                    title="Close"
                >
                    <X size={16} strokeWidth={2} />
                </div>

            </div>
        </>
    );
}
