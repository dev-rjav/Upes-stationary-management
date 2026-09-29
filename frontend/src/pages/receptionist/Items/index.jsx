import { useCallback, useEffect, useState } from "react";
import { listItems, updateItem, createItem, addAlias } from "../../../api/items";

export default function Items() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [showAliases, setShowAliases] = useState(false);
  const [aliasForm, setAliasForm] = useState({ alias: "", item_id: "" });
  const [newItem, setNewItem] = useState(null);

  const load = useCallback(() => {
    listItems(q ? { q } : {}).then((r) => setRows(r.data)).catch((e) => alert(e.response?.data?.error || "failed to load"));
  }, [q]);

  useEffect(load, [load]);

  const patch = (id, data) => updateItem(id, data).then(load).catch((e) => alert(e.response?.data?.error || "update failed"));

  const saveNew = async (e) => {
    e.preventDefault();
    try {
      await createItem({
        name: newItem.name,
        unit: newItem.unit || "EA",
        rate: Number(newItem.rate || 0),
        monthly_cap: newItem.monthly_cap === "" ? null : Number(newItem.monthly_cap),
        weekly_cap: newItem.weekly_cap === "" ? null : Number(newItem.weekly_cap),
        low_stock_threshold: Number(newItem.low_stock_threshold || 10),
        is_bulk: !!newItem.is_bulk,
      });
      setNewItem(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || "create failed");
    }
  };

  const saveAlias = async (e) => {
    e.preventDefault();
    if (!aliasForm.alias || !aliasForm.item_id) return;
    try {
      await addAlias(aliasForm.alias, Number(aliasForm.item_id));
      setAliasForm({ alias: "", item_id: "" });
      load();
    } catch (err) {
      alert(err.response?.data?.error || "alias failed");
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Items & Caps</h1>
          <p>
            Per-item monthly + weekly caps (D18). Bulk items like Loose Sheet are uncapped. Free-text
            department/item names are not allowed anywhere in the system (D17) — map vendor names as aliases.
          </p>
        </div>
        <div className="inline">
          <input placeholder="Search items…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 220 }} />
          <button className="btn" onClick={() => setShowAliases(!showAliases)}>Aliases</button>
          <button className="btn primary" onClick={() => setNewItem({ name: "", unit: "EA", rate: "", monthly_cap: 5, weekly_cap: 2, low_stock_threshold: 10, is_bulk: false })}>+ New item</button>
        </div>
      </div>

      {newItem && (
        <div className="card mb" style={{ marginBottom: 16 }}>
          <h3>New item</h3>
          <form onSubmit={saveNew} className="row">
            <label className="fld" style={{ flex: 2, marginBottom: 0 }}><span>Name</span><input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} required /></label>
            <label className="fld" style={{ marginBottom: 0 }}><span>Unit</span><input value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} /></label>
            <label className="fld" style={{ marginBottom: 0 }}><span>Rate ₹</span><input type="number" step="0.01" value={newItem.rate} onChange={(e) => setNewItem({ ...newItem, rate: e.target.value })} /></label>
            <label className="fld" style={{ marginBottom: 0 }}><span>Monthly cap</span><input type="number" value={newItem.monthly_cap} onChange={(e) => setNewItem({ ...newItem, monthly_cap: e.target.value })} /></label>
            <label className="fld" style={{ marginBottom: 0 }}><span>Weekly cap</span><input type="number" value={newItem.weekly_cap} onChange={(e) => setNewItem({ ...newItem, weekly_cap: e.target.value })} /></label>
            <label className="fld" style={{ marginBottom: 0 }}><span>Low-stock at</span><input type="number" value={newItem.low_stock_threshold} onChange={(e) => setNewItem({ ...newItem, low_stock_threshold: e.target.value })} /></label>
            <label className="fld" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end", gap: 6 }}><input type="checkbox" style={{ width: "auto" }} checked={newItem.is_bulk} onChange={(e) => setNewItem({ ...newItem, is_bulk: e.target.checked })} /> Bulk</label>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <button className="btn primary" type="submit">Save</button>
              <button className="btn" type="button" onClick={() => setNewItem(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {showAliases && (
        <div className="card mb" style={{ marginBottom: 16 }}>
          <h3>Learn an alias (D14) — e.g. vendor writes "Pen Blue Parker"</h3>
          <form onSubmit={saveAlias} className="row" style={{ alignItems: "flex-end" }}>
            <label className="fld" style={{ flex: 2, marginBottom: 0 }}><span>Alias text</span><input value={aliasForm.alias} onChange={(e) => setAliasForm({ ...aliasForm, alias: e.target.value })} required /></label>
            <label className="fld" style={{ flex: 3, marginBottom: 0 }}>
              <span>Canonical item</span>
              <select value={aliasForm.item_id} onChange={(e) => setAliasForm({ ...aliasForm, item_id: e.target.value })} required>
                <option value="">Select…</option>
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </label>
            <button className="btn primary" type="submit" style={{ marginBottom: 0 }}>Save alias</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Item</th>
                <th>Aliases</th>
                <th className="num">Rate</th>
                <th className="num">Stock</th>
                <th className="num">Monthly cap</th>
                <th className="num">Weekly cap</th>
                <th className="num">Low at</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.name}</b> <span className="muted small">{r.unit}{r.hsn_code ? ` · ${r.hsn_code}` : ""}</span>
                  </td>
                  <td className="muted small" style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.aliases.slice(0, 3).join(", ")}{r.aliases.length > 3 ? ` +${r.aliases.length - 3}` : ""}
                  </td>
                  <td className="num">₹{r.rate ? Number(r.rate).toLocaleString("en-IN") : "—"}</td>
                  <td className="num">{r.stock?.toLocaleString("en-IN") ?? "—"}{r.is_low && <span className="badge low" style={{ marginLeft: 6 }}>LOW</span>}</td>
                  <td className="num" style={{ minWidth: 90 }}>
                    <input type="number" defaultValue={r.monthly_cap ?? ""} placeholder="∞" onBlur={(e) => e.target.value !== String(r.monthly_cap ?? "") && patch(r.id, { monthly_cap: e.target.value === "" ? null : Number(e.target.value) })} style={{ width: 74, padding: "4px 8px" }} />
                  </td>
                  <td className="num" style={{ minWidth: 90 }}>
                    <input type="number" defaultValue={r.weekly_cap ?? ""} placeholder="∞" onBlur={(e) => e.target.value !== String(r.weekly_cap ?? "") && patch(r.id, { weekly_cap: e.target.value === "" ? null : Number(e.target.value) })} style={{ width: 74, padding: "4px 8px" }} />
                  </td>
                  <td className="num">{r.low_stock_threshold}</td>
                  <td>
                    <div className="inline" style={{ gap: 4 }}>
                      {r.is_bulk && <span className="badge bulk">BULK</span>}
                      {!r.active && <span className="badge rejected">OFF</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}