import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(username.trim(), password);
      nav("/receptionist/dashboard");
    } catch (ex) {
      setErr(ex.response?.data?.error || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <div className="logo">🖇️</div>
        <h1>Reception Desk</h1>
        <p className="sub">UPES Stationery Management</p>
        <form onSubmit={submit}>
          <label className="fld">
            <span>Username</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" />
          </label>
          <label className="fld">
            <span>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          {err && <div className="err">{err}</div>}
          <button className="btn primary" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="hint">
          Demo credentials: <b>demo</b> / <b>demo123</b>
          <br />
          Teachers use the QR kiosk page — no login for them.
        </div>
      </div>
    </div>
  );
}