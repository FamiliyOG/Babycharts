@echo off
title BabyCharts Local Development
echo Starting BabyCharts Local Development Environment...
echo Waiting for servers to initialize...
echo.

:: Give servers 2-3 seconds to bind to port before launching browser
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:5173"

npm run dev:full

