$ExtensionId = Read-Host "Please enter your Chrome Extension ID (from chrome://extensions)"

if ($ExtensionId -match '^[a-z]{32}$') {
    $JsonPath = "$PSScriptRoot\com.bacham.host.json"
    $JsonContent = Get-Content $JsonPath | ConvertFrom-Json
    $JsonContent.allowed_origins = @("chrome-extension://$ExtensionId/")
    
    # We must format nicely
    $NewJson = @"
{
  "name": "com.bacham.host",
  "description": "BACHAM Desktop Application Native Messaging Host",
  "path": "C:\\Users\\harsh\\OneDrive\\Desktop\\Meeting\\apps\\desktop\\src-tauri\\target\\host-bin\\appsdesktop-host.exe",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$ExtensionId/"
  ]
}
"@
    Set-Content $JsonPath $NewJson
    Write-Host "Updated $JsonPath with extension ID: $ExtensionId"
    Write-Host "Please reload the extension in Chrome."
} else {
    Write-Host "Invalid extension ID. Must be 32 lowercase letters."
}
