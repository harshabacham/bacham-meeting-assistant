param (
    [Parameter(Mandatory=$true, HelpMessage="The Chrome Extension ID (e.g., abcdefghijklmnopqrstuvwxyzabcdef)")]
    [string]$ExtensionId
)

$ErrorActionPreference = "Stop"

$AppName = "com.bacham.host"
$ProjectRoot = Resolve-Path "$PSScriptRoot\..\.."
$SourceExe = "$ProjectRoot\desktop\src-tauri\target\debug\appsdesktop.exe"
$HostDir = "$ProjectRoot\desktop\src-tauri\target\host-bin"
$HostExe = "$HostDir\appsdesktop-host.exe"

# Ensure host-bin directory exists
if (!(Test-Path $HostDir)) {
    New-Item -ItemType Directory -Path $HostDir -Force | Out-Null
}

# Copy the executable to a separate file to avoid build locks
if (Test-Path $SourceExe) {
    # If the process is currently running, try to kill it first to unlock the copy destination
    Stop-Process -Name appsdesktop-host -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Copy-Item -Path $SourceExe -Destination $HostExe -Force
    Write-Host "Copied executable to native-host bin: $HostExe" -ForegroundColor Green
} else {
    Write-Host "Warning: $SourceExe not found. Please compile the application first!" -ForegroundColor Yellow
}

# 1. Create the Manifest JSON
$ManifestPath = "$PSScriptRoot\$AppName.json"

$ManifestContent = @"
{
  "name": "$AppName",
  "description": "BACHAM Desktop Application Native Messaging Host",
  "path": "$($HostExe.Replace('\', '\\'))",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$ExtensionId/"
  ]
}
"@

Set-Content -Path $ManifestPath -Value $ManifestContent -Encoding UTF8
Write-Host "Created Native Messaging manifest at: $ManifestPath" -ForegroundColor Green

# 2. Add the Registry Key for Chrome
$RegistryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$AppName"

if (!(Test-Path $RegistryPath)) {
    New-Item -Path $RegistryPath -Force | Out-Null
}

Set-ItemProperty -Path $RegistryPath -Name "(default)" -Value $ManifestPath
Write-Host "Added Registry Key: HKCU\Software\Google\Chrome\NativeMessagingHosts\$AppName -> $ManifestPath" -ForegroundColor Green

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "SUCCESS! The Native Messaging Host is registered." -ForegroundColor Green
Write-Host "Make sure you have compiled the Rust binary by running:" -ForegroundColor Yellow
Write-Host "  cd apps/desktop"
Write-Host "  pnpm tauri build --debug"
Write-Host "Note: You MUST install Visual Studio C++ Build Tools first!" -ForegroundColor Red
Write-Host "===========================================================" -ForegroundColor Cyan
