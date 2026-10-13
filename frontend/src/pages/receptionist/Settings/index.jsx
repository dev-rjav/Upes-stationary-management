import React, { useState, useEffect } from 'react';
import axios from '../../../api/client';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ttlRaw, setTtlRaw] = useState(48);
  const [unit, setUnit] = useState('hours');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get('/settings').then(r => {
      const h = Number(r.data.pending_request_ttl_hours || 48);
      if (h % 24 === 0) { setUnit('days'); setTtlRaw(h / 24); }
      else { setUnit('hours'); setTtlRaw(h); }
    }).catch(() => {}).finally(() => setLoading(false));
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

  return (
    <div style={{ maxWidth: 480 }}>
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
    </div>
  );
}
