import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Minus, Square, X } from 'lucide-react';

export function Titlebar() {
    const [isMaximized, setIsMaximized] = useState(false);
    const [isMac, setIsMac] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setIsMac(navigator.userAgent.toUpperCase().indexOf('MAC') >= 0);
        
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
            {/* Draggable Titlebar Region */}
            <div
                data-tauri-drag-region
                className={`fixed top-0 h-8 z-[99998] pointer-events-auto select-none ${
                    isMac ? 'left-20 right-0' : 'left-0 right-36'
                }`}
            />

            {/* Interactive window controls (always on top of Sidebar) */}
            {isMac ? (
                <div data-tauri-drag-region="false" className="no-drag fixed top-0 left-0 z-[100000] flex items-center gap-2 h-8 px-3.5 pointer-events-auto select-none group">
                    <div 
                        data-tauri-drag-region="false"
                        onClick={handleClose}
                        className="no-drag w-[11.5px] h-[11.5px] rounded-full bg-[#FF5F57] border border-[#e0443e]/50 cursor-pointer transition-colors hover:brightness-110"
                        title="Close"
                    />
                    <div 
                        data-tauri-drag-region="false"
                        onClick={handleMinimize}
                        className="no-drag w-[11.5px] h-[11.5px] rounded-full bg-[#FFBD2E] border border-[#dea123]/50 cursor-pointer transition-colors hover:brightness-110"
                        title="Minimize"
                    />
                    <div 
                        data-tauri-drag-region="false"
                        onClick={handleToggleMaximize}
                        className="no-drag w-[11.5px] h-[11.5px] rounded-full bg-[#28C840] border border-[#1aab29]/50 cursor-pointer transition-colors hover:brightness-110"
                        title={isMaximized ? "Restore" : "Maximize"}
                    />
                </div>
            ) : (
                <div data-tauri-drag-region="false" className="no-drag fixed top-0 right-0 z-[100000] flex items-center h-8 pointer-events-auto select-none text-[#A1A1A6]">
                    
                    <div 
                        data-tauri-drag-region="false"
                        onClick={handleMinimize}
                        className="no-drag relative h-full w-12 flex items-center justify-center cursor-pointer hover:bg-white/10 hover:text-white transition-colors overflow-hidden"
                        title="Minimize"
                    >
                        <div className="absolute inset-0 z-10 no-drag pointer-events-auto" data-tauri-drag-region="false" />
                        <Minus size={16} strokeWidth={2} className="relative z-0 pointer-events-none" />
                    </div>

                    <div 
                        data-tauri-drag-region="false"
                        onClick={handleToggleMaximize}
                        className="no-drag relative h-full w-12 flex items-center justify-center cursor-pointer hover:bg-white/10 hover:text-white transition-colors overflow-hidden"
                        title={isMaximized ? "Restore" : "Maximize"}
                    >
                        <div className="absolute inset-0 z-10 no-drag pointer-events-auto" data-tauri-drag-region="false" />
                        <Square size={14} strokeWidth={2} className="relative z-0 pointer-events-none" />
                    </div>
                    
                    <div 
                        data-tauri-drag-region="false"
                        onClick={handleClose}
                        className="no-drag relative h-full w-12 flex items-center justify-center cursor-pointer hover:bg-red-500 hover:text-white transition-colors overflow-hidden"
                        title="Close"
                    >
                        <div className="absolute inset-0 z-10 no-drag pointer-events-auto" data-tauri-drag-region="false" />
                        <X size={16} strokeWidth={2} className="relative z-0 pointer-events-none" />
                    </div>

                </div>
            )}
        </>
    );
}
