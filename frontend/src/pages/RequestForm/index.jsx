import { useEffect, useMemo, useRef, useState } from "react";
import { listItems } from "../../api/items";
import { createRequest, statusLookup } from "../../api/requests";
import SAPLookup from "../../components/SAPLookup";
import ItemSelector from "../../components/ItemSelector";
import KioskCart from "../../components/KioskCart";
import useCapCheck from "../../hooks/useCapCheck";

// P1: teacher can check their own request status by number + SAP ID (no login).
function StatusCheck() {
  const [open, setOpen] = useState(false);
  const [no, setNo] = useState("");
  const [sap, setSap] = useState("");
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const check = async (e) => {
    e.preventDefault();
    setErr("");
    setResult(null);
    try {
      const r = await statusLookup(no.trim(), sap.trim());
      setResult(r.data);
    } catch (ex) {
      setErr(ex.response?.data?.error || "couldn't check — number and SAP ID must both be right");
    }
  };
  if (!open) {
    return (
      <button type="button" className="status-toggle" onClick={() => setOpen(true)}>
        Already made a request? Check its status →
      </button>
    );
  }
  return (
    <div className="card checkout-card" style={{ marginBottom: 12 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 0 }}>Check my request</h3>
      <form onSubmit={check}>
        <div className="row">
          <label className="fld" style={{ marginBottom: 8 }}>
            <span>Request number (from your confirmation)</span>
            <input value={no} onChange={(e) => setNo(e.target.value)} placeholder="e.g. 645" inputMode="numeric" />
          </label>
          <label className="fld" style={{ marginBottom: 8 }}>
            <span>Your SAP ID</span>
            <input value={sap} onChange={(e) => setSap(e.target.value)} placeholder="e.g. 2021A1P0601" />
          </label>
        </div>
        {err && <div className="err" style={{ marginTop: 8 }}>{err}</div>}
        {result && (
          <div style={{ marginTop: 10 }}>
            <p className="small muted" style={{ marginTop: 0 }}>{result.teacher} — your recent requests:</p>
            {result.requests.map((r) => (
              <div key={r.no} className="cart-row" style={{ borderBottom: "1px solid var(--line)" }}>
                <div className="nm">
                  #{r.no}
                  <small>
                    {r.status === "fulfilled"
                      ? `collected ${String(r.fulfilled_at).slice(0, 16)}`
                      : r.status === "pending"
                        ? "waiting at the counter"
                        : "rejected"}
                    {" · "}
                    {r.items.map((i) => `${i.qty}× ${i.item}${i.returned ? ` (↩${i.returned})` : ""}`).join(", ")}
                  </small>
                </div>
                <span className={`badge ${r.status}`}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
        <div className="inline" style={{ marginTop: 10 }}>
          <button className="btn primary" disabled={!no || !sap}>Check status</button>
          <button type="button" className="btn" onClick={() => { setOpen(false); setResult(null); setErr(""); }}>← Back to ordering</button>
        </div>
      </form>
    </div>
  );
}

// Kiosk, Norman pass:
//  - grid of cards, ONE obvious action each (+ Add -> - n +)
//  - caps are hard constraints (disabled + plain words), never a late surprise
//  - cart = list, always reachable from the sticky bar, synced with the grid
//  - every tap has visible feedback; removing offers Undo
export default function RequestForm() {
  const [clusters, setClusters] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [popular, setPopular] = useState(null);
  const [searchItems, setSearchItems] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [err, setErr] = useState("");
  const [undo, setUndo] = useState(null); // {it, qty} removed-item toast
  const searchTimer = useRef(null);
  const undoTimer = useRef(null);
  const itemReg = useRef({}); // id -> item, across popular+search lists
  const { caps, week, loading: capsLoading } = useCapCheck(teacher?.sap_id);

  const remember = (list) => {
    for (const it of list) itemReg.current[it.id] = it;
  };

  useEffect(() => {
    fetch("/api/items/clusters").then((r) => r.json()).then(setClusters).catch(() => {});
    listItems({ top: 10 })
      .then((r) => {
        remember(r.data);
        setPopular(r.data);
      })
      .catch(() => setPopular([]));
  }, []);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!search.trim()) return setSearchItems(null);
    searchTimer.current = setTimeout(() => {
      listItems({ q: search.trim() })
        .then((r) => {
          const rows = r.data.slice(0, 40);
          remember(rows);
          setSearchItems(rows);
        })
        .catch(() => setSearchItems([]));
    }, 250);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const items = useMemo(() => (search.trim() ? searchItems ?? [] : popular ?? []), [search, searchItems, popular]);

  const setQty = (id, qty) => {
    setSelected((p) => {
      const prev = p[id] || 0;
      if (qty === 0 && prev > 0) {
        // removed -> offer undo for 5s
        setUndo({ it: itemReg.current[id], qty: prev });
        clearTimeout(undoTimer.current);
        undoTimer.current = setTimeout(() => setUndo(null), 5000);
      } else {
        setUndo(null);
      }
      const n = { ...p };
      if (qty <= 0) delete n[id];
      else n[id] = qty;
      return n;
    });
  };

  const restore = () => {
    if (!undo) return;
    const { it, qty } = undo;
    setSelected((p) => ({ ...p, [it.id]: qty }));
    setUndo(null);
    clearTimeout(undoTimer.current);
  };

  const lines = Object.entries(selected)
    .filter(([, q]) => q > 0)
    .map(([id, qty]) => ({ it: itemReg.current[Number(id)], qty }))
    .filter((l) => l.it)
    .reverse(); // newest first (mapping: the thing you just tapped is on top)
  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const totalRs = lines.reduce((s, l) => s + (l.it.rate || 0) * l.qty, 0);

  const place = async () => {
    setErr("");
    if (lines.length === 0) return;
    setBusy(true);
    try {
      const r = await createRequest({
        teacher_id: teacher.id,
        items: lines.map((l) => ({ item_id: l.it.id, qty: l.qty })),
      });
      setSubmitted(r.data.request);
      setCartOpen(false);
      setSelected({});
      setSearch("");
    } catch (ex) {
      const d = ex.response?.data || {};
      setErr(
        d.error === "cap exceeded" && d.details
          ? "We couldn't place the whole request. Please reduce:\n" +
            d.details.map((x) => `• ${x.item} — ${x.error}`).join("\n")
          : d.error || "couldn't place the request"
      );
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <div className="kiosk-page" style={{ paddingBottom: 24 }}>
        <div className="card checkout-card" style={{ textAlign: "center", paddingTop: 26 }}>
          <div style={{ fontSize: 38 }}>✅</div>
          <h1 style={{ marginTop: 8 }}>Request placed</h1>
          <div className="confirm-num">#{submitted.id}</div>
          <p className="muted" style={{ marginTop: 2 }}>
            {new Date().toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
          </p>
          <div className="confirm-steps card" style={{ background: "#fafbff" }}>
            <div><b>1</b> Go about your day — no waiting anywhere.</div>
            <div><b>2</b> At the counter, show this number to the receptionist.</div>
            <div><b>3</b> Collect your items. Done.</div>
          </div>
          <div className="card" style={{ textAlign: "left", background: "#fafbff", marginTop: 14 }}>
            {submitted.items.map((i) => (
              <div className="k-item" key={i.id}>
                <div className="top">
                  <span className="nm">{i.item}<small>{i.unit}</small></span>
                  <span className="qv" style={{ fontSize: 18, fontWeight: 700 }}>{i.qty}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="btn primary xl" onClick={() => { setSubmitted(null); setTeacher(null); setErr(""); }}>
            Make another request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="kiosk-page">
      <div className="kicker">UPES Stationery</div>
      <p className="tagline">Order on your phone · collect at the counter · no standing in line</p>

      <StatusCheck />

      <div className="card checkout-card">
        <SAPLookup clusters={clusters} onFound={(t) => { setTeacher(t); setErr(""); }} />

        {teacher && (
          <>
            <div className="inline" style={{ margin: "18px 0 6px", padding: "12px 14px", background: "var(--ok-soft)", borderRadius: 12, flexWrap: "wrap" }}>
              <b style={{ fontSize: 16 }}>{teacher.name}</b>
              <span className="badge fulfilled">{teacher.cluster}</span>
              <button
                type="button"
                className="btn sm right"
                style={{ border: "none", background: "none", color: "var(--ink-2)", textDecoration: "underline", minHeight: 40 }}
                onClick={() => { setTeacher(null); setSelected({}); }}
              >
                change
              </button>
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "8px 0 4px" }}>
              {search.trim() ? `Results for "${search.trim()}"` : "Pick your items"}
            </h3>
            <p className="small muted" style={{ margin: "0 0 10px" }}>
              {capsLoading ? "Checking your allowance…" : "Tap + on what you need. Your limits are shown on each card."}
            </p>

            <input
              placeholder="Search items… (pen, file, tape)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ marginBottom: 12 }}
              autoComplete="off"
              aria-label="Search items"
            />

            <ItemSelector items={items} caps={caps} selected={selected} setQty={setQty} />
            {search && items.length === 40 && <p className="small muted mt">40 matches — type more to narrow down.</p>}
          </>
        )}
      </div>

      {err && !cartOpen && <div className="err" style={{ margin: "12px 4px" }}>{err}</div>}

      {undo && !submitted && (
        <div className="undo-toast">
          <span className="small">
            Removed <b>{undo.it.name}</b>
          </span>
          <button type="button" className="btn sm" onClick={restore}>Undo</button>
        </div>
      )}

      <KioskCart
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lines={lines}
        caps={caps}
        setQty={setQty}
        totalQty={totalQty}
        totalRs={totalRs}
        onPlace={place}
        placing={busy}
        error={err}
      />

      {teacher && (
        <div className="kiosk-bar">
          <div className="inner">
            <button type="button" className="bar-cart" onClick={() => setCartOpen(true)} disabled={totalQty === 0} aria-label={`Open your request, ${totalQty} items`}>
              🧺
              {totalQty > 0 && <span className="count-badge">{totalQty}</span>}
            </button>
            <div className="sum">
              {totalQty === 0 ? "Nothing picked yet" : `${lines.length} item${lines.length === 1 ? "" : "s"} · ${totalQty} unit${totalQty === 1 ? "" : "s"}`}
              {totalRs > 0 && <small>₹{Math.round(totalRs).toLocaleString("en-IN")} at counter rates</small>}
            </div>
            <button type="button" className="btn primary" style={{ minHeight: 56, padding: "12px 22px", fontSize: 16.5, fontWeight: 700, borderRadius: 14 }} disabled={totalQty === 0} onClick={() => setCartOpen(true)}>
              Review →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}