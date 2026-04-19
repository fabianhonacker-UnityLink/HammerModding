@echo off
cd /d "%~dp0"
where python >nul 2>nul
if %errorlevel%==0 (
  start http://localhost:5500
  python -m http.server 5500
) else (
  start index.html
)
