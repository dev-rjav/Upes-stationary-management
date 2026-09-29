import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { unreadCount } from "../../api/dashboard";

const LINKS = [
  { to: "/receptionist/dashboard", ico: "📊", label: "Dashboard" },
  { to: "/receptionist/requests", ico: "📥", label: "Requests" },
  { to: "/receptionist/manual-request", ico: "✍️", label: "Manual / Override" },
  { to: "/receptionist/stock", ico: "📦", label: "Stock" },
  { to: "/receptionist/stock-in", ico: "🚚", label: "Stock In (Excel)" },
  { to: "/receptionist/items", ico: "🏷️", label: "Items & Caps" },
  { to: "/receptionist/teachers", ico: "🎓", label: "Teachers" },
  { to: "/receptionist/reports", ico: "📄", label: "Reports" },
];

export default function ReceptionistLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [unread, setUnread] = useState(0);

  // P2: lightweight bell count, polled (no full dashboard payload)
  useEffect(() => {
    const tick = () => unreadCount().then((r) => setUnread(r.data.unread)).catch(() => {});
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">🖇️</div>
          <div>
            <b>UPES Stationery</b>
            <span>Reception desk</span>
          </div>
        </div>
        <nav className="nav">
          <NavLink to="/receptionist/dashboard" className="nav-bell" aria-label={`${unread} unread alerts`}>
            <span className="ico">🔔</span>
            <span className="lbl">Alerts</span>
            {unread > 0 && <span className="bell-badge">{unread > 99 ? "99+" : unread}</span>}
          </NavLink>
          <div className="divider">Desk</div>
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? "active" : "")}>
              <span className="ico">{l.ico}</span>
              <span className="lbl">{l.label}</span>
            </NavLink>
          ))}
          <div className="divider">Teacher kiosk</div>
          <a href="/request" target="_blank">
            <span className="ico">👩‍🏫</span>
            <span className="lbl">Open checkout page</span>
          </a>
        </nav>
        <div className="foot">
          <b>{user?.name}</b>
          <span className="muted">@{user?.username}</span>
          <button className="logout" onClick={async () => { await logout(); nav("/login"); }}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}