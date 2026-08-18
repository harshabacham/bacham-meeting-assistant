import { create } from 'zustand';
import { AlertTriangle, Check } from 'lucide-react';


interface ConfirmState {
  isOpen: boolean;
  message: string;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
  close: () => void;
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  isOpen: false,
  message: '',
  title: 'Confirm Action',
  onConfirm: () => {},
  onCancel: () => {},
  showConfirm: (message: string, title = 'Confirm Action') => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        message,
        title,
        onConfirm: () => {
          set({ isOpen: false });
          resolve(true);
        },
        onCancel: () => {
          set({ isOpen: false });
          resolve(false);
        }
      });
    });
  },
  close: () => set({ isOpen: false }),
}));

export function ConfirmProvider() {
  const { isOpen, message, title, onConfirm, onCancel } = useConfirmStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="bg-surface border border-border/50 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative z-10 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium text-foreground bg-surface-hover hover:bg-border/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-500 transition-colors flex items-center gap-2"
          >
            <Check size={16} />
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
