import { useCallback, useEffect, useState } from "react";
import { listTeachers, listTeacherClusters, setTeacherCluster } from "../../../api/teacher";

// P1: Teachers & Departments view — previously these lived only in the DB.
export default function Teachers() {
  const [rows, setRows] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [q, setQ] = useState("");
  const [cluster, setCluster] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    listTeachers({ q: q || undefined, cluster: cluster || undefined })
      .then((r) => setRows(r.data))
      .catch((e) => setErr(e.response?.data?.error || "failed to load"));
  }, [q, cluster]);

  useEffect(load, [load]);
  useEffect(() => {
    listTeacherClusters().then((r) => setClusters(r.data)).catch(() => {});
  }, []);

  const fixCluster = async (t, c) => {
    try {
      await setTeacherCluster(t.id, c);
      load();
    } catch (e) {
      alert(e.response?.data?.error || "update failed");
    }
  };

  if (err) return <div className="err">{err}</div>;
  if (!rows) return <div className="spinner" />;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Teachers & Departments</h1>
          <p>
            {rows.length} people · legacy = migrated from historical records (no real SAP ID yet) · fix a
            wrong department inline
          </p>
        </div>
        <div className="inline" style={{ flexWrap: "wrap" }}>
          <input placeholder="Search name or SAP ID…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 220 }} />
          <select value={cluster} onChange={(e) => setCluster(e.target.value)} style={{ width: 200 }}>
            <option value="">All departments</option>
            {clusters.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>SAP ID</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Type</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 150).map((t) => (
                <tr key={t.id}>
                  <td><b>{t.name}</b></td>
                  <td className="muted">{t.sap_id}</td>
                  <td style={{ minWidth: 180 }}>
                    <select value={t.cluster} onChange={(e) => fixCluster(t, e.target.value)} style={{ padding: "5px 8px", fontSize: 13 }}>
                      {clusters.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="muted">{t.designation || "—"}</td>
                  <td className="muted">{t.employee_type || "—"}</td>
                  <td>{t.is_legacy ? <span className="badge muted">legacy</span> : <span className="badge fulfilled">kiosk</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 150 && <p className="muted small mt">Showing first 150 — narrow the search.</p>}
      </div>
    </>
  );
}