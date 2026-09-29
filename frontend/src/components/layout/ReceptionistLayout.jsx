import { NavLink, Outlet, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

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
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? "active" : "")}>
              <span className="ico">{l.ico}</span>
              {l.label}
            </NavLink>
          ))}
          <div className="divider">Teacher kiosk</div>
          <a href="/request" target="_blank">
            <span className="ico">👩‍🏫</span>
            Open checkout page
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