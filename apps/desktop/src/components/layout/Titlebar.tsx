import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Titlebar() {
    const [isMaximized, setIsMaximized] = useState(false);
    const [isMac, setIsMac] = useState(false);
    const appWindow = getCurrentWindow();

    useEffect(() => {
        // Simple check for macOS to position buttons (optional, but good practice)
        setIsMac(navigator.userAgent.includes('Mac'));
        
        const updateMaximized = async () => {
            const max = await appWindow.isMaximized();
            setIsMaximized(max);
        };
        updateMaximized();
        
        let unlisten: () => void;
        appWindow.onResized(() => {
            updateMaximized();
        }).then((fn) => {
            if (fn) unlisten = fn;
        });
        
        return () => {
            if (unlisten) unlisten();
        };
    }, []);

    // Don't render titlebar for copilot window
    if (appWindow.label === 'copilot') {
        return null;
    }

    return (
        <div className="h-10 flex justify-end items-center fixed top-0 right-0 left-0 z-[9999] pointer-events-none select-none px-4">
            <div data-tauri-drag-region className="flex-1 h-full pointer-events-auto"></div>
            <div className="flex items-center gap-2 h-full pointer-events-auto group relative z-10">
                <button
                    onClick={() => appWindow.close()}
                    className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity"
                    title="Close"
                >
                </button>
                <button
                    onClick={() => appWindow.minimize()}
                    className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity"
                    title="Minimize"
                >
                </button>
                <button
                    onClick={() => isMaximized ? appWindow.unmaximize() : appWindow.maximize()}
                    className="w-3.5 h-3.5 rounded-full bg-[#27c93f] flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity"
                    title={isMaximized ? "Restore" : "Maximize"}
                >
                </button>
            </div>
        </div>
    );
}
