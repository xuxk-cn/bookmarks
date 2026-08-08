@echo off
chcp 65001 >nul
title cf-nav
cd /d "%~dp0"
if not exist ".wrangler\state" node scripts/init-local.js
echo 首页: http://localhost:8788
echo 后台: http://localhost:8788/admin  admin/admin123
echo 服务异常退出后将自动重启，按 Ctrl+C 手动停止

:loop
npx wrangler pages dev public --compatibility-date=2024-09-23 --kv=NAV_KV
echo.
echo [%time%] 服务已退出，3秒后自动重启...
timeout /t 3 >nul
goto loop
