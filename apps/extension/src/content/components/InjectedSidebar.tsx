import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, FileText, History, X, AppWindow, Sparkles, Calendar, Clock } from 'lucide-react';

interface InjectedSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InjectedSidebar: React.FC<InjectedSidebarProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'history'>('notes');
  
  // Hardcoded mock history for demo purposes since we're in the content script context
  // To make this real, we'd need to fetch from chrome.runtime or the background script.
  const mockHistory = [
    { id: '1', title: 'Q3 Roadmap Planning', date: 'Just now', duration: '45 min' },
    { id: '2', title: 'Weekly Sync', date: 'Yesterday', duration: '30 min' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '400px',
            height: '100vh',
            background: 'rgba(15, 15, 15, 0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 9999999,
            display: 'flex',
            flexDirection: 'column',
            color: '#fff',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Header */}
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
                <AppWindow size={16} color="#fff" />
              </div>
              <span style={{ fontSize: '16px', fontWeight: 'bold', letterSpacing: '0.5px' }}>BACHAM AI</span>
            </div>
            <button 
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 0.6)', cursor: 'pointer', padding: '4px' }}
              onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
              onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', padding: '15px 20px', gap: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <button
              onClick={() => setActiveTab('notes')}
              style={{
                flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s',
                background: activeTab === 'notes' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                color: activeTab === 'notes' ? '#818cf8' : 'rgba(255,255,255,0.6)'
              }}
            >
              <FileText size={16} /> Live Notes
            </button>
            <button
              onClick={() => setActiveTab('history')}
              style={{
                flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s',
                background: activeTab === 'history' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                color: activeTab === 'history' ? '#818cf8' : 'rgba(255,255,255,0.6)'
              }}
            >
              <History size={16} /> History
            </button>
          </div>

          {/* Content Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {activeTab === 'notes' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '4px', background: '#34d399', animation: 'pulse 2s infinite' }} />
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#34d399', letterSpacing: '1px', textTransform: 'uppercase' }}>Listening to meeting</span>
                  </div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#fff' }}>Current Session Active</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                    AI is actively transcribing and processing audio. Key insights and action items will appear here automatically.
                  </p>
                </div>
                
                {/* Mock Insight */}
                <div style={{ padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.05))', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Sparkles size={14} color="#818cf8" />
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#818cf8' }}>AI Action Item Detected</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#fff', lineHeight: 1.5 }}>
                    "Schedule a follow-up call with the design team by tomorrow afternoon."
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {mockHistory.map(item => (
                  <div key={item.id} style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#fff' }}>{item.title}</h4>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                        <Calendar size={12} /> {item.date}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                        <Clock size={12} /> {item.duration}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Footer Controls */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(0,0,0,0.2)' }}>
             <button style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#6366f1', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
               <Video size={16} /> Open Full Dashboard
             </button>
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
};
