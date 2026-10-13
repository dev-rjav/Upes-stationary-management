@echo off
REM ===========================================================================
REM  Install the Stationery server on the RECEPTIONIST LAPTOP.
REM  Run as Administrator (right-click > Run as administrator).
REM
REM  It will:
REM    1. Copy the app bundle to C:\StationeryApp\app
REM    2. Configure power: never sleep, do nothing on lid close (runs lid-closed)
REM    3. Open the Windows Firewall for the LAN port
REM    4. Install a Windows service (auto-start at boot, auto-restart on crash)
REM
REM  Place this file next to the StationeryServer bundle folder and nssm.exe:
REM     <somewhere>\
REM        install-service.bat
REM        nssm.exe                 (download from https://nssm.cc)
REM        StationeryServer\        (the folder produced by build.bat)
REM ===========================================================================
setlocal
set SRC=%~dp0StationeryServer
set APPDIR=C:\StationeryApp\app
set DATADIR=C:\StationeryApp\data
set LOGDIR=C:\StationeryApp\logs
set NSSM=%~dp0nssm.exe
set SVC=StationeryServer
set PORT=8080

REM ---- Admin check -----------------------------------------------------------
net session >nul 2>&1 || (echo Please run this as Administrator. & exit /b 1)

REM ---- 1. Copy app bundle (data dir is kept separate so updates are safe) -----
echo [1/5] Installing app to %APPDIR% ...
if not exist "%SRC%\StationeryServer.exe" (echo Bundle not found at %SRC% & exit /b 1)
mkdir "%APPDIR%" 2>nul
mkdir "%DATADIR%" 2>nul
mkdir "%LOGDIR%" 2>nul
robocopy "%SRC%" "%APPDIR%" /MIR /NFL /NDL /NJH /NJS >nul

REM ---- 2. Power settings: stay awake, keep running with the lid closed -------
echo [2/5] Configuring power (no sleep, lid-close = do nothing) ...
powercfg /change standby-timeout-ac 0
powercfg /change standby-timeout-dc 0
powercfg /change hibernate-timeout-ac 0
powercfg /change hibernate-timeout-dc 0
REM SUB_BUTTONS \ Lid close action, 0 = Do nothing (AC and battery)
powercfg /setacvalueindex SCHEME_CURRENT 4f971e89-eebd-4455-a8de-9e59040e7347 5ca83367-6e45-459f-a27b-476b1d01c936 0
powercfg /setdcvalueindex SCHEME_CURRENT 4f971e89-eebd-4455-a8de-9e59040e7347 5ca83367-6e45-459f-a27b-476b1d01c936 0
powercfg /setactive SCHEME_CURRENT

REM ---- 3. Firewall: allow inbound LAN traffic on the port -------------------
echo [3/5] Opening firewall for TCP %PORT% ...
netsh advfirewall firewall delete rule name="Stationery LAN" >nul 2>&1
netsh advfirewall firewall add rule name="Stationery LAN" dir=in action=allow protocol=TCP localport=%PORT% profile=private,domain >nul

REM ---- 4. Generate a stable session key (so logins survive restarts) --------
for /f %%K in ('powershell -NoProfile -Command "[guid]::NewGuid().ToString(\"N\") + [guid]::NewGuid().ToString(\"N\")"') do set SKEY=%%K

REM ---- 5. Install + start the service via NSSM ------------------------------
echo [4/5] Installing Windows service "%SVC%" ...
if not exist "%NSSM%" (echo nssm.exe not found next to this script. Download from https://nssm.cc & exit /b 1)
"%NSSM%" stop %SVC% >nul 2>&1
"%NSSM%" remove %SVC% confirm >nul 2>&1
"%NSSM%" install %SVC% "%APPDIR%\StationeryServer.exe"
"%NSSM%" set %SVC% AppDirectory "%APPDIR%"
"%NSSM%" set %SVC% AppEnvironmentExtra PORT=%PORT% STATIONERY_DATA_DIR=%DATADIR% SEED_DEMO=0 SECRET_KEY=%SKEY%
"%NSSM%" set %SVC% Start SERVICE_AUTO_START
"%NSSM%" set %SVC% AppStdout "%LOGDIR%\out.log"
"%NSSM%" set %SVC% AppStderr "%LOGDIR%\err.log"
"%NSSM%" set %SVC% AppRotateFiles 1
"%NSSM%" set %SVC% AppRotateBytes 5000000
"%NSSM%" set %SVC% AppExit Default Restart
"%NSSM%" set %SVC% AppThrottle 5000
"%NSSM%" set %SVC% DisplayName "Stationery Management Server"

echo [5/5] Starting service ...
"%NSSM%" start %SVC%

REM ---- Show the URL to hand out to staff ------------------------------------
echo.
echo ===========================================================================
echo  Service installed and started.
echo  Staff open this URL on the LAN:
for /f "tokens=2 delims=:" %%I in ('ipconfig ^| findstr /c:"IPv4"') do echo        http://%%I:%PORT%  (trim spaces)
echo  First-run logins: invinder_kaur / admin123  and  guest / guest123
echo  CHANGE THESE: set ADMIN_PASSWORD / GUEST_PASSWORD before first run,
echo  or delete %DATADIR%\stationary.db and reinstall with those env vars set.
echo ===========================================================================
endlocal
exit /b 0
