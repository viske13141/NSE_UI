@echo off
cd /d "%~dp0"
echo Open http://localhost:5000/nse-login after the server starts.
node server/index.js
pause
