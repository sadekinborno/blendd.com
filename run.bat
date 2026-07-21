@echo off
title blendd Portal (NexusHub)
echo ===================================================
echo   Starting blendd Portal (NexusHub) Server...
echo   The browser will open automatically.
echo ===================================================
echo.

:: Change directory to the project folder
cd /d "e:\ARCANE Projects\TouchMe"

:: Automatically open the browser to the web app
start http://localhost:3000

:: Start the Node.js server
npm start

pause
