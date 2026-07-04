# GoDriving.xyz deployment script
# Builds the React app, publishes to the IIS site root, and (re)starts the API service.

$ErrorActionPreference = 'Stop'
$repo = 'C:\inetpub\repos\godriving.xyz'
$wwwroot = 'C:\inetpub\wwwroot\godriving.xyz'
$nssm = 'C:\inetpub\tools\nssm.exe'
$service = 'godriving-api'

Write-Host 'Building GoDriving.xyz...' -ForegroundColor Cyan
Set-Location $repo
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host 'Build failed!' -ForegroundColor Red; exit 1 }

Write-Host 'Publishing to wwwroot...' -ForegroundColor Cyan
Get-ChildItem -Path $wwwroot -Force | Where-Object { $_.Name -ne 'web.config' } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path $repo 'build\*') -Destination $wwwroot -Recurse -Force
Copy-Item -Path (Join-Path $repo 'web.config') -Destination (Join-Path $wwwroot 'web.config') -Force

Write-Host 'Restarting API service...' -ForegroundColor Cyan
& $nssm restart $service

Write-Host 'Restarting IIS site...' -ForegroundColor Cyan
Import-Module WebAdministration
Stop-Website -Name 'godriving.xyz' -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Start-Website -Name 'godriving.xyz'

Write-Host 'Deployment complete: https://godriving.xyz' -ForegroundColor Green
