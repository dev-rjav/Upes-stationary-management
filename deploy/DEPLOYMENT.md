# Deployment Plan — Stationery Management System (LAN, always-on)

Run the whole system from the **receptionist's Windows laptop** and serve it to
everyone on the local network. The laptop needs **nothing installed** — not even
Python. The server auto-starts at boot, keeps running with the lid closed,
survives power cuts, and restarts itself if it ever stops.

---

## 1. How it works (the efficient design)

- **One process, one port.** The React app is pre-built to static files and
  served **same-origin** by the Python backend (via the production-grade
  **Waitress** WSGI server). Because the frontend calls the API with a relative
  `/api` path, every LAN client "just works" — no per-client config, no CORS,
  and session cookies behave correctly.
- **No Python on the laptop.** On a dev machine we package the backend +
  bundled frontend into a **self-contained Windows folder** with PyInstaller.
  You copy that folder to the laptop and run it. That's it.
- **Always-on.** It's installed as a **Windows Service** (via NSSM) set to
  *auto-start at boot* (before anyone logs in) and *auto-restart on exit*. The
  database lives in a **separate, stable folder** so restarts and app updates
  never lose data.

```
   LAN clients (phones / PCs)            Receptionist laptop
   http://<laptop-ip>:8080   ───────▶   Windows Service "StationeryServer"
                                           └─ Waitress  ─┬─  /api/*   (Flask backend)
                                                         └─  /*       (React SPA)
                                           Data: C:\StationeryApp\data\stationary.db
```

---

## 2. One-time build (on a DEV machine with Node + Python)

Everything is scripted. From the project root:

```
deploy\build.bat
```

This: builds the frontend, installs backend deps, **runs the test suite**
(aborts if anything fails), and packages the server with PyInstaller. Output:

```
backend\dist\StationeryServer\        <-- copy this whole folder to the laptop
```

> Build it on a machine with the **same Windows architecture (64-bit)** as the
> laptop. The resulting folder is portable; the laptop needs no Python/Node.

---

## 3. One-time install (on the RECEPTIONIST LAPTOP)

1. Create a working folder, e.g. `C:\Install\`, and put these in it:
   - `StationeryServer\`  (the folder from step 2)
   - `install-service.bat`, `uninstall-service.bat`, `set-service-env.ps1`  (from `deploy\`)
   - `nssm.exe`  (download the 64-bit build from <https://nssm.cc/download>)
2. **Right-click `install-service.bat` → Run as administrator.**
3. When prompted, **type the ADMIN and GUEST passwords** (hidden input, entered
   twice to confirm). These become the receptionist logins.

It performs all of the following automatically:

| Step | What it does | Covers your requirement |
|------|--------------|--------------------------|
| Copy app to `C:\StationeryApp\app` | keeps data separate for safe updates | — |
| `powercfg` never-sleep + **lid close = Do nothing** | laptop keeps serving with the lid shut | *run when lid closed* |
| Firewall rule for TCP 8080 (private/domain) | lets LAN clients connect | *served to all users* |
| NSSM service, **auto-start at boot**, **auto-restart on exit** | starts without login, resumes after stop/crash/power-cut | *auto-start on startup; resume on stoppage* |
| **Prompts for ADMIN/GUEST passwords** + generates a `SECRET_KEY` | you set real credentials at install; logins survive restarts | — |

At the end it prints the **URL to hand out** (e.g. `http://192.168.1.50:8080`).
Staff log in as `invinder_kaur` / `guest` with the passwords you entered.

> **Reinstalling over an existing database?** The installer detects it and asks
> whether to update the existing accounts to the new passwords (data is kept
> either way).

---

## 4. Make the address stable (do this once)

DHCP can change the laptop's IP, which would change the URL. Pick one:

- **Best — DHCP reservation:** in the Wi-Fi router, bind the laptop's MAC
  address to a fixed IP (e.g. `192.168.1.50`). URL stays constant forever.
- **Or static IP** on the laptop's adapter.
- **Prefer wired Ethernet** if possible — more stable than Wi-Fi, and Wi-Fi can
  drop when the lid is closed on some laptops.
- *(Optional)* Serve on **port 80** so the URL is just `http://<ip>` (no
  `:8080`). Change `PORT` in `install-service.bat` to `80` and reinstall; make
  sure nothing else uses port 80.

Then print a small card / QR for staff pointing at the URL (the app already has
a **QR display** page at `/receptionist` → "Show QR code").

---

## 5. Why each requirement is met

- **Auto-start on computer startup** — Windows Service with
  `Start = SERVICE_AUTO_START` launches at boot, before any user logs in.
- **Resume on stoppage / crash** — NSSM `AppExit Default Restart` relaunches the
  process automatically (with a 5s throttle to avoid crash loops).
- **Power cut** — a laptop rides short outages on its **battery**; power settings
  keep it awake. On a full reboot, the service auto-starts. *(Optional: in BIOS,
  set "Restore on AC Power Loss = Power On" so it boots itself when mains
  returns.)*
- **Lost internet connectivity** — the app is **LAN-only and needs no internet**.
  Losing the WAN/uplink does not affect serving on the local network. (Keep the
  laptop on the LAN; internet is irrelevant to the app.)
- **Runs with the lid closed** — `powercfg` sets lid-close action to *Do nothing*
  on both AC and battery, and disables sleep/hibernate.
- **Served statically to all users** — Waitress binds `0.0.0.0:8080`; the
  firewall rule admits LAN clients; the SPA + API share one origin.
- **No requirements on the laptop (no Python)** — the PyInstaller bundle ships
  its own Python runtime and all libraries.

---

## 6. Day-to-day operations

- **Check status / logs:** Services app (`services.msc`) → *Stationery Management
  Server*. Logs: `C:\StationeryApp\logs\out.log` and `err.log` (auto-rotated).
- **Restart manually:** `nssm restart StationeryServer` (admin), or via
  `services.msc`.
- **Backups:** `deploy\backup-db.bat` copies the SQLite DB and keeps the last 30.
  Schedule it daily:
  ```
  schtasks /create /tn "StationeryBackup" /tr "C:\StationeryApp\app\backup-db.bat" /sc daily /st 20:00 /ru SYSTEM
  ```
  (Copy `backup-db.bat` into `C:\StationeryApp\app\` first, or adjust the path.)
- **Update to a new version:** rebuild on the dev machine, copy the new
  `StationeryServer\` over `C:\StationeryApp\app` (stop the service first), start
  the service. **The database in `C:\StationeryApp\data` is untouched.**
  ```
  nssm stop StationeryServer
  robocopy <new>\StationeryServer C:\StationeryApp\app /MIR
  nssm start StationeryServer
  ```
- **Uninstall:** run `uninstall-service.bat` as admin (keeps the database).

---

## 7. Security & credentials

- **Passwords are set during install.** `install-service.bat` prompts for the
  ADMIN and GUEST passwords (hidden, confirmed) and writes them to the service
  environment, so you never hardcode credentials. On first run the accounts
  `invinder_kaur` and `guest` are seeded with exactly those passwords.
- **Changing passwords later:** re-run `install-service.bat`; it detects the
  existing database and asks whether to update the accounts to the new
  passwords (it sets `RESET_PASSWORDS=1` for that run). Your data is preserved.
- The app runs over **plain HTTP on the LAN** — fine for an internal reception
  network. Do **not** port-forward it to the internet. If external access is
  ever needed, put it behind a VPN or a reverse proxy with TLS.
- `SEED_DEMO=0` (set by the installer) keeps demo/sample data out of production.

---

## 8. Runtime configuration reference

The server reads these environment variables (the installer sets the first four):

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `8080` | LAN port to listen on |
| `STATIONERY_DATA_DIR` | `C:\StationeryApp\data` | folder holding `stationary.db` |
| `SECRET_KEY` | *(random, fixed at install)* | Flask session signing key |
| `SEED_DEMO` | `0` in prod | `1` seeds demo data (dev only) |
| `ADMIN_PASSWORD` / `GUEST_PASSWORD` | *(prompted at install)* | passwords for the two seeded accounts |
| `RESET_PASSWORDS` | `0` | `1` updates existing accounts' passwords on boot |

Files in this `deploy/` folder: `build.bat`, `StationeryServer.spec`,
`install-service.bat`, `set-service-env.ps1`, `uninstall-service.bat`, `backup-db.bat`.

---

## 9. Quick verification after install

From **another device** on the same network, open `http://<laptop-ip>:8080` —
you should see the login page. Then:

- Close the laptop lid → the page still loads from the other device.
- Reboot the laptop (don't log in) → within ~30s the page loads again
  (service auto-started).
- `nssm stop StationeryServer` then wait → NSSM restarts it automatically.

If a check fails, see `C:\StationeryApp\logs\err.log`.
