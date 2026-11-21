@echo off
rem Starts the Notes local server without opening the browser.
rem Used by the "Notes Server" shortcut in the Windows Startup folder.

call "%~dp0start-notes.cmd" --no-browser %*
exit /b %ERRORLEVEL%
