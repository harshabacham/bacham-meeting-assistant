import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastMessage {
  id: string;
  title: string;
  type?: 'success' | 'error' | 'info';
  action?: { label: string; onClick: () => void };
}

interface ToastContextType {
  showToast: (title: string, type?: 'success' | 'error' | 'info', action?: { label: string; onClick: () => void }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((title: string, type: 'success' | 'error' | 'info' = 'info', action?: { label: string; onClick: () => void }) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, title, type, action }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto flex items-center justify-between p-3.5 bg-surface border border-border/80 rounded-xl shadow-xl text-foreground text-xs font-medium gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {t.type === 'success' && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
                {t.type === 'error' && <AlertCircle size={16} className="text-destructive shrink-0" />}
                {t.type === 'info' && <Info size={16} className="text-primary shrink-0" />}
                <span className="truncate">{t.title}</span>
              </div>

              {t.action && (
                <button
                  onClick={t.action.onClick}
                  className="px-2 py-1 bg-primary/10 text-primary rounded font-bold hover:bg-primary/20 transition-colors shrink-0"
                >
                  {t.action.label}
                </button>
              )}

              <button
                onClick={() => removeToast(t.id)}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors shrink-0"
              >
                <X size={12} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
