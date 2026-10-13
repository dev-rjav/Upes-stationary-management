import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import CommandPalette from '../CommandPalette';
import SearchIcon from '../icons/SearchIcon';
import upesMark from '../../assets/upes-mark.png';

const NAV = [
  { key: 'requests', label: 'Requests', path: '/receptionist/requests', icon: 'R', keywords: 'orders approve pending' },
  { key: 'stock', label: 'Stock', path: '/receptionist/stock', icon: 'S', keywords: 'inventory levels' },
  { key: 'stock-in', label: 'Stock In', path: '/receptionist/stock-in', icon: '+', keywords: 'receive vendor invoice add' },
  { key: 'dashboard', label: 'Dashboard', path: '/receptionist/dashboard', icon: 'D', keywords: 'charts kpi spend' },
  { key: 'reports', label: 'Reports', path: '/receptionist/reports', icon: '↓', keywords: 'export excel csv download' },
  { key: 'items', label: 'Items', path: '/receptionist/items', icon: 'I', keywords: 'catalogue caps threshold' },
];

const ADMIN_NAV = [
  { key: 'settings', label: 'Settings', path: '/receptionist/settings', icon: '⚙', keywords: 'ttl admin config' },
];

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');
const CMD_HINT = IS_MAC ? '⌘ K' : 'Ctrl K';

export default function ReceptionistLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [w, setW] = useState(window.innerWidth);

  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const desktop = w >= 768;
  const isAdmin = user?.role === 'admin';
  const navItems = useMemo(() => [...NAV, ...(isAdmin ? ADMIN_NAV : [])], [isAdmin]);
  const current = location.pathname;

  const [paletteOpen, setPaletteOpen] = useState(false);

  const pageTitle = (() => {
    for (const n of navItems) if (current.startsWith(n.path)) return n.label;
    if (current.includes('/requests/new')) return 'New Request';
    return 'Receptionist';
  })();

  const doLogout = () => logout().then(() => navigate('/login'));

  // Spotlight-style command palette: Ctrl/⌘ + K to open, type to switch pages.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const commands = useMemo(() => {
    const pages = navItems.map((n) => ({
      id: `page-${n.key}`, label: n.label, icon: n.icon, hint: 'Page',
      keywords: `${n.keywords || ''} go open`, perform: () => navigate(n.path),
    }));
    const actions = [
      { id: 'act-new', label: 'New manual request', icon: '+', hint: 'Action', keywords: 'create checkout override',
        perform: () => navigate('/receptionist/requests/new') },
      { id: 'act-qr', label: 'Show QR code', icon: '▣', hint: 'New tab', keywords: 'kiosk print',
        perform: () => window.open('/qr', '_blank', 'noopener') },
      { id: 'act-form', label: 'Open request form', icon: '↗', hint: 'New tab', keywords: 'teacher checkout',
        perform: () => window.open('/request', '_blank', 'noopener') },
      { id: 'act-logout', label: 'Sign out', icon: '⎋', hint: 'Action', keywords: 'logout exit', perform: doLogout },
    ];
    return [...pages, ...actions];
  }, [navItems, navigate]);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      {desktop && (
        <nav aria-label="Main" style={{ width: 220, flexShrink: 0, background: '#fff', borderRight: '1px solid #E5E5E5', display: 'flex', flexDirection: 'column', padding: '16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px 18px' }}>
            <img src={upesMark} alt="UPES" style={{ height: 30, width: 'auto', display: 'block' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 600, fontSize: 13, letterSpacing: '0.03em' }}>UPES</span>
              <span style={{ fontSize: 11.5, color: '#6B6B6B' }}>Stationery Desk</span>
            </div>
          </div>
          <button onClick={() => setPaletteOpen(true)} aria-keyshortcuts="Control+K Meta+K"
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34, margin: '0 0 10px', padding: '0 10px', border: '1px solid #cde0f0', borderRadius: 7, background: '#fff', color: '#6B6B6B', font: 'inherit', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
            <SearchIcon size={15} />
            <span style={{ flex: 1 }}>Search…</span>
            <span className="kbd">{CMD_HINT}</span>
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {navItems.map(n => {
              const active = current.startsWith(n.path);
              return (
                <button key={n.key} onClick={() => navigate(n.path)} aria-current={active ? 'page' : undefined}
                  style={{ height: 34, padding: '0 10px', border: 'none', borderRadius: 6, background: active ? '#d9ecfa' : 'transparent', color: active ? '#0b66b2' : '#1A1A1A', font: 'inherit', fontSize: 13, fontWeight: active ? 600 : 400, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  {n.label}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 'auto', borderTop: '1px solid #EDEDEB', padding: '12px 6px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a href="/qr" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>Show QR code ↗</a>
            <a href="/request" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>Open request form ↗</a>
            <button onClick={doLogout} style={{ height: 30, padding: '0 10px', border: '1px solid #D4D4D2', borderRadius: 6, background: '#fff', font: 'inherit', fontSize: 12, color: '#1A1A1A', cursor: 'pointer', alignSelf: 'flex-start' }}>Sign out</button>
          </div>
        </nav>
      )}

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header style={{ height: 52, flexShrink: 0, background: 'var(--header-bg)', borderBottom: '1px solid #cde0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' }}>{pageTitle}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <button onClick={() => setPaletteOpen(true)} aria-label="Search pages and actions" aria-keyshortcuts="Control+K Meta+K" title={`Search (${CMD_HINT})`}
              style={{ height: 28, padding: '0 8px', border: '1px solid #cde0f0', borderRadius: 6, background: '#fff', font: 'inherit', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <SearchIcon size={15} />{desktop && <span className="kbd">{CMD_HINT}</span>}
            </button>
            <span style={{ fontWeight: 500 }}>{user?.display_name}</span>
            <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 10, background: '#fff', color: '#0b66b2', border: '1px solid #cde0f0' }}>{user?.role === 'admin' ? 'Admin' : 'Guest'}</span>
            {!desktop && <button onClick={doLogout} style={{ height: 28, padding: '0 8px', border: '1px solid #D4D4D2', borderRadius: 6, background: '#fff', font: 'inherit', fontSize: 12, cursor: 'pointer' }}>Sign out</button>}
          </div>
        </header>
        <div className="upes-accent-bar" />

        <main id="main-content" tabIndex={-1} style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: desktop ? '20px 24px' : '14px 14px' }}>
          <Outlet />
        </main>

        {!desktop && (
          <nav aria-label="Main" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: `repeat(${Math.min(navItems.length, 5)},1fr)`, background: '#fff', borderTop: '1px solid #E5E5E5' }}>
            {navItems.slice(0, 5).map(n => {
              const active = current.startsWith(n.path);
              return (
                <button key={n.key} onClick={() => navigate(n.path)} aria-current={active ? 'page' : undefined}
                  style={{ height: 58, border: 'none', background: '#fff', font: 'inherit', fontSize: 11, fontWeight: active ? 600 : 400, color: active ? '#0b66b2' : '#6B6B6B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: active ? '#0b66b2' : 'transparent', color: active ? '#fff' : '#6B6B6B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>{n.icon}</span>
                  {n.label}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </div>
  );
}
