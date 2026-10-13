import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(ts => [...ts, { id, msg, type }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000);
  }, []);

  const dismiss = useCallback((id) => setToasts(ts => ts.filter(t => t.id !== id)), []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, dismiss }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} role="status" style={{
          pointerEvents: 'auto', minWidth: 260, maxWidth: 360, background: '#fff',
          border: '1px solid #E5E5E5', borderLeft: `3px solid ${t.type === 'error' ? '#B91C1C' : '#15803D'}`,
          borderRadius: 8, padding: '10px 10px 10px 12px', display: 'flex', alignItems: 'flex-start',
          gap: 10, fontSize: 13, boxShadow: '0 6px 20px rgba(20,20,20,0.08)', animation: 'toastIn .18s ease-out',
        }}>
          <span style={{ flex: 1, lineHeight: 1.4 }}>{t.msg}</span>
          <button onClick={() => dismiss(t.id)} aria-label="Dismiss" style={{ border: 'none', background: 'none', fontSize: 15, lineHeight: 1, color: '#6B6B6B', cursor: 'pointer', padding: '0 2px' }}>×</button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
