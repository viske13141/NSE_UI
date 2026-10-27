@echo off
cd /d "%~dp0"
call npm.cmd ci --prefix server
pause
