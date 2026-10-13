import React, { useState, useEffect, useRef } from 'react';
import { lookupSAP, listClusters, getClusterItems } from '../../api/teacher';
import { submitRequest } from '../../api/requests';
import { capInfo } from '../../hooks/useCapCheck';
import { saveTeacherProfile, loadTeacherProfile, clearTeacherProfile } from '../../utils/teacherProfile';
import upesMark from '../../assets/upes-mark.png';

const S = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 16px', background: '#f4f8fc' },
  card: (narrow) => ({ width: '100%', maxWidth: narrow ? '100%' : 440, background: '#fff', border: narrow ? 'none' : '1px solid #E5E5E5', borderRadius: narrow ? 0 : 14, minHeight: narrow ? 'calc(100vh - 44px)' : 'auto', display: 'flex', flexDirection: 'column', padding: '24px 20px 28px' }),
  h1: { margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em' },
  input: { height: 52, padding: '0 16px', border: '1px solid #CFCFCB', borderRadius: 10, font: 'inherit', fontSize: 16, color: '#1A1A1A', background: '#fff', width: '100%' },
  btn: { height: 54, border: 'none', borderRadius: 10, background: '#0b66b2', color: '#fff', font: 'inherit', fontSize: 16, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnSec: { height: 44, border: 'none', background: 'none', color: '#0b66b2', font: 'inherit', fontSize: 15, fontWeight: 500, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 },
};

function Spinner() {
  return <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />;
}

export default function RequestForm() {
  const [step, setStep] = useState(1); // 1 | '2a' | '2b' | 3 | 4 | 'done'
  const [sap, setSap] = useState('');
  const [looking, setLooking] = useState(false);
  const [found, setFound] = useState(false);
  const [profile, setProfile] = useState({ name: '', cluster: '', cluster_id: null });
  const [mName, setMName] = useState('');
  const [clusters, setClusters] = useState([]);
  const [items, setItems] = useState([]);
  const [qty, setQty] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [ref, setRef] = useState('');
  const [w, setW] = useState(window.innerWidth);
  const [remembered, setRemembered] = useState(false);
  const sapRef = useRef();

  useEffect(() => {
    listClusters().then(r => setClusters(r.data)).catch(() => {});
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);

    // Pre-fill from the remembered profile cookie so a returning teacher can
    // confirm and skip straight to item selection.
    const saved = loadTeacherProfile();
    if (saved) {
      setSap(saved.sap_id);
      setFound(true);
      setRemembered(true);
      setProfile({ name: saved.name, cluster: saved.cluster, cluster_id: saved.cluster_id });
      setStep('2a');
    }

    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    if (step === 1) sapRef.current?.focus();
    window.scrollTo(0, 0);
  }, [step]);

  const narrow = w < 560;
  const sapValid = /^4000\d{4}$/.test(sap);  // 8 digits, starts with 4000

  const handleSap = async (e) => {
    e.preventDefault();
    if (!sapValid || looking) return;
    setLooking(true);
    try {
      const r = await lookupSAP(sap);
      if (r.data.found) {
        setFound(true);
        setProfile({ name: r.data.name, cluster: r.data.cluster, cluster_id: r.data.cluster_id });
        setStep('2a');
      } else {
        setFound(false);
        setProfile({ name: '', cluster: '', cluster_id: null });
        setMName('');
        setStep('2b');
      }
    } catch { } finally { setLooking(false); }
  };

  const confirmProfile = async () => {
    await loadItems(profile.cluster_id);
    setStep(3);
  };

  const handleManual = async (e) => {
    e.preventDefault();
    if (!mName.trim() || !profile.cluster_id) return;
    setProfile(p => ({ ...p, name: mName.trim() }));
    await loadItems(profile.cluster_id);
    setStep(3);
  };

  const loadItems = async (clusterId) => {
    try {
      const r = await getClusterItems(clusterId, sap);
      setItems(r.data);
    } catch { setItems([]); }
  };

  const setQ = (id, v, max) => {
    v = Math.max(0, Math.min(max, isNaN(v) ? 0 : v));
    setQty(q => ({ ...q, [id]: v }));
  };

  const picked = items.filter(it => (qty[it.id] || 0) > 0);
  const totalUnits = picked.reduce((a, it) => a + qty[it.id], 0);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const r = await submitRequest({
        sap_id: sap,
        name: profile.name,
        cluster: profile.cluster,
        items: picked.map(it => ({ item_id: it.id, qty: qty[it.id] })),
      });
      setRef(r.data.ref_number);
      // Remember this teacher on their device for next time.
      saveTeacherProfile({ sap_id: sap, name: profile.name, cluster: profile.cluster, cluster_id: profile.cluster_id });
      setRemembered(true);
      setStep('done');
    } catch { } finally { setSubmitting(false); }
  };

  const forget = () => {
    clearTeacherProfile();
    setRemembered(false);
    setStep(1); setSap(''); setFound(false);
    setProfile({ name: '', cluster: '', cluster_id: null });
    setMName('');
  };

  const reset = () => {
    setQty({}); setRef('');
    const saved = loadTeacherProfile();
    if (saved) {
      // Returning teacher: go back to the "Is this you?" confirmation.
      setSap(saved.sap_id);
      setProfile({ name: saved.name, cluster: saved.cluster, cluster_id: saved.cluster_id });
      setStep('2a');
    } else {
      setStep(1); setSap(''); setProfile({ name: '', cluster: '', cluster_id: null }); setMName('');
    }
  };

  const stepIdx = { 1: 1, '2a': 2, '2b': 2, 3: 3, 4: 4, done: 4 }[step] || 1;

  return (
    <div style={{ ...S.page, padding: narrow ? '0' : '40px 16px' }}>
      <div style={S.card(narrow)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <img src={upesMark} alt="UPES" style={{ height: 38, width: 'auto', display: 'block' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '0.03em' }}>UPES</span>
            <span style={{ fontSize: 12, color: '#6B6B6B' }}>Stationery Request</span>
          </div>
        </div>

        {step !== 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#6B6B6B' }}>{stepIdx} of 4</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 }}>
              {[1, 2, 3, 4].map(n => <div key={n} style={{ height: 4, borderRadius: 2, background: n <= stepIdx ? '#0b66b2' : '#E5E5E5' }} />)}
            </div>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSap} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h1 style={S.h1}>Enter your SAP ID</h1>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, fontWeight: 500, color: '#4A4A48' }}>
              SAP ID
              <input ref={sapRef} inputMode="numeric" autoComplete="off" placeholder="e.g. 40001234"
                value={sap} onChange={e => setSap(e.target.value.replace(/\D/g, '').slice(0, 8))}
                disabled={looking}
                style={{ ...S.input, fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, letterSpacing: '0.06em' }} />
              <span style={{ fontSize: 12.5, color: sap && !sapValid ? '#991B1B' : '#8A8A86', fontWeight: 400 }}>
                {sap && !sapValid ? 'SAP ID must be 8 digits and start with 4000' : 'Must be 8 digits starting with 4000'}
              </span>
            </label>
            <button type="submit" disabled={!sapValid || looking}
              style={{ ...S.btn, opacity: !sapValid ? 0.4 : 1 }}>
              {looking && <Spinner />}{looking ? 'Checking…' : 'Continue'}
            </button>
          </form>
        )}

        {step === '2a' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h1 style={S.h1}>{remembered ? 'Welcome back' : 'Is this you?'}</h1>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, fontWeight: 500, color: '#4A4A48' }}>
              Name
              <input readOnly value={profile.name} style={{ ...S.input, background: '#f4f8fc', border: '1px solid #E5E5E5' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, fontWeight: 500, color: '#4A4A48' }}>
              Department
              <input readOnly value={profile.cluster} style={{ ...S.input, background: '#f4f8fc', border: '1px solid #E5E5E5' }} />
            </label>
            <button onClick={confirmProfile} style={{ ...S.btn, marginTop: 8 }}>Yes, continue</button>
            <button onClick={forget} style={S.btnSec}>Not me — re-enter SAP ID</button>
          </div>
        )}

        {step === '2b' && (
          <form onSubmit={handleManual} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: '12px 14px', borderRadius: 10, background: '#FEF3C7', color: '#7A4306', fontSize: 14, lineHeight: 1.45 }}>
              SAP ID {sap} not found — please fill in your details.
            </div>
            <h1 style={S.h1}>Tell us about yourself</h1>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, fontWeight: 500, color: '#4A4A48' }}>
              Full name
              <input id="t-name" value={mName} onChange={e => setMName(e.target.value)} autoComplete="name" style={S.input} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, fontWeight: 500, color: '#4A4A48' }}>
              Department
              <select
                id="t-cluster"
                value={profile.cluster_id || ''}
                onChange={e => {
                  const c = clusters.find(cl => cl.id === parseInt(e.target.value, 10));
                  setProfile(p => ({ ...p, cluster: c ? c.name : '', cluster_id: c ? c.id : null }));
                }}
                style={{ ...S.input, cursor: 'pointer', appearance: 'auto' }}
              >
                <option value="">Select department…</option>
                {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <button type="submit" disabled={!mName.trim() || !profile.cluster_id}
              style={{ ...S.btn, opacity: (!mName.trim() || !profile.cluster_id) ? 0.4 : 1, marginTop: 8 }}>
              Continue
            </button>
            <button type="button" onClick={() => { setStep(1); setSap(''); }} style={S.btnSec}>← Re-enter SAP ID</button>
          </form>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <h1 style={S.h1}>What do you need?</h1>
              <span style={{ fontSize: 14, color: '#6B6B6B' }}>Showing items available to {profile.cluster} department</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid #EDEDEB' }}>
              {items.map(it => {
                const { maxQty, atCap, monthlyUsed } = capInfo(it);
                const q = qty[it.id] || 0;
                return (
                  <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #EDEDEB', opacity: atCap ? 0.45 : 1 }}>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 15, fontWeight: 500 }}>{it.name}</span>
                      <span style={{ fontSize: 12.5, color: atCap ? '#991B1B' : '#6B6B6B' }}>
                        {atCap
                          ? `Monthly cap reached (${it.monthly_cap} of ${it.monthly_cap})`
                          : `Used ${monthlyUsed} of ${it.monthly_cap || '∞'} this month · max ${maxQty} now`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #CFCFCB', borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                      <button aria-label={`Decrease ${it.name}`} onClick={() => setQ(it.id, q - 1, maxQty)} disabled={atCap || q <= 0}
                        style={{ width: 44, height: 44, border: 'none', background: '#fff', font: 'inherit', fontSize: 20, color: '#1A1A1A', cursor: 'pointer' }}>−</button>
                      <input type="number" inputMode="numeric" aria-label={`${it.name} quantity`} value={q}
                        onChange={e => setQ(it.id, parseInt(e.target.value, 10), maxQty)}
                        onFocus={e => e.target.select()} disabled={atCap}
                        style={{ width: 44, height: 44, border: 'none', borderLeft: '1px solid #E5E5E5', borderRight: '1px solid #E5E5E5', textAlign: 'center', fontFamily: "'IBM Plex Mono',monospace", fontSize: 16, fontWeight: 500, color: '#1A1A1A', background: '#fff', WebkitAppearance: 'none' }} />
                      <button aria-label={`Increase ${it.name}`} onClick={() => setQ(it.id, q + 1, maxQty)} disabled={atCap || q >= maxQty}
                        style={{ width: 44, height: 44, border: 'none', background: '#fff', font: 'inherit', fontSize: 20, color: '#1A1A1A', cursor: 'pointer' }}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ position: 'sticky', bottom: 0, background: '#fff', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 14, color: '#4A4A48', fontWeight: 500 }}>
                {totalUnits === 0 ? 'No items selected' : `${totalUnits} item${totalUnits !== 1 ? 's' : ''} selected`}
              </span>
              <button onClick={() => setStep(4)} disabled={totalUnits === 0}
                style={{ ...S.btn, opacity: totalUnits === 0 ? 0.4 : 1 }}>
                Review request
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h1 style={S.h1}>Review your request</h1>
            <div style={{ border: '1px solid #E5E5E5', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', background: '#f4f8fc', borderBottom: '1px solid #E5E5E5', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{profile.name}</span>
                <span style={{ fontSize: 13.5, color: '#6B6B6B' }}>{profile.cluster} · SAP {sap}</span>
              </div>
              {picked.map(it => (
                <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderBottom: '1px solid #F0F0EE', fontSize: 15 }}>
                  <span>{it.name}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 500 }}>× {qty[it.id]}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', fontSize: 14, color: '#4A4A48', fontWeight: 500 }}>
                <span>Total</span><span style={{ fontFamily: "'IBM Plex Mono',monospace" }}>{totalUnits} units</span>
              </div>
            </div>
            <button onClick={handleSubmit} disabled={submitting}
              style={{ ...S.btn, opacity: submitting ? 0.7 : 1 }}>
              {submitting && <Spinner />}{submitting ? 'Submitting…' : 'Submit request'}
            </button>
            <button onClick={() => setStep(3)} disabled={submitting} style={S.btnSec}>← Edit items</button>
          </div>
        )}

        {step === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14, paddingTop: 24 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#DCFCE7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 600 }}>✓</div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600 }}>Request submitted</h1>
            <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.55, color: '#4A4A48', maxWidth: 320 }}>Come to the reception desk to collect your items. Show this reference number.</p>
            <div style={{ margin: '10px 0', padding: '18px 28px', border: '2px dashed #CFCFCB', borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#6B6B6B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Reference</span>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 40, fontWeight: 600, letterSpacing: '0.04em' }}>{ref}</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: '#6B6B6B' }}>Your request will be reviewed when you arrive.</p>
            <button onClick={reset} style={{ marginTop: 12, height: 48, padding: '0 28px', border: '1px solid #CFCFCB', borderRadius: 10, background: '#fff', color: '#1A1A1A', font: 'inherit', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>Done</button>
          </div>
        )}
      </div>
      <a href="/login" style={{ margin: '18px 0 8px', fontSize: 12, color: '#8A8A86' }}>Receptionist desk →</a>
    </div>
  );
}
