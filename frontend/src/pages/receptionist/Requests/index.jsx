import { useCallback, useEffect, useRef, useState } from "react";
import { listRequests } from "../../../api/requests";
import RequestCard from "../../../components/RequestCard";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "fulfilled", label: "Fulfilled" },
  { key: "rejected", label: "Rejected" },
];

// Keyboard-first queue: land on the page → first "Fulfill" is focused →
// Enter handles it, Tab walks the whole queue. No mouse needed.
export default function Requests() {
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);
  const lastFocusWasTyping = useRef(false);
  const PER = 40;

  const load = useCallback(() => {
    setLoading(true);
    listRequests({ status: tab, q: q || undefined, per_page: PER, page })
      .then((r) => {
        setRows(r.data.requests);
        setTotal(r.data.total);
      })
      .catch((e) => alert(e.response?.data?.error || "failed to load"))
      .finally(() => setLoading(false));
  }, [tab, q, page]);

  useEffect(load, [load]);
  const pages = Math.max(1, Math.ceil(total / PER));

  useEffect(() => {
    if (tab !== "pending" || !rows.length || !listRef.current) return;
    // never yank focus out of the search box
    const a = document.activeElement;
    if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT")) return;
    const btn = listRef.current.querySelector(".req-card .btn.ok");
    if (btn) btn.focus();
  }, [rows, tab]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Requests</h1>
          <p>
            Stock deducts only on fulfill. <b>{total}</b> {tab}.
          </p>
        </div>
        <div className="inline" style={{ flexWrap: "wrap" }}>
          <span className="kbd-hint">
            <kbd>Tab</kbd> next · <kbd>Enter</kbd> fulfill · focus walks the queue
          </span>
          <input
            placeholder="Search teacher or SAP ID…"
            value={q}
            onChange={(e) => {
              lastFocusWasTyping.current = true;
              setQ(e.target.value);
              setPage(1);
            }}
            onBlur={() => (lastFocusWasTyping.current = false)}
            style={{ maxWidth: 240 }}
            aria-label="Search requests"
          />
        </div>
      </div>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={tab === t.key ? "active" : ""}
            onClick={() => {
              setTab(t.key);
              setPage(1);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {loading && rows.length === 0 ? (
        <div className="spinner" />
      ) : rows.length === 0 ? (
        <div className="card empty">
          {tab === "pending" ? "Queue is clear — nothing waiting." : `No ${tab} requests.`}
        </div>
      ) : (
        <div className="req-list" ref={listRef}>
          {rows.map((r) => (
            <RequestCard key={r.id} req={r} onDone={load} />
          ))}
        </div>
      )}
      {pages > 1 && (
        <div className="pager">
          <button className="btn sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ← Prev
          </button>
          <span className="muted small">
            Page {page} of {pages} · {total} total
          </span>
          <button className="btn sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Next →
          </button>
        </div>
      )}
    </>
  );
}