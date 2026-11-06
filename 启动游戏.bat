@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 正在启动 FoundPhone-Studio...

start "FoundPhone-Studio" cmd /k "cd /d ""%~dp0"" && npm.cmd run dev -- --host 127.0.0.1 --strictPort"

echo 正在等待网页启动...

powershell -NoProfile -Command "$end=(Get-Date).AddSeconds(30); do { try { $r=Invoke-WebRequest 'http://127.0.0.1:5173' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { Start-Process 'http://127.0.0.1:5173'; exit 0 } } catch {}; Start-Sleep -Milliseconds 500 } while ((Get-Date) -lt $end); Write-Host '启动超时，请检查终端报错'; pause"