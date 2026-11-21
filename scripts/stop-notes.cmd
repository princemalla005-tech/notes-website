@echo off
rem ---------------------------------------------------------------------------
rem  Notes - stop the local server (Windows)
rem
rem  Looks for the Node.js process listening on the Notes port and stops it.
rem  Other programs are never touched. Run this if the server was started at
rem  login and its console window is not easy to find.
rem ---------------------------------------------------------------------------
setlocal EnableExtensions
title Notes - stop local server

set "PORT=4173"
if defined NOTES_PORT set "PORT=%NOTES_PORT%"

echo.
echo   [Notes] Stopping the local server on port %PORT% ...
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$port = %PORT%; $pids = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique); if ($pids.Count -eq 0) { Write-Host '  [Notes] Nothing is listening on that port.'; exit 2 }; $stopped = 0; foreach ($procId in $pids) { $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue; if ($proc -and $proc.ProcessName -eq 'node') { Stop-Process -Id $procId -Force; $stopped++ } }; if ($stopped -eq 0) { Write-Host '  [Notes] That port is used by a program that is not Node.js; nothing was stopped.'; exit 3 }; Write-Host ('  [Notes] Stopped ' + $stopped + ' Node.js process(es).'); exit 0"
set "CODE=%ERRORLEVEL%"

echo.
if not "%CODE%"=="0" echo   [Notes] The Notes server was not stopped.
ping -n 4 127.0.0.1 >nul
exit /b %CODE%
