@echo off
title CYBERONE CSC Local Sync Server
echo Starting CYBERONE CSC local sync server...

:: Open browser immediately
start http://localhost:8080/

node "%~dp0server.js"
pause
