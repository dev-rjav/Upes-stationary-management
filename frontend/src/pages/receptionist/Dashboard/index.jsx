import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboard } from "../../../api/dashboard";
import { getReport } from "../../../api/reports";
import MonthlyTrend from "../../../components/charts/MonthlyTrend";
import ClusterSpend from "../../../components/charts/ClusterSpend";
import TopItems from "../../../components/charts/TopItems";
import TeacherUsage from "../../../components/charts/TeacherUsage";

// Calm, single-viewport on desktop: no page scroll. The one thing that needs
// acting on (pending queue) is a keyboard-reachable button up top.
export default function Dashboard() {
  const [d, setD] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    getDashboard()
      .then((r) => setD(r.data))
      .catch((e) => setErr(e.response?.data?.error || "failed to load"));
    getReport("teacher")
      .then((r) => setTeachers(r.data.rows.slice(0, 8)))
      .catch(() => {});
  }, []);

  if (err) return <div className="err">{err}</div>;
  if (!d) return <div className="spinner" />;

  return (
    <div className="dash">
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="small">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} · this month
          </p>
        </div>
        <div className="inline">
          <span className="kbd-hint">
            <kbd>Tab</kbd> to move · <kbd>Enter</kbd> to act
          </span>
          <Link to="/receptionist/requests" className="btn primary" aria-label={`Review ${d.pending_count} pending requests`}>
            {d.pending_count} pending →
          </Link>
        </div>
      </div>

      <div className="grid cols-4">
        <div className="card stat accent" title="Waiting at the counter">
          <div className="num">{d.pending_count}</div>
          <div className="lbl">Pending</div>
        </div>
        <div className="card stat" title="Fulfilled requests this month, including migrated records">
          <div className="num">{d.month_fulfilled}</div>
          <div className="lbl">Fulfilled this month</div>
        </div>
        <div className="card stat" title="Spend at frozen purchase rates">
          <div className="num">₹{Math.round(d.month_spend).toLocaleString("en-IN")}</div>
          <div className="lbl">Spend this month</div>
        </div>
        <div className={`card stat ${d.low_stock_count ? "warn" : ""}`} title="Items at or below their low-stock threshold">
          <div className="num">{d.low_stock_count ?? d.low_stock.length}</div>
          <div className="lbl">Low stock</div>
        </div>
      </div>

      <div className="charts">
        <div className="card">
          <h3>Daily spend</h3>
          <div className="chart-flex"><MonthlyTrend data={d.trend} /></div>
        </div>
        <div className="card">
          <h3>Spend by cluster</h3>
          <div className="chart-flex"><ClusterSpend data={d.cluster_spend} /></div>
        </div>
        <div className="card">
          <h3>Top items by spend</h3>
          <div className="chart-flex"><TopItems data={d.top_items.slice(0, 6)} /></div>
        </div>
        <div className="card">
          <h3>Top teachers by spend</h3>
          <div className="chart-flex"><TeacherUsage data={teachers} /></div>
        </div>
      </div>

      <div className="card dash-low">
        <h3 style={{ marginBottom: 8 }}>
          Low stock {d.low_stock.length > 0 && <span className="muted small">— reorder soon</span>}
          <Link to="/receptionist/stock-in" className="btn sm right" style={{ marginLeft: 12 }}>
            Add stock →
          </Link>
        </h3>
        {d.low_stock.length ? (
          <div className="chips">
            {d.low_stock.map((l) => (
              <span className="chip" key={l.item} title={`${l.item} — threshold ${l.threshold}`}>
                {l.item.length > 26 ? l.item.slice(0, 25) + "…" : l.item}
                <b>{l.qty}/{l.threshold}</b>
              </span>
            ))}
          </div>
        ) : (
          <span className="chip ok">All items above threshold</span>
        )}
      </div>
    </div>
  );
}