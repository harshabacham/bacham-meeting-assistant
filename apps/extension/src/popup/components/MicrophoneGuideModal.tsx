import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Mic,
  Lock,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export interface MicrophoneGuideModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onPermissionGranted?: () => void;
}

export function MicrophoneGuideModal({
  isOpen,
  onClose,
  onPermissionGranted,
}: MicrophoneGuideModalProps): React.ReactElement | null {
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [isRequesting, setIsRequesting] = useState(false);

  // Check permission on mount and listen for changes
  useEffect(() => {
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((status) => {
          setPermissionState(status.state);
          status.onchange = () => {
            setPermissionState(status.state);
            if (status.state === 'granted') {
              onPermissionGranted?.();
            }
          };
        })
        .catch(() => {});
    }
  }, [onPermissionGranted]);

  // Listen for permission status events from the permission tab or background
  useEffect(() => {
    const listener = (msg: any) => {
      if (msg?.type === 'MIC_PERMISSION_STATUS') {
        if (msg.payload?.granted) {
          setPermissionState('granted');
          onPermissionGranted?.();
          setTimeout(() => {
            onClose();
          }, 800);
        } else {
          setPermissionState('denied');
        }
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [onClose, onPermissionGranted]);

  // Trigger Chrome's native microphone prompt
  const handleRequestPermission = async () => {
    try {
      setIsRequesting(true);
      // 1. Try getUserMedia directly (succeeds instantly if already granted)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionState('granted');
      onPermissionGranted?.();
      stream.getTracks().forEach((t) => t.stop());
      setIsRequesting(false);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch {
      setIsRequesting(false);
      // 2. Chrome intentionally suppresses permission popups inside side panels!
      // Opening an extension tab triggers Chrome's native prompt at the address bar:
      const permUrl = chrome.runtime.getURL('src/popup/index.html?flow=mic_permission');
      chrome.tabs.create({ url: permUrl, active: true });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col justify-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#141517] rounded-t-3xl p-5 border-t border-white/10 shadow-2xl space-y-3.5 text-white"
          >
            {/* 1. Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#BAFF29]/15 text-[#BAFF29] flex items-center justify-center shrink-0">
                  <Mic size={18} />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-white leading-tight">
                    Microphone Permission
                  </h3>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    Required to record your voice
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                title="Close"
              >
                <X size={15} />
              </button>
            </div>

            {/* 2. Action Button / Status */}
            <button
              type="button"
              onClick={handleRequestPermission}
              disabled={isRequesting || permissionState === 'granted'}
              className={`w-full py-3 px-4 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                permissionState === 'granted'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                  : 'bg-[#BAFF29] hover:bg-[#a3e622] text-[#0A0A0C] shadow-[0_2px_12px_rgba(186,255,41,0.25)]'
              }`}
            >
              {permissionState === 'granted' ? (
                <>
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span>Microphone Enabled & Ready</span>
                </>
              ) : isRequesting ? (
                <span>Requesting Permission...</span>
              ) : (
                <>
                  <Mic size={16} />
                  <span>Allow Microphone Access</span>
                </>
              )}
            </button>

            {/* 3. Three Clean, Simple Steps (Matching Sample) */}
            <div className="space-y-2">
              {/* Step 1: If popup */}
              <div className="p-3 rounded-xl bg-[#1A1C20] border border-white/5 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-white/10 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div className="space-y-0.5">
                  <div className="text-[12.5px] font-semibold text-white">
                    If you see a popup
                  </div>
                  <div className="text-[11.5px] text-white/60 leading-relaxed">
                    Click <strong className="text-white">&ldquo;Allow while visiting the site&rdquo;</strong> to enable speech recording.
                  </div>
                </div>
              </div>

              {/* Step 2: If Blocked */}
              <div
                className={`p-3 rounded-xl bg-[#1A1C20] border transition-all flex items-start gap-3 ${
                  permissionState === 'denied'
                    ? 'border-red-500/40 bg-red-500/5'
                    : 'border-white/5'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-white/10 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {permissionState === 'denied' ? (
                    <AlertTriangle size={12} className="text-red-400" />
                  ) : (
                    <Lock size={12} className="text-white/80" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="text-[12.5px] font-semibold text-white flex items-center gap-1.5">
                    <span>If blocked (no popup)</span>
                    {permissionState === 'denied' && (
                      <span className="text-[10px] font-bold text-red-400 bg-red-500/15 px-1.5 py-0.2 rounded">
                        Currently Blocked
                      </span>
                    )}
                  </div>
                  <div className="text-[11.5px] text-white/60 leading-relaxed">
                    Click the <strong className="text-white">lock / microphone icon</strong> in the address bar, select <strong className="text-white">&ldquo;Always allow&rdquo;</strong>, and click Done.
                  </div>
                </div>
              </div>

              {/* Step 3: Missing Icon */}
              <div className="p-3 rounded-xl bg-[#1A1C20] border border-white/5 flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-white/10 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  <RotateCw size={12} className="text-white/80" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-[12.5px] font-semibold text-white">
                    If you don&rsquo;t see the icon
                  </div>
                  <div className="text-[11.5px] text-white/60 leading-relaxed">
                    <strong className="text-white">Refresh the tab</strong>, then click the microphone icon in the address bar.
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Google Meet / Zoom Participants Note */}
            <div className="p-2.5 rounded-xl bg-[#0A0A0C] border border-white/5 text-[11px] text-white/50 flex items-center gap-2 leading-tight">
              <span className="text-[#BAFF29] shrink-0 font-bold">💡</span>
              <span>
                <strong>Meeting participants:</strong> Check <span className="text-[#BAFF29]">&ldquo;Also share tab audio&rdquo;</span> in Chrome&rsquo;s screen sharing window.
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
