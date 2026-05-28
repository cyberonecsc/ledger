@echo off
title CYBERONE CSC Local Server
echo Starting CYBERONE CSC local web server...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_server.ps1"
pause
