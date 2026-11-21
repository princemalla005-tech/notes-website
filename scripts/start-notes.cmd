@echo off
rem ---------------------------------------------------------------------------
rem  Notes - one-click local server launcher (Windows)
rem
rem  Double-click this file (or the Desktop "Notes" shortcut) to start the
rem  local Express + SQLite server in a visible console window and open the
rem  app in your default browser.
rem
rem  Usage:
rem    start-notes.cmd                 start server + open browser
rem    start-notes.cmd --no-browser    start server only (used at login)
rem ---------------------------------------------------------------------------
setlocal EnableExtensions EnableDelayedExpansion
title Notes - local server

set "SCRIPT_DIR=%~dp0"
set "ROOT=%SCRIPT_DIR%.."

if not exist "%ROOT%\server\server.js" goto :no_server

pushd "%ROOT%" 2>nul
if errorlevel 1 goto :no_server

where node >nul 2>nul
if errorlevel 1 goto :no_node

set "PORT=4173"
if defined NOTES_PORT set "PORT=!NOTES_PORT!"
set "URL=http://127.0.0.1:!PORT!"

call :is_running
if not errorlevel 1 goto :already_running

rem Open the browser only after the server really answers.
if /i "%~1"=="--no-browser" goto :run
start "" powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%SCRIPT_DIR%wait-and-open.ps1" -Url "!URL!"

:run
:run
echo Starting Notes server in background...

powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "$node=(Get-Command node -ErrorAction Stop).Source; Start-Process -FilePath $node -ArgumentList 'server\server.js' -WorkingDirectory '%ROOT%' -WindowStyle Hidden"

popd
exit /b 0
:no_node
echo.
echo   [Notes] Node.js was not found on PATH.
echo           Install Node.js 22.5 or newer from https://nodejs.org
echo           then double-click this file again.
echo.
pause
popd
exit /b 1

:no_server
echo.
echo   [Notes] server\server.js was not found next to this script.
echo           Keep the scripts folder inside the Notes project.
echo.
pause
popd
exit /b 1

:is_running
rem Only treat the port as "ours" if the Notes assets are being served.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; try { $r = Invoke-WebRequest -UseBasicParsing -Uri '!URL!/assets/app.js' -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
exit /b %ERRORLEVEL%
