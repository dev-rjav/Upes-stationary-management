import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listRequests, approveRequest, rejectRequest } from '../../../api/requests';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { listClusters } from '../../../api/teacher';

const STATUS_LABEL = { pending: 'Pending', fulfilled: 'Fulfilled', rejected: 'Rejected' };
const STATUS_COLOR = { pending: '#B45309', fulfilled: '#166534', rejected: '#9B1C1C' };
const STATUS_BG = { pending: '#FEF3C7', fulfilled: '#DCFCE7', rejected: '#FEE2E2' };

function Badge({ status }) {
  return <span style={{ fontSize: 12, fontWeight: 500, padding: '2px 9px', borderRadius: 20, background: STATUS_BG[status], color: STATUS_COLOR[status] }}>{STATUS_LABEL[status]}</span>;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function RejectModal({ onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.38)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, padding: 16 }} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 14, padding: '24px 22px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Reject request?</h2>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13.5, fontWeight: 500, color: '#4A4A48' }}>
          Reason (optional)
          <textarea autoFocus value={reason} onChange={e => setReason(e.target.value)} rows={3}
            placeholder="e.g. Duplicate request, incorrect quantity…"
            style={{ padding: 10, border: '1px solid #CFCFCB', borderRadius: 8, font: 'inherit', fontSize: 14, resize: 'vertical' }} />
        </label>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ height: 40, padding: '0 16px', border: '1px solid #D4D4D2', borderRadius: 8, background: '#fff', font: 'inherit', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => onConfirm(reason)} style={{ height: 40, padding: '0 16px', border: 'none', borderRadius: 8, background: '#DC2626', color: '#fff', font: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Reject</button>
        </div>
      </div>
    </div>
  );
}

export default function Requests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [filters, setFilters] = useState({ q: '', cluster: '', actioned_by: '' });
  const [actionLoading, setActionLoading] = useState(null);

  const PER_PAGE = 25;

  useEffect(() => {
    listClusters().then(r => setClusters(r.data)).catch(() => {});
  }, []);

  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params = { status: tab, page: pg, per_page: PER_PAGE, ...filters };
      if (!params.q) delete params.q;
      if (!params.cluster) delete params.cluster;
      if (!params.actioned_by) delete params.actioned_by;
      const r = await listRequests(params);
      setRequests(r.data.requests);
      setTotal(r.data.total);
      setPage(pg);
      setSelected(null);
    } catch { } finally { setLoading(false); }
  }, [tab, filters]);

  useEffect(() => { load(1); }, [load]);

  const handleApprove = async (req) => {
    setActionLoading(req.id);
    try {
      await approveRequest(req.id);
      toast(`Request #${req.ref_number} approved`, 'success');
      load(page);
    } catch (err) {
      toast(err.response?.data?.error || 'Approval failed', 'error');
    } finally { setActionLoading(null); }
  };

  const handleReject = async (req, reason) => {
    setRejectTarget(null);
    setActionLoading(req.id);
    try {
      await rejectRequest(req.id, reason);
      toast(`Request #${req.ref_number} rejected`, 'success');
      load(page);
    } catch (err) {
      toast(err.response?.data?.error || 'Rejection failed', 'error');
    } finally { setActionLoading(null); }
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', border: '1px solid #E5E5E5', borderRadius: 9, overflow: 'hidden', background: '#fff' }}>
          {['pending', 'fulfilled', 'rejected'].map(s => (
            <button key={s} onClick={() => setTab(s)}
              style={{ height: 36, padding: '0 16px', border: 'none', background: tab === s ? '#0b66b2' : '#fff', color: tab === s ? '#fff' : '#4A4A48', font: 'inherit', fontSize: 13, fontWeight: tab === s ? 600 : 400, cursor: 'pointer', textTransform: 'capitalize' }}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={() => navigate('/receptionist/requests/new')}
          style={{ height: 36, padding: '0 14px', border: 'none', borderRadius: 8, background: '#0b66b2', color: '#fff', font: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          + New manual request
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input placeholder="Search name, SAP ID, ref…" value={filters.q}
          onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
          style={{ height: 36, padding: '0 12px', border: '1px solid #E5E5E5', borderRadius: 8, font: 'inherit', fontSize: 13, color: '#1A1A1A', background: '#fff', minWidth: 200 }} />
        <select value={filters.cluster} onChange={e => setFilters(f => ({ ...f, cluster: e.target.value }))}
          style={{ height: 36, padding: '0 10px', border: '1px solid #E5E5E5', borderRadius: 8, font: 'inherit', fontSize: 13, color: '#1A1A1A', background: '#fff' }}>
          <option value="">All departments</option>
          {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {user?.role === 'admin' && (
          <select value={filters.actioned_by} onChange={e => setFilters(f => ({ ...f, actioned_by: e.target.value }))}
            style={{ height: 36, padding: '0 10px', border: '1px solid #E5E5E5', borderRadius: 8, font: 'inherit', fontSize: 13, color: '#1A1A1A', background: '#fff' }}>
            <option value="">All actioned by</option>
            <option value="admin">Admin (Invinder Kaur)</option>
            <option value="guest">Guest</option>
          </select>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0, background: '#fff', border: '1px solid #E5E5E5', borderRadius: 12, overflow: 'auto' }}>
          {loading && <div style={{ padding: 20, textAlign: 'center', color: '#6B6B6B', fontSize: 14 }}>Loading…</div>}
          {!loading && requests.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#6B6B6B', fontSize: 14 }}>No {tab} requests</div>
          )}
          {!loading && requests.map(req => (
            <div key={req.id} onClick={() => setSelected(req)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid #F0F0EE', cursor: 'pointer', background: selected?.id === req.id ? '#d9ecfa' : 'transparent' }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>{req.teacher_name}</span>
                  <Badge status={req.status} />
                  {req.is_cap_override && <span style={{ fontSize: 11.5, fontWeight: 500, padding: '2px 7px', borderRadius: 20, background: '#EDE9FE', color: '#5B21B6' }}>Override</span>}
                </div>
                <span style={{ fontSize: 13, color: '#6B6B6B', fontFamily: "'IBM Plex Mono',monospace" }}>#{req.ref_number}</span>
                <span style={{ fontSize: 13, color: '#4A4A48' }}>{req.cluster} · SAP {req.sap_id} · {req.lines?.length || 0} item{req.lines?.length !== 1 ? 's' : ''}</span>
                <span style={{ fontSize: 12, color: '#9A9A96' }}>{fmtDate(req.created_at)}</span>
              </div>
              {tab === 'pending' && (
                <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                  <button onClick={e => { e.stopPropagation(); handleApprove(req); }} disabled={actionLoading === req.id}
                    style={{ height: 34, padding: '0 14px', border: 'none', borderRadius: 7, background: '#166534', color: '#fff', font: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                    {actionLoading === req.id ? '…' : 'Approve'}
                  </button>
                  <button onClick={e => { e.stopPropagation(); setRejectTarget(req); }} disabled={actionLoading === req.id}
                    style={{ height: 34, padding: '0 14px', border: '1px solid #D4D4D2', borderRadius: 7, background: '#fff', color: '#DC2626', font: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {selected && (
          <div style={{ width: 300, flexShrink: 0, background: '#fff', border: '1px solid #E5E5E5', borderRadius: 12, padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }}>Request detail</h3>
              <button onClick={() => setSelected(null)} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: '#6B6B6B', lineHeight: 1 }}>×</button>
            </div>
            <Badge status={selected.status} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5 }}>
              <Row label="Ref" val={<span style={{ fontFamily: "'IBM Plex Mono',monospace" }}>#{selected.ref_number}</span>} />
              <Row label="User" val={selected.teacher_name} />
              <Row label="SAP ID" val={selected.sap_id} />
              <Row label="Department" val={selected.cluster} />
              <Row label="Submitted" val={fmtDate(selected.created_at)} />
              {selected.status === 'fulfilled' && <Row label="Approved by" val={selected.fulfilled_by_name || '—'} />}
              {selected.status === 'fulfilled' && <Row label="Fulfilled at" val={fmtDate(selected.fulfilled_at)} />}
              {selected.status === 'rejected' && <Row label="Rejected by" val={selected.rejected_by_name || '—'} />}
              {selected.rejection_reason && <Row label="Reason" val={selected.rejection_reason} />}
              {selected.is_cap_override && <Row label="Override" val={selected.override_reason || 'Yes'} />}
            </div>
            <div style={{ borderTop: '1px solid #F0F0EE', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#6B6B6B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Items</span>
              {selected.lines?.map(line => (
                <div key={line.item_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderBottom: '1px solid #f4f8fc', fontSize: 14 }}>
                  <span>{line.item_name}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 500 }}>× {line.qty_requested ?? line.quantity_requested}</span>
                </div>
              ))}
            </div>
            {selected.status === 'pending' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleApprove(selected)} disabled={actionLoading === selected.id}
                  style={{ flex: 1, height: 40, border: 'none', borderRadius: 8, background: '#166534', color: '#fff', font: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                  Approve
                </button>
                <button onClick={() => setRejectTarget(selected)} disabled={actionLoading === selected.id}
                  style={{ flex: 1, height: 40, border: '1px solid #D4D4D2', borderRadius: 8, background: '#fff', color: '#DC2626', font: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
          <button onClick={() => load(page - 1)} disabled={page <= 1}
            style={{ height: 34, padding: '0 14px', border: '1px solid #E5E5E5', borderRadius: 7, background: '#fff', font: 'inherit', fontSize: 13, cursor: 'pointer', opacity: page <= 1 ? 0.4 : 1 }}>
            ← Prev
          </button>
          <span style={{ fontSize: 13, color: '#6B6B6B' }}>Page {page} of {totalPages}</span>
          <button onClick={() => load(page + 1)} disabled={page >= totalPages}
            style={{ height: 34, padding: '0 14px', border: '1px solid #E5E5E5', borderRadius: 7, background: '#fff', font: 'inherit', fontSize: 13, cursor: 'pointer', opacity: page >= totalPages ? 0.4 : 1 }}>
            Next →
          </button>
        </div>
      )}

      {rejectTarget && <RejectModal onConfirm={r => handleReject(rejectTarget, r)} onCancel={() => setRejectTarget(null)} />}
    </div>
  );
}

function Row({ label, val }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ color: '#6B6B6B', fontWeight: 500 }}>{label}</span>
      <span style={{ color: '#1A1A1A', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>{val}</span>
    </div>
  );
}
