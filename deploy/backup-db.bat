@echo off
REM Daily SQLite backup. Register with Task Scheduler to run once a day:
REM   schtasks /create /tn "StationeryBackup" /tr "C:\StationeryApp\app\backup-db.bat" ^
REM            /sc daily /st 20:00 /ru SYSTEM
setlocal
set DATADIR=C:\StationeryApp\data
set BACKUPDIR=C:\StationeryApp\backups
mkdir "%BACKUPDIR%" 2>nul
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set DT=%%I
set STAMP=%DT:~0,8%_%DT:~8,6%
copy /y "%DATADIR%\stationary.db" "%BACKUPDIR%\stationary_%STAMP%.db" >nul
REM keep only the 30 most recent backups
for /f "skip=30 delims=" %%F in ('dir /b /o-d "%BACKUPDIR%\stationary_*.db"') do del "%BACKUPDIR%\%%F"
echo Backed up to %BACKUPDIR%\stationary_%STAMP%.db
endlocal
