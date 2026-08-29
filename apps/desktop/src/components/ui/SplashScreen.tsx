import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--bg)] text-[var(--text-primary)]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center justify-center gap-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lime overflow-hidden">
            <img src="/logo.png" alt="BACHAM Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-3xl tracking-tight">BACHAM</span>
        </div>
        <Loader2 className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
      </motion.div>
    </div>
  );
}
