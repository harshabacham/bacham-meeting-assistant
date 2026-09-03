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
        <div className="h-10 flex justify-end items-center fixed top-0 right-0 left-0 z-[9999] pointer-events-none select-none">
            {/* Drag region */}
            <div data-tauri-drag-region className="flex-1 h-full pointer-events-auto"></div>
            
            {/* Window Controls */}
            <div className="flex items-center h-full pointer-events-auto">
                <button
                    onClick={() => appWindow.minimize()}
                    className="w-11 h-full flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                    title="Minimize"
                >
                    <Minus size={16} />
                </button>
                <button
                    onClick={() => isMaximized ? appWindow.unmaximize() : appWindow.maximize()}
                    className="w-11 h-full flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                    title={isMaximized ? "Restore" : "Maximize"}
                >
                    <Square size={13} />
                </button>
                <button
                    onClick={() => appWindow.close()}
                    className="w-11 h-full flex items-center justify-center text-white/50 hover:bg-red-500 hover:text-white transition-colors"
                    title="Close"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}
