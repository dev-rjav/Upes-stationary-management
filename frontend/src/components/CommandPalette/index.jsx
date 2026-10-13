import React, { useEffect, useMemo, useRef, useState } from 'react';
import SearchIcon from '../icons/SearchIcon';

// Rank a command against the query: prefix > substring > subsequence > no match.
function score(text, q) {
  const l = text.toLowerCase();
  const idx = l.indexOf(q);
  if (idx === 0) return 3;
  if (idx > 0) return 2;
  let i = 0;
  for (const ch of l) { if (ch === q[i]) i++; if (i === q.length) return 1; }
  return -1;
}

const S = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,30,50,.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '12vh 16px 16px', zIndex: 1000 },
  panel: { width: '100%', maxWidth: 560, background: '#fff', borderRadius: 14, boxShadow: '0 24px 70px rgba(20,50,90,.32)', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  inputRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #EDEDEB' },
  input: { flex: 1, border: 'none', outline: 'none', font: 'inherit', fontSize: 16, color: '#1A1A1A', background: 'transparent' },
  list: { listStyle: 'none', margin: 0, padding: 6, maxHeight: '48vh', overflowY: 'auto' },
  empty: { padding: '22px 16px', textAlign: 'center', color: '#8A8A86', fontSize: 14 },
};

export default function CommandPalette({ open, onClose, commands }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const prevFocus = useRef(null);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return commands;
    return commands
      .map((c) => ({ c, s: score(`${c.label} ${c.keywords || ''}`, query) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.c);
  }, [commands, q]);

  // Reset state each time it opens; manage focus.
  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement;
    setQ('');
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      clearTimeout(t);
      if (prevFocus.current && prevFocus.current.focus) prevFocus.current.focus();
    };
  }, [open]);

  useEffect(() => { setActive(0); }, [q]);

  if (!open) return null;

  const run = (cmd) => { onClose(); cmd?.perform(); };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[active]) run(results[active]); }
  };

  return (
    <div style={S.overlay} role="presentation" onMouseDown={onClose}>
      <div style={S.panel} onMouseDown={(e) => e.stopPropagation()}>
        <div style={S.inputRow}>
          <SearchIcon size={18} style={{ color: '#8A8A86' }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages and actions…"
            aria-label="Search pages and actions"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-autocomplete="list"
            aria-activedescendant={results[active] ? `cmdk-opt-${active}` : undefined}
            style={S.input}
          />
          <span className="kbd">Esc</span>
        </div>

        {results.length === 0 ? (
          <div style={S.empty}>No matches for “{q}”.</div>
        ) : (
          <ul id="cmdk-list" role="listbox" aria-label="Results" style={S.list}>
            {results.map((c, i) => {
              const selected = i === active;
              return (
                <li
                  key={c.id}
                  id={`cmdk-opt-${i}`}
                  role="option"
                  aria-selected={selected}
                  ref={(el) => { if (selected && el) el.scrollIntoView({ block: 'nearest' }); }}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => { e.preventDefault(); run(c); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                    borderRadius: 8, cursor: 'pointer',
                    background: selected ? '#d9ecfa' : 'transparent',
                  }}
                >
                  <span aria-hidden="true" style={{
                    width: 26, height: 26, flexShrink: 0, borderRadius: 7, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600,
                    background: selected ? '#0b66b2' : '#eef6fd', color: selected ? '#fff' : '#0b66b2',
                  }}>{c.icon || '›'}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</span>
                  {c.hint && <span style={{ fontSize: 12, color: '#8A8A86' }}>{c.hint}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
