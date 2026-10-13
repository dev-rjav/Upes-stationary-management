import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { listItems } from '../../../api/items';
import { manualStockIn, parseExcel, confirmExcel } from '../../../api/stock';
import { useToast } from '../../../hooks/useToast';

function ManualTab({ items }) {
  const { toast } = useToast();
  const [rows, setRows] = useState([{ item_id: '', qty: '', rate: '', notes: '' }]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendor, setVendor] = useState('');
  const [invoice, setInvoice] = useState('');
  const [saving, setSaving] = useState(false);

  const addRow = () => setRows(r => [...r, { item_id: '', qty: '', rate: '', notes: '' }]);
  const removeRow = (i) => setRows(r => r.filter((_, idx) => idx !== i));
  const setRow = (i, k, v) => setRows(r => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valid = rows.filter(r => r.item_id && r.qty && r.rate);
    if (!valid.length) return;
    setSaving(true);
    try {
      await manualStockIn({
        received_date: date,
        vendor_name: vendor || undefined,
        invoice_ref: invoice || undefined,
        lines: valid.map(r => ({ item_id: Number(r.item_id), quantity_received: Number(r.qty), rate_per_unit: Number(r.rate), notes: r.notes || undefined })),
      });
      toast('Stock-in recorded', 'success');
      setRows([{ item_id: '', qty: '', rate: '', notes: '' }]);
      setVendor(''); setInvoice('');
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to record stock-in', 'error');
    } finally { setSaving(false); }
  };

  const INP = { height: 36, padding: '0 10px', border: '1px solid #D4D4D2', borderRadius: 7, font: 'inherit', fontSize: 13.5, background: '#fff' };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 500, color: '#4A4A48' }}>
          Date received
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={INP} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 500, color: '#4A4A48' }}>
          Vendor / Supplier
          <input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="Optional" style={INP} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 500, color: '#4A4A48' }}>
          Invoice / Reference
          <input value={invoice} onChange={e => setInvoice(e.target.value)} placeholder="Optional" style={INP} />
        </label>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 12, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: '#f4f8fc' }}>
              {['Item *', 'Qty *', 'Rate / unit *', 'Notes', ''].map(h => <th key={h} style={TH}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderTop: '1px solid #F0F0EE' }}>
                <td style={{ padding: '8px 10px', minWidth: 200 }}>
                  <select value={row.item_id} onChange={e => setRow(i, 'item_id', e.target.value)} style={{ ...INP, width: '100%' }}>
                    <option value="">Select item…</option>
                    {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                  </select>
                </td>
                <td style={{ padding: '8px 10px', minWidth: 80 }}>
                  <input type="number" value={row.qty} onChange={e => setRow(i, 'qty', e.target.value)} min={1} style={{ ...INP, width: 80 }} />
                </td>
                <td style={{ padding: '8px 10px', minWidth: 100 }}>
                  <input type="number" value={row.rate} onChange={e => setRow(i, 'rate', e.target.value)} min={0} step="0.01" style={{ ...INP, width: 100 }} />
                </td>
                <td style={{ padding: '8px 10px', minWidth: 160 }}>
                  <input value={row.notes} onChange={e => setRow(i, 'notes', e.target.value)} placeholder="Optional" style={{ ...INP, width: '100%' }} />
                </td>
                <td style={{ padding: '8px 10px' }}>
                  {rows.length > 1 && (
                    <button type="button" onClick={() => removeRow(i)}
                      style={{ width: 28, height: 28, border: 'none', borderRadius: 6, background: '#FEE2E2', color: '#9B1C1C', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>×</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" onClick={addRow}
          style={{ height: 36, padding: '0 14px', border: '1px solid #E5E5E5', borderRadius: 8, background: '#fff', font: 'inherit', fontSize: 13, cursor: 'pointer' }}>
          + Add row
        </button>
        <button type="submit" disabled={saving || !rows.some(r => r.item_id && r.qty && r.rate)}
          style={{ height: 36, padding: '0 18px', border: 'none', borderRadius: 8, background: '#0b66b2', color: '#fff', font: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : 'Record stock-in'}
        </button>
      </div>
    </form>
  );
}

const CONF_COLOR = { matched: '#166534', review: '#B45309', unrecognised: '#9B1C1C' };
const CONF_BG = { matched: '#DCFCE7', review: '#FEF3C7', unrecognised: '#FEE2E2' };
const CONF_LABEL = { matched: 'Matched', review: 'Review', unrecognised: 'Unrecognised' };

function ExcelTab({ items }) {
  const { toast } = useToast();
  const [preview, setPreview] = useState(null);
  const [batchMeta, setBatchMeta] = useState({});
  const [parsing, setParsing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [overrides, setOverrides] = useState({});

  const onDrop = useCallback(async ([file]) => {
    if (!file) return;
    setParsing(true);
    try {
      const r = await parseExcel(file);
      setPreview(r.data.rows);
      setBatchMeta(r.data.meta || {});
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to parse file', 'error');
    } finally { setParsing(false); }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [], 'application/vnd.ms-excel': [] }, maxFiles: 1 });

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const rows = preview.map((r, i) => ({
        row_index: i,
        item_id: overrides[i] !== undefined ? overrides[i] : r.matched_item_id,
        quantity_received: r.qty,
        rate_per_unit: r.rate,
        vendor_name: r.vendor_name,
        hsn: r.hsn,
      })).filter(r => r.item_id);
      await confirmExcel({ rows, meta: batchMeta });
      toast('Stock-in confirmed from Excel', 'success');
      setPreview(null);
      setOverrides({});
    } catch (err) {
      toast(err.response?.data?.error || 'Confirm failed', 'error');
    } finally { setConfirming(false); }
  };

  if (!preview) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 14, color: '#4A4A48', lineHeight: 1.55 }}>
          Upload the vendor Excel file. Columns detected automatically — it should contain item names, quantities, and unit rates.
        </p>
        <div {...getRootProps()} style={{ border: `2px dashed ${isDragActive ? '#0b66b2' : '#CFCFCB'}`, borderRadius: 12, padding: '40px 24px', textAlign: 'center', cursor: 'pointer', background: isDragActive ? '#d9ecfa' : '#fff', transition: 'border-color .15s, background .15s' }}>
          <input {...getInputProps()} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', color: '#6B6B6B' }}>
            <span style={{ fontSize: 32 }}>📂</span>
            {parsing ? <span style={{ fontSize: 14, fontWeight: 500 }}>Parsing…</span> : (
              <>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>{isDragActive ? 'Drop to upload' : 'Drag & drop Excel file here'}</span>
                <span style={{ fontSize: 13 }}>or click to select (.xlsx or .xls)</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const unmappedCount = preview.filter((r, i) => !overrides[i] && !r.matched_item_id).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>{preview.length} rows parsed</span>
        {unmappedCount > 0 && <span style={{ fontSize: 13.5, color: '#B45309' }}>{unmappedCount} rows need mapping</span>}
        <button onClick={() => { setPreview(null); setOverrides({}); }}
          style={{ marginLeft: 'auto', height: 34, padding: '0 12px', border: '1px solid #D4D4D2', borderRadius: 7, background: '#fff', font: 'inherit', fontSize: 13, cursor: 'pointer' }}>
          Re-upload
        </button>
        <button onClick={handleConfirm} disabled={confirming || unmappedCount > 0}
          style={{ height: 34, padding: '0 16px', border: 'none', borderRadius: 7, background: '#0b66b2', color: '#fff', font: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: (confirming || unmappedCount > 0) ? 0.5 : 1 }}>
          {confirming ? 'Confirming…' : 'Confirm & save'}
        </button>
      </div>
      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 12, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: '#f4f8fc' }}>
              {['Vendor name', 'Canonical item', 'Confidence', 'Qty', 'Rate'].map(h => <th key={h} style={TH}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => {
              const status = row.status;
              const selectedId = overrides[i] !== undefined ? overrides[i] : row.matched_item_id;
              return (
                <tr key={i} style={{ borderTop: '1px solid #F0F0EE' }}>
                  <td style={{ padding: '9px 12px', maxWidth: 200, wordBreak: 'break-word' }}>{row.vendor_name}</td>
                  <td style={{ padding: '9px 12px', minWidth: 200 }}>
                    {status === 'matched' && !overrides[i]
                      ? <span style={{ fontSize: 13.5, fontWeight: 500 }}>{row.matched_item_name}</span>
                      : (
                        <select value={selectedId || ''} onChange={e => setOverrides(o => ({ ...o, [i]: Number(e.target.value) || null }))}
                          style={{ height: 34, padding: '0 8px', border: '1px solid #CFCFCB', borderRadius: 7, font: 'inherit', fontSize: 13, width: '100%', background: '#fff' }}>
                          <option value="">Select item…</option>
                          {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                        </select>
                      )}
                  </td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500, padding: '2px 9px', borderRadius: 20, background: CONF_BG[status], color: CONF_COLOR[status] }}>
                      {CONF_LABEL[status]}
                    </span>
                  </td>
                  <td style={{ padding: '9px 12px', fontFamily: "'IBM Plex Mono',monospace" }}>{row.qty}</td>
                  <td style={{ padding: '9px 12px', fontFamily: "'IBM Plex Mono',monospace" }}>₹{row.rate}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const TH = { padding: '9px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' };

export default function StockIn() {
  const [tab, setTab] = useState('manual');
  const [items, setItems] = useState([]);

  useEffect(() => {
    listItems().then(r => setItems(r.data)).catch(() => {});
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', border: '1px solid #E5E5E5', borderRadius: 9, overflow: 'hidden', background: '#fff', alignSelf: 'flex-start' }}>
        {[['manual', 'Manual entry'], ['excel', 'Upload Excel']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ height: 36, padding: '0 16px', border: 'none', background: tab === k ? '#0b66b2' : '#fff', color: tab === k ? '#fff' : '#4A4A48', font: 'inherit', fontSize: 13, fontWeight: tab === k ? 600 : 400, cursor: 'pointer' }}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'manual' ? <ManualTab items={items} /> : <ExcelTab items={items} />}
    </div>
  );
}
