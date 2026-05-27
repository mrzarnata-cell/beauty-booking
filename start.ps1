$logFile = "C:\Users\dell\Desktop\beauty-booking\server.log"
Set-Location "C:\Users\dell\Desktop\beauty-booking"
$env:NODE_ENV="production"
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "server.js" -RedirectStandardOutput $logFile -RedirectStandardError $logFile
Write-Output "Server started. PID: $(Get-Process -Name node | Select-Object -Last 1 -ExpandProperty Id)"
