import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { lookupSAP, listClusters, getClusterItems } from '../../../api/teacher';
import { createManualRequest } from '../../../api/requests';
import { useToast } from '../../../hooks/useToast';
import { capInfo } from '../../../hooks/useCapCheck';

const INP = { height: 40, padding: '0 12px', border: '1px solid #CFCFCB', borderRadius: 8, font: 'inherit', fontSize: 14, color: '#1A1A1A', background: '#fff' };

export default function ManualRequest() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [sap, setSap] = useState('');
  const [looking, setLooking] = useState(false);
  const [teacherFound, setTeacherFound] = useState(null);
  const [name, setName] = useState('');
  const [clusters, setClusters] = useState([]);
  const [clusterId, setClusterId] = useState('');
  const [items, setItems] = useState([]);
  const [qty, setQty] = useState({});
  const [capOverride, setCapOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [approveNow, setApproveNow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listClusters().then(r => setClusters(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!clusterId) { setItems([]); return; }
    getClusterItems(clusterId, sap || undefined).then(r => setItems(r.data)).catch(() => {});
  }, [clusterId, sap]);

  const sapValid = /^4000\d{4}$/.test(sap);  // 8 digits, starts with 4000

  const handleLookup = async () => {
    if (!sapValid || looking) return;
    setLooking(true);
    try {
      const r = await lookupSAP(sap);
      if (r.data.found) {
        setTeacherFound(true);
        setName(r.data.name);
        const c = clusters.find(c => c.name === r.data.cluster);
        if (c) setClusterId(String(c.id));
      } else {
        setTeacherFound(false);
        setName('');
      }
    } catch { setTeacherFound(false); } finally { setLooking(false); }
  };

  const setQ = (id, v, max) => {
    const cap = capOverride ? 9999 : max;
    v = Math.max(0, Math.min(cap, isNaN(v) ? 0 : v));
    setQty(q => ({ ...q, [id]: v }));
  };

  const picked = items.filter(it => (qty[it.id] || 0) > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sap || !name.trim() || !clusterId || !picked.length) return;
    if (!sapValid) { toast('SAP ID must be 8 digits and start with 4000', 'error'); return; }
    if (capOverride && !overrideReason.trim()) { toast('Provide an override reason', 'error'); return; }
    setSubmitting(true);
    try {
      const cluster = clusters.find(c => String(c.id) === clusterId)?.name || '';
      const r = await createManualRequest({
        sap_id: sap,
        name: name.trim(),
        cluster,
        items: picked.map(it => ({ item_id: it.id, qty: qty[it.id] })),
        cap_override: capOverride,
        override_reason: capOverride ? overrideReason.trim() : undefined,
        approve_now: approveNow,
      });
      toast(approveNow ? `Request created & approved (#${r.data.ref_number})` : `Request created (#${r.data.ref_number})`, 'success');
      navigate('/receptionist/requests');
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to create request', 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 14, padding: '20px 20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 600 }}>User details</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input inputMode="numeric" placeholder="SAP ID (8 digits, starts 4000)" value={sap} onChange={e => setSap(e.target.value.replace(/\D/g, '').slice(0, 8))}
            style={{ ...INP, flex: 1, fontFamily: "'IBM Plex Mono',monospace", fontSize: 15 }} />
          <button type="button" onClick={handleLookup} disabled={!sapValid || looking}
            style={{ height: 40, padding: '0 16px', border: '1px solid #CFCFCB', borderRadius: 8, background: '#fff', font: 'inherit', fontSize: 14, cursor: 'pointer', opacity: !sapValid ? 0.5 : 1 }}>
            {looking ? '…' : 'Lookup'}
          </button>
        </div>
        {sap && !sapValid && <p style={{ margin: 0, fontSize: 12.5, color: '#991B1B' }}>SAP ID must be 8 digits and start with 4000</p>}
        {teacherFound === true && <p style={{ margin: 0, fontSize: 13.5, color: '#166534', fontWeight: 500 }}>User found — details auto-filled</p>}
        {teacherFound === false && <p style={{ margin: 0, fontSize: 13.5, color: '#B45309' }}>New user — enter details below</p>}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, fontWeight: 500, color: '#4A4A48' }}>
          Name *
          <input value={name} onChange={e => setName(e.target.value)} required style={INP} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, fontWeight: 500, color: '#4A4A48' }}>
          Department *
          <select value={clusterId} onChange={e => setClusterId(e.target.value)} required
            style={{ ...INP, background: '#fff' }}>
            <option value="">Select department…</option>
            {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>

      {clusterId && (
        <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 14, padding: '20px 20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 600 }}>Items</h2>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}>
              <input type="checkbox" checked={capOverride} onChange={e => setCapOverride(e.target.checked)} style={{ width: 16, height: 16 }} />
              Cap override
              <span style={{ fontSize: 12, padding: '1px 7px', borderRadius: 20, background: '#EDE9FE', color: '#5B21B6', fontWeight: 600 }}>admin</span>
            </label>
          </div>
          {capOverride && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13.5, fontWeight: 500, color: '#4A4A48' }}>Override reason *</label>
              <textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)} rows={2}
                placeholder="e.g. Department head verbal approval for semester setup…"
                style={{ padding: '8px 10px', border: '1px solid #CFCFCB', borderRadius: 8, font: 'inherit', fontSize: 14, resize: 'vertical' }} />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {items.map(it => {
              const { maxQty, atCap, monthlyUsed } = capInfo(it);
              const cap = capOverride ? 999 : maxQty;
              const q = qty[it.id] || 0;
              const disabled = !capOverride && atCap;
              return (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F0F0EE', opacity: disabled ? 0.45 : 1 }}>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{it.name}</span>
                    {!capOverride && <span style={{ fontSize: 12, color: '#6B6B6B' }}>Used {monthlyUsed}/{it.monthly_cap || '∞'} this month</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #CFCFCB', borderRadius: 8, overflow: 'hidden' }}>
                    <button type="button" onClick={() => setQ(it.id, q - 1, cap)} disabled={disabled || q <= 0}
                      style={{ width: 36, height: 36, border: 'none', background: '#fff', font: 'inherit', fontSize: 18, cursor: 'pointer' }}>−</button>
                    <input type="number" value={q} onChange={e => setQ(it.id, parseInt(e.target.value), cap)} disabled={disabled}
                      style={{ width: 40, height: 36, border: 'none', borderLeft: '1px solid #E5E5E5', borderRight: '1px solid #E5E5E5', textAlign: 'center', fontFamily: "'IBM Plex Mono',monospace", fontSize: 15, background: '#fff', WebkitAppearance: 'none' }} />
                    <button type="button" onClick={() => setQ(it.id, q + 1, cap)} disabled={disabled || q >= cap}
                      style={{ width: 36, height: 36, border: 'none', background: '#fff', font: 'inherit', fontSize: 18, cursor: 'pointer' }}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          <input type="checkbox" checked={approveNow} onChange={e => setApproveNow(e.target.checked)} style={{ width: 16, height: 16 }} />
          Approve immediately (walk-in / same-day checkout)
        </label>
        <button type="submit" disabled={submitting || !sapValid || !name.trim() || !clusterId || !picked.length}
          style={{ height: 46, border: 'none', borderRadius: 9, background: '#0b66b2', color: '#fff', font: 'inherit', fontSize: 15, fontWeight: 500, cursor: 'pointer', opacity: (submitting || !sapValid || !name.trim() || !clusterId || !picked.length) ? 0.4 : 1 }}>
          {submitting ? 'Creating…' : approveNow ? 'Create & approve request' : 'Create pending request'}
        </button>
      </div>
    </form>
  );
}
