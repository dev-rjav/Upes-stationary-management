@echo off
REM Starts the Flask backend and Vite frontend in separate windows.
setlocal

set ROOT=%~dp0

start "Backend - Flask" cmd /k "cd /d "%ROOT%backend" && set FLASK_APP=run.py && set FLASK_ENV=development && set SEED_DEMO=0 && python run.py"
start "Frontend - Vite" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

echo.
echo Both servers starting in separate windows.
echo Backend : http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo On first run, items and clusters are seeded automatically.
