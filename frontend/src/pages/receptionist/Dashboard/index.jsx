import React, { useState, useEffect } from 'react';
import { getDashboard, getDepartmentBreakdown, downloadDepartmentBreakdown } from '../../../api/dashboard';
import { listClusters } from '../../../api/teacher';
import { useAuth } from '../../../hooks/useAuth';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#0b66b2', '#5aa9e0', '#7fb4e0', '#aed3f0', '#cfe3f6', '#eef6fd'];

function KPI({ label, value, sub }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12.5, color: '#6B6B6B', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em', fontFamily: "'IBM Plex Mono',monospace" }}>{value}</span>
      {sub && <span style={{ fontSize: 12.5, color: '#8A8A86' }}>{sub}</span>}
    </div>
  );
}

function Card({ title, children, minH }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 12, padding: '16px 18px 20px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: minH || 'auto' }}>
      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</span>
      {children}
    </div>
  );
}

function fmtCurrency(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function YTick({ x, y, payload }) {
  const label = payload.value.length > 22 ? payload.value.slice(0, 21) + '…' : payload.value;
  return <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} fill="#4A4A48">{label}</text>;
}

// Department-wise drilldown: pick a department, see per-user bifurcation, download it.
function DepartmentBreakdown({ month, year }) {
  const [departments, setDepartments] = useState([]);
  const [dept, setDept] = useState('');
  const [bd, setBd] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    listClusters().then(r => {
      setDepartments(r.data);
      if (r.data[0]) setDept(r.data[0].name);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!dept) return;
    setLoading(true);
    setExpanded({});
    getDepartmentBreakdown({ cluster: dept, month, year })
      .then(r => setBd(r.data))
      .catch(() => setBd(null))
      .finally(() => setLoading(false));
  }, [dept, month, year]);

  const users = bd?.users || [];

  return (
    <Card title="Department Breakdown">
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={dept} onChange={e => setDept(e.target.value)}
          style={{ height: 36, padding: '0 10px', border: '1px solid #CFCFCB', borderRadius: 8, font: 'inherit', fontSize: 14, background: '#fff', maxWidth: 300 }}>
          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
        <button onClick={() => downloadDepartmentBreakdown({ cluster: dept, month, year })} disabled={!dept || !users.length}
          style={{ height: 36, padding: '0 14px', border: '1px solid #0b66b2', borderRadius: 8, background: '#0b66b2', color: '#fff', font: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: (!dept || !users.length) ? 0.5 : 1 }}>
          ↓ Download CSV
        </button>
      </div>

      {bd?.totals && (
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13.5, color: '#4A4A48' }}>
          <span>Users: <b>{bd.totals.users}</b></span>
          <span>Units: <b>{bd.totals.total_units}</b></span>
          <span>Spend: <b>{fmtCurrency(bd.totals.total_spend)}</b></span>
        </div>
      )}

      {loading && <div style={{ fontSize: 13.5, color: '#6B6B6B' }}>Loading…</div>}

      {!loading && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: '#f4f8fc' }}>
                {['', 'User', 'SAP ID', 'Units', 'Spend (₹)'].map((h, i) => (
                  <th key={i} style={{ padding: '8px 12px', textAlign: i >= 3 ? 'right' : 'left', fontSize: 12, fontWeight: 600, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <React.Fragment key={u.sap_id}>
                  <tr style={{ borderTop: '1px solid #F0F0EE', cursor: 'pointer' }} onClick={() => setExpanded(e => ({ ...e, [u.sap_id]: !e[u.sap_id] }))}>
                    <td style={{ padding: '9px 12px', width: 24, color: '#6B6B6B' }}>{expanded[u.sap_id] ? '▾' : '▸'}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 500 }}>{u.name}</td>
                    <td style={{ padding: '9px 12px', fontFamily: "'IBM Plex Mono',monospace" }}>{u.sap_id}</td>
                    <td style={{ padding: '9px 12px', fontFamily: "'IBM Plex Mono',monospace", textAlign: 'right' }}>{u.total_units}</td>
                    <td style={{ padding: '9px 12px', fontFamily: "'IBM Plex Mono',monospace", textAlign: 'right', fontWeight: 500 }}>{fmtNumber(u.total_spend)}</td>
                  </tr>
                  {expanded[u.sap_id] && u.items.map((it, j) => (
                    <tr key={j} style={{ background: '#FAFAF9', fontSize: 13 }}>
                      <td />
                      <td style={{ padding: '6px 12px', color: '#4A4A48' }} colSpan={2}>{it.name}</td>
                      <td style={{ padding: '6px 12px', fontFamily: "'IBM Plex Mono',monospace", textAlign: 'right', color: '#4A4A48' }}>{it.qty}</td>
                      <td style={{ padding: '6px 12px', fontFamily: "'IBM Plex Mono',monospace", textAlign: 'right', color: '#4A4A48' }}>{fmtNumber(it.total)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#6B6B6B', fontSize: 14 }}>No issuance for this department in {MONTHS[month - 1]} {year}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// Plain number (no ₹) — rupee sign appears in the column header only.
function fmtNumber(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function Dashboard() {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [clusterF, setClusterF] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getDashboard({ month, year, cluster: clusterF || undefined })
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [month, year, clusterF]);

  const trendData = (data?.monthly_trend || []).map(r => ({
    name: `${MONTHS[r.month - 1]} ${r.year}`,
    spend: r.total_spend,
    units: r.total_units,
  }));

  const topQty = (data?.top_qty || []).slice(0, 8);
  const topCost = (data?.top_cost || []).slice(0, 8);
  const clusterData = (data?.cluster_spend || []).slice(0, 8);
  const lowStock = (data?.low_stock || []).filter(i => i.status !== 'ok');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select value={month} onChange={e => setMonth(Number(e.target.value))}
          style={{ height: 34, padding: '0 10px', border: '1px solid #E5E5E5', borderRadius: 8, font: 'inherit', fontSize: 13, background: '#fff' }}>
          {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          style={{ height: 34, padding: '0 10px', border: '1px solid #E5E5E5', borderRadius: 8, font: 'inherit', fontSize: 13, background: '#fff' }}>
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#6B6B6B', fontSize: 14 }}>Loading dashboard…</div>}

      {!loading && data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            <KPI label="Total Spend" value={fmtCurrency(data.total_spend)} sub={`${MONTHS[month - 1]} ${year}`} />
            <KPI label="Units Issued" value={data.total_units?.toLocaleString() || '0'} />
            <KPI label="Requests" value={data.total_requests?.toLocaleString() || '0'} />
            {lowStock.length > 0 && <KPI label="Low / Out Stock" value={lowStock.length} sub="items need restock" />}
          </div>

          <Card title="Monthly Expense Trend" minH={220}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData} margin={{ top: 4, right: 10, left: 0, bottom: 4 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v, n) => n === 'spend' ? fmtCurrency(v) : v} />
                <Line type="monotone" dataKey="spend" stroke="#0b66b2" strokeWidth={2} dot={false} name="Spend" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            <Card title="Top Items by Quantity" minH={300}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topQty} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={<YTick />} width={150} />
                  <Tooltip />
                  <Bar dataKey="total_qty" fill="#0b66b2" radius={[0, 4, 4, 0]} name="Units" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Top Items by Cost" minH={300}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topCost} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={<YTick />} width={150} />
                  <Tooltip formatter={v => fmtCurrency(v)} />
                  <Bar dataKey="total_cost" fill="#5aa9e0" radius={[0, 4, 4, 0]} name="Cost" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card title="Department Spending" minH={240}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={clusterData} margin={{ top: 4, right: 10, left: 0, bottom: 40 }}>
                <XAxis dataKey="cluster" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => fmtCurrency(v)} />
                <Bar dataKey="total_spend" fill="#0b66b2" radius={[4, 4, 0, 0]} name="Spend" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {lowStock.length > 0 && (
            <Card title="Low / Out of Stock">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {lowStock.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: '1px solid #F0F0EE', fontSize: 14 }}>
                    <span>{item.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 500 }}>{item.quantity_on_hand} on hand</span>
                      <span style={{ fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: item.status === 'out' ? '#FEE2E2' : '#FEF3C7', color: item.status === 'out' ? '#9B1C1C' : '#B45309' }}>
                        {item.status === 'out' ? 'Out' : 'Low'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <DepartmentBreakdown month={month} year={year} />

          <Card title="Per-User Usage (Top 30)">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead>
                  <tr style={{ background: '#f4f8fc' }}>
                    {['User', 'SAP ID', 'Department', 'Units', 'Requests'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.teacher_usage || []).slice(0, 30).map((t, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #F0F0EE' }}>
                      <td style={{ padding: '9px 12px' }}>{t.name}</td>
                      <td style={{ padding: '9px 12px', fontFamily: "'IBM Plex Mono',monospace" }}>{t.sap_id}</td>
                      <td style={{ padding: '9px 12px', color: '#4A4A48' }}>{t.cluster}</td>
                      <td style={{ padding: '9px 12px', fontFamily: "'IBM Plex Mono',monospace", fontWeight: 500 }}>{t.total_units}</td>
                      <td style={{ padding: '9px 12px', fontFamily: "'IBM Plex Mono',monospace" }}>{t.total_requests}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {user?.role === 'admin' && data.activity && (
            <Card title="Account Activity (last 30 days)">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                {(data.activity || []).map(a => (
                  <div key={a.username} style={{ border: '1px solid #E5E5E5', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{a.display_name}</span>
                    <span style={{ fontSize: 12, color: '#6B6B6B', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{a.role}</span>
                    <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3, fontSize: 13.5 }}>
                      <span>Approved: <b>{a.approved}</b></span>
                      <span>Rejected: <b>{a.rejected}</b></span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
