import React, { useState, useEffect, useCallback } from 'react';
import { listItems, createItem, updateItem, getItemClusters, patchClusterItem } from '../../../api/items';
import { setClusterCaps } from '../../../api/teacher';
import { useToast } from '../../../hooks/useToast';

const UNITS = ['EA', 'REAM', 'PAC', 'DZ', 'PKT', 'SHT', 'KG', 'BOX', 'SET', 'MTR'];

function NumInput({ value, onChange, min, max, placeholder }) {
  return (
    <input type="number" value={value ?? ''} onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
      placeholder={placeholder || '—'} min={min} max={max}
      style={{ width: 70, height: 32, padding: '0 8px', border: '1px solid #D4D4D2', borderRadius: 6, font: 'inherit', fontSize: 13, textAlign: 'center' }} />
  );
}

function ItemModal({ item, onSave, onClose }) {
  const [form, setForm] = useState(item || {
    name: '', unit: 'EA', hsn_code: '', default_rate: null,
    per_checkout_cap: null, monthly_cap: null, weekly_cap: null, low_stock_threshold: 10
  });
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
      <form onSubmit={handleSave} style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: 14, padding: '24px 22px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{item ? 'Edit item' : 'Add item'}</h2>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, fontWeight: 500, color: '#4A4A48' }}>
          Name *
          <input autoFocus value={form.name} onChange={e => set('name', e.target.value)} required
            style={{ height: 40, padding: '0 12px', border: '1px solid #CFCFCB', borderRadius: 8, font: 'inherit', fontSize: 14 }} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, fontWeight: 500, color: '#4A4A48', minWidth: 0 }}>
            Unit
            <select value={form.unit} onChange={e => set('unit', e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', height: 40, padding: '0 10px', border: '1px solid #CFCFCB', borderRadius: 8, font: 'inherit', fontSize: 14, background: '#fff' }}>
              {UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, fontWeight: 500, color: '#4A4A48', minWidth: 0 }}>
            HSN Code
            <input value={form.hsn_code || ''} onChange={e => set('hsn_code', e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', height: 40, padding: '0 12px', border: '1px solid #CFCFCB', borderRadius: 8, font: 'inherit', fontSize: 14 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, fontWeight: 500, color: '#4A4A48', minWidth: 0 }}>
            Rate (₹)
            <input type="number" step="0.01" min="0" value={form.default_rate ?? ''} onChange={e => set('default_rate', e.target.value === '' ? null : parseFloat(e.target.value))}
              placeholder="—"
              style={{ width: '100%', boxSizing: 'border-box', height: 40, padding: '0 12px', border: '1px solid #CFCFCB', borderRadius: 8, font: 'inherit', fontSize: 14 }} />
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

function ItemClusterTab({ items }) {
  const [selItem, setSelItem] = useState(null);
  const [itemClusters, setItemClusters] = useState([]);
  const [saving, setSaving] = useState({});
  const { toast } = useToast();

  useEffect(() => {
    if (items.length > 0 && !selItem) setSelItem(items[0]);
  }, [items]);

  const loadClusters = useCallback((item) => {
    if (!item) return;
    getItemClusters(item.id).then(r => setItemClusters(r.data)).catch(() => {});
  }, []);

  useEffect(() => { loadClusters(selItem); }, [selItem, loadClusters]);

  const handleToggle = async (ic) => {
    const newEnabled = !ic.is_enabled;
    setSaving(s => ({ ...s, [ic.cluster_id]: true }));
    try {
      await patchClusterItem(ic.cluster_id, selItem.id, { is_enabled: newEnabled });
      setItemClusters(prev => prev.map(x => x.cluster_id === ic.cluster_id ? { ...x, is_enabled: newEnabled } : x));
    } catch { toast('Save failed', 'error'); } finally { setSaving(s => ({ ...s, [ic.cluster_id]: false })); }
  };

  const handleCap = async (ic, field, val) => {
    setSaving(s => ({ ...s, [`${ic.cluster_id}_${field}`]: true }));
    try {
      await patchClusterItem(ic.cluster_id, selItem.id, { [field]: val });
      setItemClusters(prev => prev.map(x => x.cluster_id === ic.cluster_id ? { ...x, [field]: val } : x));
    } catch { toast('Save failed', 'error'); } finally { setSaving(s => ({ ...s, [`${ic.cluster_id}_${field}`]: false })); }
  };

  const handleToggleAll = async (enable) => {
    try {
      await Promise.all(itemClusters.map(ic =>
        patchClusterItem(ic.cluster_id, selItem.id, { is_enabled: enable })
      ));
      setItemClusters(prev => prev.map(x => ({ ...x, is_enabled: enable })));
      toast(enable ? 'Enabled for all departments' : 'Disabled for all departments', 'success');
    } catch { toast('Save failed', 'error'); }
  };

  const enabledCount = itemClusters.filter(ic => ic.is_enabled).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={selItem?.id || ''} onChange={e => setSelItem(items.find(i => i.id === Number(e.target.value)))}
          style={{ height: 38, padding: '0 12px', border: '1px solid #E5E5E5', borderRadius: 8, font: 'inherit', fontSize: 14, background: '#fff', flex: '1 1 260px', maxWidth: 400 }}>
          {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        {selItem && (
          <span style={{ fontSize: 13, color: enabledCount === 0 ? '#DC2626' : '#6B6B6B', fontWeight: enabledCount === 0 ? 600 : 400 }}>
            {enabledCount === 0
              ? 'Not enabled for any department — use "Enable all" or toggle below'
              : `${enabledCount}/${itemClusters.length} departments enabled`}
          </span>
        )}
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          <button onClick={() => handleToggleAll(true)}
            style={{ height: 34, padding: '0 14px', border: '1px solid #D4D4D2', borderRadius: 7, background: '#fff', font: 'inherit', fontSize: 13, cursor: 'pointer' }}>
            Enable all
          </button>
          <button onClick={() => handleToggleAll(false)}
            style={{ height: 34, padding: '0 14px', border: '1px solid #D4D4D2', borderRadius: 7, background: '#fff', font: 'inherit', fontSize: 13, cursor: 'pointer' }}>
            Disable all
          </button>
        </div>
      </div>

      {selItem && (
        <div style={{ background: '#F8F9FA', border: '1px solid #E5E5E5', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 16, fontSize: 13, flexWrap: 'wrap' }}>
          <span><span style={{ color: '#6B6B6B' }}>Unit:</span> <strong>{selItem.unit}</strong></span>
          {selItem.default_rate != null && <span><span style={{ color: '#6B6B6B' }}>Rate:</span> <strong>₹{selItem.default_rate.toFixed(2)}</strong></span>}
          {selItem.per_checkout_cap != null && <span><span style={{ color: '#6B6B6B' }}>Global checkout cap:</span> <strong>{selItem.per_checkout_cap}</strong></span>}
          {selItem.monthly_cap != null && <span><span style={{ color: '#6B6B6B' }}>Global monthly cap:</span> <strong>{selItem.monthly_cap}</strong></span>}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 12, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: '#f4f8fc' }}>
              <th style={TH}>Department</th>
              <th style={TH}>Enabled</th>
              <th style={TH}>Per-checkout cap</th>
              <th style={TH}>Monthly cap</th>
            </tr>
          </thead>
          <tbody>
            {itemClusters.map(ic => (
              <tr key={ic.cluster_id} style={{ borderTop: '1px solid #F0F0EE', opacity: ic.is_enabled ? 1 : 0.5 }}>
                <td style={{ padding: '10px 14px', fontWeight: 500 }}>{ic.cluster_name}</td>
                <td style={{ padding: '10px 14px' }}>
                  <button role="switch" aria-checked={ic.is_enabled} onClick={() => handleToggle(ic)}
                    disabled={saving[ic.cluster_id]}
                    style={{ width: 38, height: 22, border: 'none', borderRadius: 11, background: ic.is_enabled ? '#0b66b2' : '#D4D4D2', cursor: 'pointer', position: 'relative', transition: 'background .15s' }}>
                    <span style={{ position: 'absolute', top: 2, left: ic.is_enabled ? 18 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
                  </button>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {ic.caps_disabled
                    ? <span style={{ fontSize: 12.5, color: '#B45309', fontWeight: 500 }}>No cap</span>
                    : <NumInput value={ic.per_checkout_cap} onChange={v => handleCap(ic, 'per_checkout_cap', v)} placeholder={`≤${selItem?.per_checkout_cap || '—'}`} />}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {ic.caps_disabled
                    ? <span style={{ fontSize: 12.5, color: '#B45309', fontWeight: 500 }}>No cap</span>
                    : <NumInput value={ic.monthly_cap} onChange={v => handleCap(ic, 'monthly_cap', v)} placeholder={`≤${selItem?.monthly_cap || '—'}`} />}
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
  const [modal, setModal] = useState(null);
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
          {[['items', 'Global Items'], ['clusters', 'Item → Departments']].map(([k, l]) => (
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
                  {['Name', 'Unit', 'Rate (₹)', 'Depts', 'Per-checkout', 'Monthly', 'Weekly', 'Low threshold', ''].map(h => <th key={h} style={TH}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(it => (
                  <tr key={it.id} style={{ borderTop: '1px solid #F0F0EE' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{it.name}</td>
                    <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{it.unit}</td>
                    <td style={{ padding: '10px 14px', fontFamily: "'IBM Plex Mono',monospace" }}>
                      {it.default_rate != null ? `₹${it.default_rate.toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {it.enabled_cluster_count === 0
                        ? <span style={{ fontSize: 12, fontWeight: 600, color: '#DC2626', background: '#FEE2E2', padding: '2px 8px', borderRadius: 10 }}>None</span>
                        : <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>{it.enabled_cluster_count}/35</span>}
                    </td>
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

      {tab === 'clusters' && <ItemClusterTab items={items} />}

      {modal && <ItemModal item={modal === 'new' ? null : modal} onSave={handleSave} onClose={() => setModal(null)} />}
    </div>
  );
}
