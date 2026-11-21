# Waits until the local Notes server is answering, then opens it in the
# default browser. Started hidden by scripts\start-notes.cmd.

param(
  [string]$Url = 'http://127.0.0.1:4173',
  [int]$TimeoutSeconds = 40
)

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)

while ((Get-Date) -lt $deadline) {
  $ready = $false
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "$Url/assets/app.js" -TimeoutSec 2
    $ready = ($response.StatusCode -eq 200)
  } catch {
    $ready = $false
  }

  if ($ready) {
    Start-Process $Url
    exit 0
  }

  Start-Sleep -Milliseconds 400
}

# Server never came up: leave the browser alone so the console error is visible.
exit 1
