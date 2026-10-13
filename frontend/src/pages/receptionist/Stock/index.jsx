import React, { useState, useEffect, useCallback } from 'react';
import { getStock } from '../../../api/stock';
import { useNavigate } from 'react-router-dom';

const STATUS_STYLE = {
  ok: { bg: 'transparent', color: '#6B6B6B', dot: '#22C55E' },
  low: { bg: '#FEF3C7', color: '#B45309', dot: '#F59E0B' },
  out: { bg: '#FEE2E2', color: '#9B1C1C', dot: '#EF4444' },
};

export default function Stock() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(() => {
    setLoading(true);
    getStock().then(r => setItems(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(it => {
    if (filter !== 'all' && it.status !== filter) return false;
    if (search && !it.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const outCount = items.filter(i => i.status === 'out').length;
  const lowCount = items.filter(i => i.status === 'low').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {(outCount > 0 || lowCount > 0) && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {outCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#FEE2E2', borderRadius: 10, fontSize: 14, color: '#9B1C1C', fontWeight: 500 }}>
              <span>⚠</span> {outCount} item{outCount !== 1 ? 's' : ''} out of stock
            </div>
          )}
          {lowCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#FEF3C7', borderRadius: 10, fontSize: 14, color: '#B45309', fontWeight: 500 }}>
              <span>↓</span> {lowCount} item{lowCount !== 1 ? 's' : ''} below threshold
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ height: 36, padding: '0 12px', border: '1px solid #E5E5E5', borderRadius: 8, font: 'inherit', fontSize: 13, background: '#fff', minWidth: 180 }} />
        <div style={{ display: 'flex', border: '1px solid #E5E5E5', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
          {['all', 'ok', 'low', 'out'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ height: 36, padding: '0 14px', border: 'none', background: filter === f ? '#0b66b2' : '#fff', color: filter === f ? '#fff' : '#4A4A48', font: 'inherit', fontSize: 13, fontWeight: filter === f ? 600 : 400, cursor: 'pointer', textTransform: 'capitalize' }}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={() => navigate('/receptionist/stock-in')}
          style={{ marginLeft: 'auto', height: 36, padding: '0 14px', border: 'none', borderRadius: 8, background: '#0b66b2', color: '#fff', font: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          + Stock in
        </button>
        <button onClick={load}
          style={{ height: 36, padding: '0 12px', border: '1px solid #E5E5E5', borderRadius: 8, background: '#fff', font: 'inherit', fontSize: 13, cursor: 'pointer' }}>
          Refresh
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 12, overflow: 'auto' }}>
        {loading && <div style={{ padding: 20, textAlign: 'center', color: '#6B6B6B', fontSize: 14 }}>Loading…</div>}
        {!loading && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: '#f4f8fc' }}>
                <th style={TH}>Item</th>
                <th style={TH}>Unit</th>
                <th style={{ ...TH, textAlign: 'right' }}>On hand</th>
                <th style={{ ...TH, textAlign: 'right' }}>Threshold</th>
                <th style={TH}>Status</th>
                <th style={TH}>Last updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(it => {
                const s = STATUS_STYLE[it.status] || STATUS_STYLE.ok;
                return (
                  <tr key={it.id} style={{ borderTop: '1px solid #F0F0EE', background: s.bg }}>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{it.name}</td>
                    <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{it.unit}</td>
                    <td style={{ padding: '10px 14px', fontFamily: "'IBM Plex Mono',monospace", textAlign: 'right', fontWeight: 600, color: it.status === 'out' ? '#9B1C1C' : '#1A1A1A' }}>{it.quantity_on_hand}</td>
                    <td style={{ padding: '10px 14px', fontFamily: "'IBM Plex Mono',monospace", textAlign: 'right', color: '#6B6B6B' }}>{it.low_stock_threshold}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: s.color }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
                        {it.status === 'ok' ? 'OK' : it.status === 'low' ? 'Low' : 'Out'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: '#6B6B6B' }}>
                      {it.last_updated ? new Date(it.last_updated).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: '#6B6B6B', fontSize: 14 }}>No items found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const TH = { padding: '9px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' };
