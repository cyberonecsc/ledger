@echo off
title CYBERONE CSC Update Utility
echo Updating CYBERONE CSC Portal from GitHub...
cd /d "%~dp0"
git pull origin main
echo.
echo =======================================================
echo Update Complete! Please refresh your browser (Ctrl + F5).
echo =======================================================
pause
