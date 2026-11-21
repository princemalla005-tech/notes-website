# Creates (or removes) the Windows shortcuts used by the Notes auto-start:
#
#   Desktop  \ Notes.lnk          -> start-notes.cmd        (server + browser)
#   Startup  \ Notes Server.lnk   -> start-notes-server.cmd (server at login)
#
# Run it again after moving the project to another folder, so the shortcuts
# point at the new location:
#
#   powershell -ExecutionPolicy Bypass -File scripts\install-shortcuts.ps1
#
# To turn auto-start off:
#
#   powershell -ExecutionPolicy Bypass -File scripts\install-shortcuts.ps1 -Remove

param(
  [switch]$Remove
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$icon = Join-Path $root 'assets\icon.ico'
$shell = New-Object -ComObject WScript.Shell

$shortcuts = @(
  @{
    Path        = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Notes.lnk'
    Script      = Join-Path $root 'scripts\start-notes.cmd'
    Description = 'Start the local Notes server and open it in your browser'
  },
  @{
    Path        = Join-Path ([Environment]::GetFolderPath('Startup')) 'Notes Server.lnk'
    Script      = Join-Path $root 'scripts\start-notes-server.cmd'
    Description = 'Start the Notes local server at Windows login'
  }
)

foreach ($item in $shortcuts) {
  if ($Remove) {
    if (Test-Path -LiteralPath $item.Path) {
      Remove-Item -LiteralPath $item.Path -Force
      Write-Host ("Removed: " + $item.Path)
    } else {
      Write-Host ("Not found: " + $item.Path)
    }
    continue
  }

  if (-not (Test-Path -LiteralPath $item.Script)) {
    throw "Missing launcher: $($item.Script). Keep this script inside the Notes project."
  }

  $shortcut = $shell.CreateShortcut($item.Path)
  $shortcut.TargetPath = $item.Script
  $shortcut.WorkingDirectory = $root
  $shortcut.IconLocation = "$icon,0"
  $shortcut.Description = $item.Description
  $shortcut.WindowStyle = 1
  $shortcut.Save()
  Write-Host ("Created: " + $item.Path)
}

Write-Host ''
if ($Remove) {
  Write-Host 'Notes will no longer start automatically at login.'
} else {
  Write-Host 'Done. Double-click the Desktop "Notes" shortcut, or sign out and back in to test auto-start.'
}
