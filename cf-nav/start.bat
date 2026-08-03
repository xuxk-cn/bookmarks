@echo off
chcp 65001 >nul
title cf-nav
cd /d "%~dp0"
if not exist ".wrangler\state" node scripts/init-local.js
echo 首页: http://localhost:8788
echo 后台: http://localhost:8788/admin  admin/admin123
npx wrangler pages dev public --compatibility-date=2024-09-23 --kv=NAV_KV
pause
