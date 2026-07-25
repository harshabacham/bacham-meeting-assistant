import React, { useState } from 'react';
import { Bot, CheckSquare, Mail, X } from 'lucide-react';

export const FloatingActionMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showNotification, setShowNotification] = useState<string | null>(null);

  const handleAction = (action: string) => {
    setShowNotification(`Action triggered: ${action}`);
    setIsOpen(false);
    setTimeout(() => setShowNotification(null), 3000);
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999, fontFamily: 'sans-serif' }}>
      {showNotification && (
        <div style={{
          position: 'absolute', bottom: '100%', right: '0', marginBottom: '16px',
          background: '#10B981', color: 'white', padding: '8px 16px', borderRadius: '8px',
          whiteSpace: 'nowrap', fontSize: '14px', fontWeight: 'bold',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
          {showNotification}
        </div>
      )}

      {isOpen && (
        <div style={{
          position: 'absolute', bottom: '100%', right: '0', marginBottom: '16px',
          background: '#1F2937', border: '1px solid #374151', borderRadius: '12px',
          padding: '8px', width: '200px', display: 'flex', flexDirection: 'column', gap: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }}>
          <button 
            onClick={() => handleAction('Create Ticket')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px', background: 'transparent', border: 'none', color: '#E5E7EB', cursor: 'pointer', borderRadius: '6px', textAlign: 'left' }}
            onMouseOver={(e) => e.currentTarget.style.background = '#374151'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <CheckSquare size={16} /> Create Linear Ticket
          </button>
          <button 
            onClick={() => handleAction('Draft Email')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px', background: 'transparent', border: 'none', color: '#E5E7EB', cursor: 'pointer', borderRadius: '6px', textAlign: 'left' }}
            onMouseOver={(e) => e.currentTarget.style.background = '#374151'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Mail size={16} /> Draft Follow-up
          </button>
        </div>
      )}
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '56px', height: '56px', borderRadius: '50%', background: '#3B82F6',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          transition: 'transform 0.2s ease-in-out'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {isOpen ? <X size={24} /> : <Bot size={24} />}
      </button>
    </div>
  );
};
