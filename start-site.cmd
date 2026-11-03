@echo off
setlocal
cd /d "%~dp0"
echo.
echo  ============================================
echo   WAR ARCHIVE / 全球战争档案
echo   1931 - 1945
echo  ============================================
echo.
echo  Starting local server at http://127.0.0.1:8788/
echo  Press Ctrl+C to stop.
echo.
start "" "http://127.0.0.1:8788/"
python -m http.server 8788 --bind 127.0.0.1
if errorlevel 1 (
  echo.
  echo Python was not found. Opening index.html directly...
  start "" "%~dp0index.html"
  pause
)
endlocal
