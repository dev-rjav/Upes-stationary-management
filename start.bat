@echo off
setlocal EnableDelayedExpansion
set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "VENV=%BACKEND%\venv"
set "ENV_FILE=%BACKEND%\.env"

echo.
echo  Stationery Management System
echo  ==============================

REM ── 1. Python virtual environment ───────────────────────────────────────────
if not exist "%VENV%\Scripts\python.exe" (
    echo.
    echo [1/3] Creating Python virtual environment...
    python -m venv "%VENV%"
    if errorlevel 1 goto :fail
)

REM ── 2. Python packages ──────────────────────────────────────────────────────
if not exist "%VENV%\Lib\site-packages\flask" (
    echo [2/3] Installing Python packages ^(first run only^)...
    "%VENV%\Scripts\pip" install --quiet -r "%BACKEND%\requirements.txt"
    if errorlevel 1 goto :fail
) else (
    echo [2/3] Python packages OK.
)

REM ── 3. Node packages ────────────────────────────────────────────────────────
if not exist "%FRONTEND%\node_modules\vite" (
    echo [3/3] Installing Node packages ^(first run only^)...
    pushd "%FRONTEND%"
    call npm install
    if errorlevel 1 ( popd & goto :fail )
    popd
) else (
    echo [3/3] Node packages OK.
)

REM ── Create backend\.env with defaults on very first run ─────────────────────
if not exist "%ENV_FILE%" (
    for /f %%i in ('powershell -NoProfile -Command "([guid]::NewGuid()).Guid.Replace(\"-\",\"\")+([guid]::NewGuid()).Guid.Replace(\"-\",\"\")"') do set "_SK=%%i"
    (
        echo SECRET_KEY=!_SK!
        echo ADMIN_PASSWORD=admin123
        echo GUEST_PASSWORD=guest123
        echo SEED_DEMO=0
    ) > "%ENV_FILE%"
    echo.
    echo  Config written to backend\.env
    echo  -----------------------------------------------
    echo  Admin login : invinder_kaur / admin123
    echo  Guest login : guest        / guest123
    echo.
    echo  Edit backend\.env to change passwords, then add
    echo  RESET_PASSWORDS=1 and restart once to apply.
    echo  -----------------------------------------------
)

REM ── Start both servers ───────────────────────────────────────────────────────
echo.
echo  Starting servers...
echo.
start "Stationery - Backend" cmd /k "cd /d "%BACKEND%" && "%VENV%\Scripts\python" run.py"
start "Stationery - Frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev"

echo  Backend  : http://localhost:5000
echo  Frontend : http://localhost:3000
echo.
echo  Open http://localhost:3000 in a browser.
echo.
exit /b 0

:fail
echo.
echo  Setup failed. See the error above.
pause
exit /b 1
