import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mic, CheckCircle2, AlertTriangle, ArrowUp, RotateCw } from 'lucide-react';
import logo from '@/assets/logo.png';

export function MicPermissionTab(): React.ReactElement {
  const [status, setStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestPermission = useCallback(async () => {
    try {
      setStatus('prompt');
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStatus('granted');

      // Stop audio tracks
      stream.getTracks().forEach((track) => track.stop());

      // Notify background / sidebar that mic permission is granted
      chrome.runtime.sendMessage({
        type: 'MIC_PERMISSION_STATUS',
        payload: { granted: true },
      }).catch(() => {});

      // Auto close after brief success celebration
      setTimeout(() => {
        window.close();
      }, 1400);
    } catch (err: any) {
      console.warn('Microphone permission request failed:', err);
      setStatus('denied');
      setErrorMessage(err?.message || 'Permission denied or dismissed');

      chrome.runtime.sendMessage({
        type: 'MIC_PERMISSION_STATUS',
        payload: { granted: false, error: err?.message },
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    // Automatically trigger on mount
    void requestPermission();
  }, [requestPermission]);

  return (
    <div className="min-h-screen w-full bg-[#0A0A0C] text-white flex flex-col items-center justify-center p-6 font-sans select-none relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#BAFF29]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-[#141517] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center space-y-6 z-10"
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="BACHAM" className="w-8 h-8 rounded-lg object-cover" />
          <span className="text-[17px] font-black text-white tracking-tight">BACHAM</span>
        </div>

        {/* State: Prompting User */}
        {status === 'prompt' && (
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-18 h-18 rounded-2xl bg-[#BAFF29]/15 border border-[#BAFF29]/30 text-[#BAFF29] flex items-center justify-center shadow-lg shadow-[#BAFF29]/10 animate-pulse">
                <Mic size={32} />
              </div>
              <motion.div
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#BAFF29] text-[#0A0A0C] flex items-center justify-center shadow-md font-bold"
              >
                <ArrowUp size={16} strokeWidth={3} />
              </motion.div>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-[20px] font-bold text-white">
                Click &ldquo;Allow&rdquo; Above
              </h1>
              <p className="text-[13px] text-white/60 max-w-xs leading-relaxed">
                Chrome is displaying a permission prompt near the address bar. Click <strong>&ldquo;Allow while visiting the site&rdquo;</strong> to enable your microphone.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void requestPermission()}
              className="mt-2 text-[12px] font-bold text-[#BAFF29] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCw size={12} />
              <span>Prompt didn&rsquo;t show? Click here to retry</span>
            </button>
          </div>
        )}

        {/* State: Granted Success */}
        {status === 'granted' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-4"
          >
            <div className="w-18 h-18 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-[20px] font-bold text-white">
                Microphone Enabled!
              </h1>
              <p className="text-[13px] text-emerald-400/90 font-medium">
                Permission saved. Closing this tab in a moment...
              </p>
            </div>
          </motion.div>
        )}

        {/* State: Denied or Blocked */}
        {status === 'denied' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-4 w-full"
          >
            <div className="w-18 h-18 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center shadow-lg shadow-red-500/10">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-[19px] font-bold text-white">
                Microphone Access is Blocked
              </h1>
              <p className="text-[12.5px] text-white/60 leading-relaxed max-w-sm">
                Chrome is currently blocking microphone access for this extension. Follow these 2 quick steps:
              </p>
            </div>

            {/* Instruction Steps */}
            <div className="w-full text-left bg-[#1A1C20] border border-white/10 rounded-2xl p-4 space-y-2.5 text-[12px]">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                  1
                </span>
                <span className="text-white/80">
                  Look at Chrome&rsquo;s address bar above and click the <strong>tune / lock icon 🔒</strong> on the left.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                  2
                </span>
                <span className="text-white/80">
                  Set <strong>Microphone</strong> to <strong>Allow</strong> (or toggle it ON).
                </span>
              </div>
            </div>

            {errorMessage && (
              <p className="text-[11px] text-red-400/80 font-mono">
                {errorMessage}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 w-full pt-1">
              <button
                type="button"
                onClick={() => void requestPermission()}
                className="flex-1 py-3 rounded-xl bg-[#BAFF29] hover:bg-[#a3e622] text-[#0A0A0C] font-bold text-[13px] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <RotateCw size={14} />
                <span>Try Again</span>
              </button>
              <button
                type="button"
                onClick={() => window.close()}
                className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 font-bold text-[13px] transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
