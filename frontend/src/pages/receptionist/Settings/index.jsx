import React, { useState, useEffect } from 'react';
import axios from '../../../api/client';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { listClusters, setClusterCaps } from '../../../api/teacher';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();

  // TTL setting
  const [ttlRaw, setTtlRaw] = useState(48);
  const [unit, setUnit] = useState('hours');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Cap override
  const [clusters, setClusters] = useState([]);
  const [capsLoading, setCapsLoading] = useState(true);
  const [capsSaving, setCapsSaving] = useState({});

  useEffect(() => {
    axios.get('/settings').then(r => {
      const h = Number(r.data.pending_request_ttl_hours || 48);
      if (h % 24 === 0) { setUnit('days'); setTtlRaw(h / 24); }
      else { setUnit('hours'); setTtlRaw(h); }
    }).catch(() => {}).finally(() => setLoading(false));

    listClusters().then(r => setClusters(r.data)).catch(() => {}).finally(() => setCapsLoading(false));
  }, []);

  if (user?.role !== 'admin') {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: '#6B6B6B', fontSize: 14 }}>
        This page is only available to Admin.
      </div>
    );
  }

  const handleSave = async (e) => {
    e.preventDefault();
    const hours = unit === 'days' ? ttlRaw * 24 : ttlRaw;
    if (!hours || hours < 1) return;
    setSaving(true);
    try {
      await axios.patch('/settings', { pending_request_ttl_hours: hours });
      toast('Settings saved', 'success');
    } catch { toast('Failed to save', 'error'); } finally { setSaving(false); }
  };

  const handleCapToggle = async (cluster) => {
    const next = !cluster.caps_disabled;
    setCapsSaving(s => ({ ...s, [cluster.id]: true }));
    try {
      await setClusterCaps(cluster.id, next);
      setClusters(prev => prev.map(c => c.id === cluster.id ? { ...c, caps_disabled: next } : c));
      toast(`Cap override ${next ? 'enabled' : 'disabled'} for ${cluster.name}`, 'success');
    } catch { toast('Failed to update', 'error'); }
    finally { setCapsSaving(s => ({ ...s, [cluster.id]: false })); }
  };

  const capDisabledCount = clusters.filter(c => c.caps_disabled).length;

  return (
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* TTL */}
      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 14, padding: '24px 22px 26px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Auto-delete pending requests</h2>
          <p style={{ margin: 0, fontSize: 14, color: '#4A4A48', lineHeight: 1.5 }}>
            Pending requests older than this are automatically removed. Approved and rejected requests are never auto-deleted.
          </p>
        </div>
        {loading ? (
          <div style={{ fontSize: 14, color: '#6B6B6B' }}>Loading…</div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="number" value={ttlRaw} onChange={e => setTtlRaw(Number(e.target.value))} min={1} max={unit === 'days' ? 365 : 8760}
                style={{ width: 90, height: 44, padding: '0 12px', border: '1px solid #CFCFCB', borderRadius: 9, font: 'inherit', fontSize: 16, textAlign: 'center', fontFamily: "'IBM Plex Mono',monospace" }} />
              <select value={unit} onChange={e => setUnit(e.target.value)}
                style={{ height: 44, padding: '0 12px', border: '1px solid #CFCFCB', borderRadius: 9, font: 'inherit', fontSize: 15, background: '#fff' }}>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#6B6B6B' }}>
              Current: {unit === 'days' ? `${ttlRaw} day${ttlRaw !== 1 ? 's' : ''}` : `${ttlRaw} hour${ttlRaw !== 1 ? 's' : ''}`} ({unit === 'days' ? ttlRaw * 24 : ttlRaw}h)
            </p>
            <button type="submit" disabled={saving}
              style={{ height: 44, padding: '0 20px', alignSelf: 'flex-start', border: 'none', borderRadius: 9, background: '#0b66b2', color: '#fff', font: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </form>
        )}
      </div>

      {/* Cap Override */}
      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 14, padding: '24px 22px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Cap override — by department</h2>
          <p style={{ margin: 0, fontSize: 14, color: '#4A4A48', lineHeight: 1.5 }}>
            When enabled for a department, all quantity caps (per-checkout, monthly, weekly) are removed. Items remain subject to stock levels only. Changes take effect immediately.
          </p>
          {capDisabledCount > 0 && (
            <p style={{ margin: 0, fontSize: 13, color: '#B45309', fontWeight: 500 }}>
              {capDisabledCount} department{capDisabledCount !== 1 ? 's' : ''} currently have caps disabled.
            </p>
          )}
        </div>

        {capsLoading ? (
          <div style={{ fontSize: 14, color: '#6B6B6B' }}>Loading…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid #E5E5E5', borderRadius: 10, overflow: 'hidden' }}>
            {clusters.map((c, i) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: i === 0 ? 'none' : '1px solid #F0F0EE', background: c.caps_disabled ? '#FFFBEB' : '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</span>
                  {c.caps_disabled && (
                    <span style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#FEF3C7', color: '#B45309' }}>No cap</span>
                  )}
                </div>
                <button
                  role="switch"
                  aria-checked={c.caps_disabled}
                  onClick={() => handleCapToggle(c)}
                  disabled={!!capsSaving[c.id]}
                  style={{ width: 38, height: 22, border: 'none', borderRadius: 11, background: c.caps_disabled ? '#B45309' : '#D4D4D2', cursor: 'pointer', position: 'relative', transition: 'background .15s', opacity: capsSaving[c.id] ? 0.5 : 1, flexShrink: 0 }}>
                  <span style={{ position: 'absolute', top: 2, left: c.caps_disabled ? 18 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
