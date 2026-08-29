import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Camera,
} from 'lucide-react';
import { MascotAvatar, MascotMood } from './MascotAvatar';
import { InjectedSidebar } from './InjectedSidebar';
import { MessageType } from '@/shared/types';

export const FloatingActionMenu: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mascotMood, setMascotMood] = useState<MascotMood>('happy');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchState = () => {
      chrome.runtime.sendMessage({ type: MessageType.GET_STATE }, (res) => {
        if (res?.success && res.data) {
          const state = res.data.sessionState;
          const recording = state === 'recording' || state === 'paused';
          setIsRecording(recording);
          setMascotMood(recording ? 'recording' : isHovered ? 'thinking' : 'happy');
        }
      });
    };

    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, [isHovered]);

  // Listen for OPEN_SIDEBAR event from background
  useEffect(() => {
    const listener = (msg: any) => {
      if (msg?.type === 'OPEN_SIDEBAR') {
        setIsSidebarOpen(true);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCatchUp = () => {
    setMascotMood('thinking');
    showToast('✨ Analyzing live conversation...');
    chrome.runtime.sendMessage(
      {
        type: MessageType.CATCHUP_REQUEST,
        payload: { prompt: 'Give me a fast summary of the last 5 minutes.' },
      },
      (res) => {
        if (res?.success && res.data?.summary) {
          showToast(res.data.summary.slice(0, 80) + '...');
          setIsSidebarOpen(true);
        } else {
          showToast('Could not summarize. Open Copilot for full notes.');
        }
      }
    );
  };

  const handleSnap = () => {
    chrome.runtime.sendMessage({ type: MessageType.TRIGGER_SNAPSHOT });
    showToast('📸 Meeting snapshot captured!');
    setMascotMood('success');
    setTimeout(() => setMascotMood(isRecording ? 'recording' : 'happy'), 2000);
  };

  return (
    <>
      {/* Toast Notification Bubble */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            style={{
              position: 'fixed',
              bottom: '96px',
              right: '24px',
              zIndex: 9999998,
              background: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              borderRadius: '16px',
              padding: '12px 18px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.3)',
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            }}
          >
            <Sparkles size={16} color="#818cf8" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sider.ai-Style Floating Edge Dock Trigger */}
      {!isSidebarOpen && (
        <motion.div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          style={{
            position: 'fixed',
            bottom: '28px',
            right: '24px',
            zIndex: 9999998,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          }}
        >
          {/* Quick Action Pills on Hover */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 15 }}
                transition={{ duration: 0.2 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '20px',
                  padding: '6px 8px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                }}
              >
                {/* 1. Catch Me Up */}
                <button
                  onClick={handleCatchUp}
                  title="What did I miss? (5m summary)"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    borderRadius: '12px',
                    background: 'rgba(99, 102, 241, 0.2)',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    color: '#a5b4fc',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.35)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)')}
                >
                  <Zap size={13} />
                  <span>Catch Me Up</span>
                </button>

                {/* 2. Snap Keyframe */}
                <button
                  onClick={handleSnap}
                  title="Take Slide Snapshot"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
                >
                  <Camera size={13} />
                  <span>Snap Slide</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Floating Mascot Button */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setIsSidebarOpen(true)}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
              border: isRecording ? '2px solid #ef4444' : '1.5px solid rgba(255, 255, 255, 0.2)',
              boxShadow: isRecording
                ? '0 10px 30px rgba(239, 68, 68, 0.4), 0 0 15px rgba(239, 68, 68, 0.3)'
                : '0 12px 35px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            <MascotAvatar mood={mascotMood} size={42} />

            {/* Pulsing Red Recording Dot Badge */}
            {isRecording && (
              <span
                style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  border: '2px solid #0f172a',
                  animation: 'pulse 1.5s infinite',
                }}
              />
            )}
          </motion.button>
        </motion.div>
      )}

      {/* Expandable Sider-Style Sidebar */}
      <InjectedSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </>
  );
};
