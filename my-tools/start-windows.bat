@echo off
rem Double-click this file to start My Tools on Windows.
cd /d "%~dp0"

set PY=python
where py >nul 2>nul && set PY=py

if not exist venv (
    echo First run: setting things up. This takes a minute...
    %PY% -m venv venv
    if errorlevel 1 goto nopython
)

echo Checking for updates...
venv\Scripts\python -m pip install --quiet --disable-pip-version-check --upgrade -r requirements.txt
venv\Scripts\python app.py
pause
exit /b

:nopython
echo.
echo Python isn't installed yet. Get it from https://www.python.org/downloads/
echo During install, tick the box "Add python.exe to PATH". Then try again.
pause
