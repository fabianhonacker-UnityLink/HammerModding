@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo [INFO] Installiere Backend-Abhaengigkeiten...
  npm install
)
node app.js
pause
