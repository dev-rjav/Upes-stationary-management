@echo off
REM ===========================================================================
REM  Build the deployable server bundle. Run this ONCE on a DEV machine that has
REM  Node.js and Python installed. Produces backend\dist\StationeryServer\.
REM  Copy that folder to the receptionist laptop (which needs NOTHING installed).
REM ===========================================================================
setlocal
set ROOT=%~dp0..
echo.
echo [1/4] Building frontend (Vite production build)...
pushd "%ROOT%\frontend"
call npm install || goto :fail
call npm run build || goto :fail
popd

echo.
echo [2/4] Installing backend build deps...
pushd "%ROOT%\backend"
python -m pip install -r requirements.txt || goto :fail
python -m pip install pyinstaller || goto :fail

echo.
echo [3/4] Running backend tests (abort build if anything fails)...
python -m pytest tests\ -q -p no:warnings || goto :fail

echo.
echo [4/4] Packaging self-contained server with PyInstaller...
pyinstaller "..\deploy\StationeryServer.spec" --noconfirm --clean || goto :fail
popd

echo.
echo ===========================================================================
echo  DONE. Deployable bundle: backend\dist\StationeryServer\
echo  Next: copy it to the laptop and run deploy\install-service.bat as Admin.
echo ===========================================================================
exit /b 0

:fail
echo.
echo BUILD FAILED. See the error above.
exit /b 1
