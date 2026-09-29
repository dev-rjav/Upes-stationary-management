import { useState } from "react";
import useSAPLookup from "../../hooks/useSAPLookup";

// Old-faculty fast path: known staff type ONE thing (SAP ID) and get to items.
// First-timers get exactly two more fields (name + cluster); designation/type
// hide behind "optional" because nobody at the kiosk cares about them.
export default function SAPLookup({ clusters, onFound }) {
  const lookup = useSAPLookup();
  const [sap, setSap] = useState("");
  const [needsIdentity, setNeedsIdentity] = useState(false);
  const [name, setName] = useState("");
  const [cluster, setCluster] = useState("");
  const [designation, setDesignation] = useState("");
  const [employeeType, setEmployeeType] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!sap.trim()) return setErr("Type your SAP ID first.");
    setBusy(true);
    try {
      const r = await lookup({
        sap_id: sap,
        name: name.trim(),
        cluster,
        designation,
        employee_type: employeeType,
      });
      onFound(r.teacher, r.created);
    } catch (ex) {
      const d = ex.response?.data || {};
      if (d.code === "new_teacher") {
        setNeedsIdentity(true);
        setErr("");
      } else {
        setErr(d.error || "lookup failed");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <label className="fld">
        <span>
          {needsIdentity ? "SAP ID (from your photo card / payslip)" : "SAP ID"}
        </span>
        <input
          value={sap}
          onChange={(e) => setSap(e.target.value)}
          placeholder="e.g. 2021A1P0601"
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          inputMode="text"
        />
      </label>

      {needsIdentity && (
        <div className="id-fields">
          <p className="small muted" style={{ marginTop: 0, marginBottom: 12 }}>
            First time using the kiosk — one-time setup, we remember you after this.
          </p>
          <label className="fld">
            <span>Your full name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. …" />
          </label>
          <label className="fld">
            <span>Your department / cluster</span>
            <select value={cluster} onChange={(e) => setCluster(e.target.value)}>
              <option value="">Select…</option>
              {clusters.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </label>
          <details style={{ marginTop: 4 }}>
            <summary className="opt-head">Optional details (skip this)</summary>
            <div className="row" style={{ marginTop: 12 }}>
              <label className="fld" style={{ marginBottom: 8 }}>
                <span>Designation</span>
                <select value={designation} onChange={(e) => setDesignation(e.target.value)}>
                  <option value="">—</option>
                  {["Professor", "Associate Professor", "Assistant Professor", "Reader", "Research Fellow"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label className="fld" style={{ marginBottom: 8 }}>
                <span>Employee type</span>
                <select value={employeeType} onChange={(e) => setEmployeeType(e.target.value)}>
                  <option value="">—</option>
                  {["Regular", "Contractual", "Visiting", "Adjunct"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
            </div>
          </details>
        </div>
      )}

      {err && <div className="err">{err}</div>}
      <button className="btn primary xl" disabled={busy}>
        {busy ? "One moment…" : needsIdentity ? "Save & continue →" : "Continue →"}
      </button>
    </form>
  );
}