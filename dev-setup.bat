@echo off
REM Dev setup — installs all dependencies for backend and frontend.
REM Run once after cloning. Then use run-dev.bat to start both servers.
setlocal

set ROOT=%~dp0

echo.
echo [1/2] Installing Python backend dependencies...
cd /d "%ROOT%backend"
python -m pip install -r requirements.txt || goto :fail

echo.
echo [2/2] Installing Node frontend dependencies...
cd /d "%ROOT%frontend"
call npm install || goto :fail

echo.
echo ============================================================
echo  Setup complete.
echo  Run  run-dev.bat  to start both servers.
echo  Backend : http://localhost:5000
echo  Frontend: http://localhost:3000
echo ============================================================
exit /b 0

:fail
echo.
echo SETUP FAILED. See error above.
exit /b 1
