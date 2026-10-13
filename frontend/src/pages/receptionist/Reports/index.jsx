import React, { useState, useEffect } from 'react';
import { getMonthlyReport, downloadReport } from '../../../api/reports';
import { listClusters } from '../../../api/teacher';
import { useToast } from '../../../hooks/useToast';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TH = { padding: '9px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' };

function fmtCurrency(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
}

// Plain number (no ₹) — the rupee sign lives in the column header only.
function fmtNum(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function Reports() {
  const { toast } = useToast();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [sapId, setSapId] = useState('');
  const [cluster, setCluster] = useState('');
  const [clusters, setClusters] = useState([]);

  useEffect(() => {
    listClusters().then(r => setClusters(r.data)).catch(() => {});
  }, []);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await getMonthlyReport({ month, year, sap_id: sapId || undefined, cluster: cluster || undefined });
      setData(r.data);
    } catch { toast('Failed to load report', 'error'); } finally { setLoading(false); }
  };

  const handleDownload = async (fmt) => {
    setDownloading(fmt);
    try {
      await downloadReport({ month, year, sap_id: sapId || undefined, cluster: cluster || undefined, format: fmt });
    } catch { toast('Download failed', 'error'); } finally { setDownloading(''); }
  };

  const rows = data?.rows || [];
  const totalCost = rows.reduce((a, r) => a + (r.total_cost || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 12, padding: '18px 18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>Filter report</span>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            style={{ height: 38, padding: '0 10px', border: '1px solid #CFCFCB', borderRadius: 8, font: 'inherit', fontSize: 14, background: '#fff' }}>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ height: 38, padding: '0 10px', border: '1px solid #CFCFCB', borderRadius: 8, font: 'inherit', fontSize: 14, background: '#fff' }}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <input placeholder="SAP ID (optional)" value={sapId} onChange={e => setSapId(e.target.value.replace(/\D/g, ''))}
            style={{ height: 38, padding: '0 12px', border: '1px solid #CFCFCB', borderRadius: 8, font: 'inherit', fontSize: 14, background: '#fff', width: 160, fontFamily: "'IBM Plex Mono',monospace" }} />
          <select value={cluster} onChange={e => setCluster(e.target.value)}
            style={{ height: 38, padding: '0 10px', border: '1px solid #CFCFCB', borderRadius: 8, font: 'inherit', fontSize: 14, background: '#fff' }}>
            <option value="">All departments</option>
            {clusters.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={fetchData} disabled={loading}
            style={{ height: 40, padding: '0 20px', border: 'none', borderRadius: 8, background: '#0b66b2', color: '#fff', font: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Loading…' : 'Generate report'}
          </button>
          {data && (
            <>
              <button onClick={() => handleDownload('csv')} disabled={!!downloading}
                style={{ height: 40, padding: '0 16px', border: '1px solid #E5E5E5', borderRadius: 8, background: '#fff', font: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                {downloading === 'csv' ? 'Downloading…' : '↓ Download CSV'}
              </button>
              <button onClick={() => handleDownload('pdf')} disabled={!!downloading}
                style={{ height: 40, padding: '0 16px', border: '1px solid #E5E5E5', borderRadius: 8, background: '#fff', font: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                {downloading === 'pdf' ? 'Downloading…' : '↓ Download PDF'}
              </button>
              <button onClick={() => handleDownload('xlsx')} disabled={!!downloading}
                style={{ height: 40, padding: '0 16px', border: '1px solid #0b66b2', borderRadius: 8, background: '#0b66b2', color: '#fff', font: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                {downloading === 'xlsx' ? 'Downloading…' : '↓ Excel report'}
              </button>
            </>
          )}
        </div>
      </div>

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Total Cost', val: fmtCurrency(totalCost) },
              { label: 'Total Units', val: rows.reduce((a, r) => a + (r.qty || 0), 0).toLocaleString() },
              { label: 'Total Requests', val: new Set(rows.map(r => r.request_ref)).size },
              { label: 'Users', val: new Set(rows.map(r => r.sap_id)).size },
            ].map(k => (
              <div key={k.label} style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#6B6B6B', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</span>
                <span style={{ fontSize: 22, fontWeight: 600, fontFamily: "'IBM Plex Mono',monospace" }}>{k.val}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 12, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ background: '#f4f8fc' }}>
                  {['Date', 'User', 'SAP ID', 'Department', 'Item', 'Qty', 'Rate (₹)', 'Total (₹)', 'Actioned by'].map(h => <th key={h} style={TH}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #F0F0EE' }}>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', fontSize: 13 }}>{r.date ? new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td style={{ padding: '9px 12px' }}>{r.teacher_name}</td>
                    <td style={{ padding: '9px 12px', fontFamily: "'IBM Plex Mono',monospace" }}>{r.sap_id}</td>
                    <td style={{ padding: '9px 12px', color: '#4A4A48' }}>{r.cluster}</td>
                    <td style={{ padding: '9px 12px' }}>{r.item_name}</td>
                    <td style={{ padding: '9px 12px', fontFamily: "'IBM Plex Mono',monospace", textAlign: 'right' }}>{r.qty}</td>
                    <td style={{ padding: '9px 12px', fontFamily: "'IBM Plex Mono',monospace", textAlign: 'right' }}>{r.rate ? fmtNum(r.rate) : '—'}</td>
                    <td style={{ padding: '9px 12px', fontFamily: "'IBM Plex Mono',monospace", textAlign: 'right', fontWeight: 500 }}>{r.total_cost ? fmtNum(r.total_cost) : '—'}</td>
                    <td style={{ padding: '9px 12px', color: '#4A4A48', fontSize: 13 }}>{r.actioned_by || '—'}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: 28, textAlign: 'center', color: '#6B6B6B', fontSize: 14 }}>No data for selected period</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
