import React, { useState, useEffect, useCallback } from 'react';
import { listItems, createItem, updateItem, getClusterItems, patchClusterItem, setClusterItems } from '../../../api/items';
import { listClusters, setClusterCaps } from '../../../api/teacher';
import { useToast } from '../../../hooks/useToast';

const UNITS = ['EA', 'REAM', 'PAC', 'DZ', 'PKT', 'SHT', 'BOX', 'SET', 'MTR', 'EA'];

function NumInput({ value, onChange, min, max, placeholder }) {
  return (
    <input type="number" value={value ?? ''} onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
      placeholder={placeholder || '—'} min={min} max={max}
      style={{ width: 70, height: 32, padding: '0 8px', border: '1px solid #D4D4D2', borderRadius: 6, font: 'inherit', fontSize: 13, textAlign: 'center' }} />
  );
}

function ItemModal({ item, onSave, onClose }) {
  const [form, setForm] = useState(item || { name: '', unit: 'EA', hsn_code: '', per_checkout_cap: null, monthly_cap: null, weekly_cap: null, low_stock_threshold: 10 });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch { } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.38)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, padding: 16 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <form onSubmit={handleSave} style={{ width: '100%', maxWidth: 460, background: '#fff', borderRadius: 14, padding: '24px 22px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{item ? 'Edit item' : 'Add item'}</h2>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, fontWeight: 500, color: '#4A4A48' }}>
          Name *
          <input autoFocus value={form.name} onChange={e => set('name', e.target.value)} required
            style={{ height: 40, padding: '0 12px', border: '1px solid #CFCFCB', borderRadius: 8, font: 'inherit', fontSize: 14 }} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, fontWeight: 500, color: '#4A4A48' }}>
            Unit
            <select value={form.unit} onChange={e => set('unit', e.target.value)}
              style={{ height: 40, padding: '0 10px', border: '1px solid #CFCFCB', borderRadius: 8, font: 'inherit', fontSize: 14, background: '#fff' }}>
              {[...new Set(UNITS)].map(u => <option key={u}>{u}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, fontWeight: 500, color: '#4A4A48' }}>
            HSN Code
            <input value={form.hsn_code || ''} onChange={e => set('hsn_code', e.target.value)}
              style={{ height: 40, padding: '0 12px', border: '1px solid #CFCFCB', borderRadius: 8, font: 'inherit', fontSize: 14 }} />
          </label>
        </div>
        <fieldset style={{ border: '1px solid #E5E5E5', borderRadius: 9, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <legend style={{ fontSize: 12.5, fontWeight: 600, color: '#4A4A48', padding: '0 6px' }}>Global Caps (per teacher)</legend>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, fontWeight: 500, color: '#6B6B6B' }}>Per checkout<NumInput value={form.per_checkout_cap} onChange={v => set('per_checkout_cap', v)} min={1} /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, fontWeight: 500, color: '#6B6B6B' }}>Monthly<NumInput value={form.monthly_cap} onChange={v => set('monthly_cap', v)} min={1} /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, fontWeight: 500, color: '#6B6B6B' }}>Weekly<NumInput value={form.weekly_cap} onChange={v => set('weekly_cap', v)} min={1} /></label>
          </div>
        </fieldset>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, fontWeight: 500, color: '#4A4A48' }}>
          Low-stock threshold
          <NumInput value={form.low_stock_threshold} onChange={v => set('low_stock_threshold', v)} min={0} />
        </label>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" onClick={onClose} style={{ height: 40, padding: '0 16px', border: '1px solid #D4D4D2', borderRadius: 8, background: '#fff', font: 'inherit', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
          <button type="submit" disabled={saving}
            style={{ height: 40, padding: '0 16px', border: 'none', borderRadius: 8, background: '#0b66b2', color: '#fff', font: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ClusterTab({ items }) {
  const [clusters, setClusters] = useState([]);
  const [selCluster, setSelCluster] = useState(null);
  const [clusterItems, setClusterItems] = useState([]);
  const [saving, setSaving] = useState({});
  const [capsSaving, setCapsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    listClusters().then(r => { setClusters(r.data); if (r.data[0]) setSelCluster(r.data[0]); }).catch(() => {});
  }, []);

  const handleCapsToggle = async () => {
    if (!selCluster) return;
    const newVal = !selCluster.caps_disabled;
    setCapsSaving(true);
    try {
      await setClusterCaps(selCluster.id, newVal);
      setSelCluster(c => ({ ...c, caps_disabled: newVal }));
      setClusters(prev => prev.map(c => c.id === selCluster.id ? { ...c, caps_disabled: newVal } : c));
      toast(newVal ? 'All caps removed for this department' : 'Caps re-enabled for this department', 'success');
    } catch { toast('Save failed', 'error'); } finally { setCapsSaving(false); }
  };

  useEffect(() => {
    if (!selCluster) return;
    getClusterItems(selCluster.id).then(r => setClusterItems(r.data)).catch(() => {});
  }, [selCluster]);

  const handleToggle = async (ci) => {
    const newEnabled = !ci.is_enabled;
    setSaving(s => ({ ...s, [ci.item_id]: true }));
    try {
      await patchClusterItem(selCluster.id, ci.item_id, { is_enabled: newEnabled });
      setClusterItems(prev => prev.map(x => x.item_id === ci.item_id ? { ...x, is_enabled: newEnabled } : x));
    } catch { toast('Save failed', 'error'); } finally { setSaving(s => ({ ...s, [ci.item_id]: false })); }
  };

  const handleCap = async (ci, field, val) => {
    setSaving(s => ({ ...s, [`${ci.item_id}_${field}`]: true }));
    try {
      await patchClusterItem(selCluster.id, ci.item_id, { [field]: val });
      setClusterItems(prev => prev.map(x => x.item_id === ci.item_id ? { ...x, [field]: val } : x));
    } catch { toast('Save failed', 'error'); } finally { setSaving(s => ({ ...s, [`${ci.item_id}_${field}`]: false })); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <select value={selCluster?.id || ''} onChange={e => setSelCluster(clusters.find(c => c.id === Number(e.target.value)))}
        style={{ height: 38, padding: '0 12px', border: '1px solid #E5E5E5', borderRadius: 8, font: 'inherit', fontSize: 14, background: '#fff', maxWidth: 300 }}>
        {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', background: selCluster?.caps_disabled ? '#FEF3C7' : '#fff', border: '1px solid ' + (selCluster?.caps_disabled ? '#FDE68A' : '#E5E5E5'), borderRadius: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Remove all caps for this department</span>
          <span style={{ fontSize: 12.5, color: '#6B6B6B' }}>
            {selCluster?.caps_disabled
              ? 'Caps are OFF — users in this department can request any quantity (stock permitting).'
              : 'Per-checkout, monthly and weekly caps are enforced for this department.'}
          </span>
        </div>
        <button role="switch" aria-checked={!!selCluster?.caps_disabled} onClick={handleCapsToggle} disabled={capsSaving || !selCluster}
          style={{ flexShrink: 0, width: 46, height: 26, border: 'none', borderRadius: 13, background: selCluster?.caps_disabled ? '#B45309' : '#D4D4D2', cursor: 'pointer', position: 'relative', transition: 'background .15s', opacity: capsSaving ? 0.6 : 1 }}>
          <span style={{ position: 'absolute', top: 2, left: selCluster?.caps_disabled ? 22 : 2, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 12, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: '#f4f8fc' }}>
              <th style={TH}>Item</th>
              <th style={TH}>Enabled</th>
              <th style={TH}>Per-checkout cap</th>
              <th style={TH}>Monthly cap</th>
            </tr>
          </thead>
          <tbody>
            {clusterItems.map(ci => (
              <tr key={ci.item_id} style={{ borderTop: '1px solid #F0F0EE', opacity: ci.is_enabled ? 1 : 0.5 }}>
                <td style={{ padding: '10px 14px' }}>{ci.item_name}</td>
                <td style={{ padding: '10px 14px' }}>
                  <button role="switch" aria-checked={ci.is_enabled} onClick={() => handleToggle(ci)}
                    disabled={saving[ci.item_id]}
                    style={{ width: 38, height: 22, border: 'none', borderRadius: 11, background: ci.is_enabled ? '#0b66b2' : '#D4D4D2', cursor: 'pointer', position: 'relative', transition: 'background .15s' }}>
                    <span style={{ position: 'absolute', top: 2, left: ci.is_enabled ? 18 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
                  </button>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {selCluster?.caps_disabled
                    ? <span style={{ fontSize: 12.5, color: '#B45309', fontWeight: 500 }}>No cap</span>
                    : <NumInput value={ci.per_checkout_cap} onChange={v => handleCap(ci, 'per_checkout_cap', v)} placeholder={`≤${ci.global_per_checkout_cap || '—'}`} />}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {selCluster?.caps_disabled
                    ? <span style={{ fontSize: 12.5, color: '#B45309', fontWeight: 500 }}>No cap</span>
                    : <NumInput value={ci.monthly_cap} onChange={v => handleCap(ci, 'monthly_cap', v)} placeholder={`≤${ci.global_monthly_cap || '—'}`} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const TH = { padding: '9px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' };

export default function Items() {
  const { toast } = useToast();
  const [tab, setTab] = useState('items');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | item object
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    listItems().then(r => setItems(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    if (form.id) {
      await updateItem(form.id, form);
      toast('Item updated', 'success');
    } else {
      await createItem(form);
      toast('Item created', 'success');
    }
    load();
  };

  const filtered = items.filter(it => it.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', border: '1px solid #E5E5E5', borderRadius: 9, overflow: 'hidden', background: '#fff' }}>
          {[['items', 'Global Items'], ['clusters', 'Department Visibility']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ height: 36, padding: '0 16px', border: 'none', background: tab === k ? '#0b66b2' : '#fff', color: tab === k ? '#fff' : '#4A4A48', font: 'inherit', fontSize: 13, fontWeight: tab === k ? 600 : 400, cursor: 'pointer' }}>
              {l}
            </button>
          ))}
        </div>
        {tab === 'items' && (
          <>
            <input placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ height: 36, padding: '0 12px', border: '1px solid #E5E5E5', borderRadius: 8, font: 'inherit', fontSize: 13, background: '#fff', minWidth: 180 }} />
            <button onClick={() => setModal('new')}
              style={{ height: 36, padding: '0 14px', border: 'none', borderRadius: 8, background: '#0b66b2', color: '#fff', font: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              + Add item
            </button>
          </>
        )}
      </div>

      {tab === 'items' && (
        <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 12, overflow: 'auto' }}>
          {loading && <div style={{ padding: 20, textAlign: 'center', color: '#6B6B6B', fontSize: 14 }}>Loading…</div>}
          {!loading && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ background: '#f4f8fc' }}>
                  {['Name', 'Unit', 'Per-checkout', 'Monthly', 'Weekly', 'Low threshold', ''].map(h => <th key={h} style={TH}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(it => (
                  <tr key={it.id} style={{ borderTop: '1px solid #F0F0EE' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{it.name}</td>
                    <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{it.unit}</td>
                    <td style={{ padding: '10px 14px', fontFamily: "'IBM Plex Mono',monospace" }}>{it.per_checkout_cap ?? '—'}</td>
                    <td style={{ padding: '10px 14px', fontFamily: "'IBM Plex Mono',monospace" }}>{it.monthly_cap ?? '—'}</td>
                    <td style={{ padding: '10px 14px', fontFamily: "'IBM Plex Mono',monospace" }}>{it.weekly_cap ?? '—'}</td>
                    <td style={{ padding: '10px 14px', fontFamily: "'IBM Plex Mono',monospace" }}>{it.low_stock_threshold}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => setModal(it)}
                        style={{ height: 30, padding: '0 12px', border: '1px solid #E5E5E5', borderRadius: 6, background: '#fff', font: 'inherit', fontSize: 12, cursor: 'pointer' }}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'clusters' && <ClusterTab items={items} />}

      {modal && <ItemModal item={modal === 'new' ? null : modal} onSave={handleSave} onClose={() => setModal(null)} />}
    </div>
  );
}
