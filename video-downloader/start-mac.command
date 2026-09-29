#!/bin/bash
# Double-click this file to start the Video Downloader on a Mac.
cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
    echo "Python isn't installed yet. Get it from https://www.python.org/downloads/ and try again."
    read -r -p "Press Enter to close."
    exit 1
fi

if [ ! -d venv ]; then
    echo "First run: setting things up. This takes a minute..."
    python3 -m venv venv || { read -r -p "Setup failed. Press Enter to close."; exit 1; }
fi

echo "Checking for updates..."
venv/bin/python -m pip install --quiet --disable-pip-version-check --upgrade -r requirements.txt
venv/bin/python app.py
