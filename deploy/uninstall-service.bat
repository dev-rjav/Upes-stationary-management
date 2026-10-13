@echo off
REM Removes the Windows service and firewall rule. Leaves C:\StationeryApp\data
REM (the database) intact. Run as Administrator.
setlocal
set NSSM=%~dp0nssm.exe
set SVC=StationeryServer
net session >nul 2>&1 || (echo Please run this as Administrator. & exit /b 1)
"%NSSM%" stop %SVC%
"%NSSM%" remove %SVC% confirm
netsh advfirewall firewall delete rule name="Stationery LAN" >nul 2>&1
echo Service removed. Database preserved at C:\StationeryApp\data.
endlocal
