import React, { useState } from 'react';
import { Bot, CheckSquare, Mail, X, Calendar } from 'lucide-react';

export const FloatingActionMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showNotification, setShowNotification] = useState<string | null>(null);

  const handleAction = (action: string) => {
    setShowNotification(`Action triggered: ${action}`);
    setIsOpen(false);
    setTimeout(() => setShowNotification(null), 3000);
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {showNotification && (
        <div style={{
          position: 'absolute', bottom: '100%', right: '0', marginBottom: '16px',
          background: 'rgba(16, 185, 129, 0.9)', color: 'white', padding: '10px 16px', borderRadius: '8px',
          whiteSpace: 'nowrap', fontSize: '13px', fontWeight: '500',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
        }}>
          {showNotification}
        </div>
      )}

      {isOpen && (
        <div style={{
          position: 'absolute', bottom: '100%', right: '0', marginBottom: '16px',
          background: 'rgba(24, 24, 27, 0.75)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px',
          padding: '8px', width: '220px', display: 'flex', flexDirection: 'column', gap: '4px',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
        }}>
          <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Meeting Tools
          </div>
          
          <button 
            onClick={() => handleAction('Capture Meeting')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', background: 'transparent', border: 'none', color: '#E5E7EB', cursor: 'pointer', borderRadius: '10px', textAlign: 'left', fontSize: '13px', fontWeight: 500, transition: 'all 0.15s ease' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#fff'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#E5E7EB'; }}
          >
            <Calendar size={15} style={{ color: '#818cf8' }} /> Capture Meeting
          </button>
          
          <button 
            onClick={() => handleAction('Extract Action Items')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', background: 'transparent', border: 'none', color: '#E5E7EB', cursor: 'pointer', borderRadius: '10px', textAlign: 'left', fontSize: '13px', fontWeight: 500, transition: 'all 0.15s ease' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#fff'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#E5E7EB'; }}
          >
            <CheckSquare size={15} style={{ color: '#34d399' }} /> Extract Actions
          </button>
          
          <button 
            onClick={() => handleAction('Draft Follow-up')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', background: 'transparent', border: 'none', color: '#E5E7EB', cursor: 'pointer', borderRadius: '10px', textAlign: 'left', fontSize: '13px', fontWeight: 500, transition: 'all 0.15s ease' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#fff'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#E5E7EB'; }}
          >
            <Mail size={15} style={{ color: '#f472b6' }} /> Draft Follow-up
          </button>
        </div>
      )}
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '56px', height: '56px', borderRadius: '28px', 
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
          border: '1px solid rgba(255, 255, 255, 0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
        onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'; }}
        onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1) translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'; }}
      >
        {isOpen ? <X size={24} strokeWidth={2.5} style={{ opacity: 0.8 }} /> : <Bot size={24} strokeWidth={2.5} style={{ color: '#818cf8' }} />}
      </button>
    </div>
  );
};
