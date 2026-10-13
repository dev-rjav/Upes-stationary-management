# Prompts for the receptionist account passwords (masked) and writes the full
# service environment via NSSM. Called by install-service.bat. Kept in
# PowerShell so passwords with spaces/special characters pass through intact.
param(
  [Parameter(Mandatory = $true)][string]$Nssm,
  [Parameter(Mandatory = $true)][string]$Svc,
  [Parameter(Mandatory = $true)][int]$Port,
  [Parameter(Mandatory = $true)][string]$DataDir
)

function Read-Password([string]$label) {
  while ($true) {
    $s1 = Read-Host "$label" -AsSecureString
    $p1 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s1))
    if ([string]::IsNullOrWhiteSpace($p1)) { Write-Host '  Password cannot be empty.' -ForegroundColor Yellow; continue }
    $s2 = Read-Host "Confirm $label" -AsSecureString
    $p2 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s2))
    if ($p1 -ne $p2) { Write-Host '  Passwords do not match — try again.' -ForegroundColor Yellow; continue }
    return $p1
  }
}

Write-Host ''
Write-Host 'Set the receptionist login passwords (input is hidden):' -ForegroundColor Cyan
$adminPw = Read-Password 'ADMIN password  (user: invinder_kaur)'
$guestPw = Read-Password 'GUEST password  (user: guest)'

# Fresh random session key so logins are signed consistently.
$secret = -join ((1..48) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })

# If a database already exists, seeding won't re-run — offer to update in place.
$reset = '0'
$dbPath = Join-Path $DataDir 'stationary.db'
if (Test-Path $dbPath) {
  Write-Host ''
  Write-Host "An existing database was found at $dbPath." -ForegroundColor Yellow
  $ans = Read-Host 'Update the existing accounts to the passwords you just entered? (Y/N)'
  if ($ans -match '^(y|yes)$') { $reset = '1' }
}

$extra = @(
  "PORT=$Port",
  "STATIONERY_DATA_DIR=$DataDir",
  "SEED_DEMO=0",
  "SECRET_KEY=$secret",
  "ADMIN_PASSWORD=$adminPw",
  "GUEST_PASSWORD=$guestPw",
  "RESET_PASSWORDS=$reset"
)
& $Nssm set $Svc AppEnvironmentExtra @extra | Out-Null
Write-Host 'Service environment configured.' -ForegroundColor Green
