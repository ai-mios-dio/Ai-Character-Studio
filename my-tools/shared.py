"""Small helpers that more than one tool uses."""

import os
import re
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg

# imageio-ffmpeg ships its own copy of ffmpeg, so you don't have to install it.
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

# This tiny program opens your computer's normal "choose a file/folder" window.
# It runs separately because the window must be opened by a program's main thread.
_PICKER = r"""
import sys, tkinter as tk
from tkinter import filedialog
root = tk.Tk()
root.withdraw()
root.attributes("-topmost", True)
if sys.argv[1] == "folder":
    path = filedialog.askdirectory(title="Choose where to save")
else:
    path = filedialog.askopenfilename(
        title="Choose a video",
        filetypes=[("Videos", "*.mp4 *.mov *.mkv *.avi *.webm *.m4v *.wmv *.flv"), ("All files", "*.*")],
    )
print(path or "")
"""


def pick_path(kind):
    """Open a file ("video") or folder ("folder") picker. Returns "" if cancelled."""
    result = subprocess.run(
        [sys.executable, "-c", _PICKER, kind], capture_output=True, text=True, timeout=600
    )
    if result.returncode != 0:
        raise RuntimeError("Couldn't open the chooser window. Type or paste the path instead.")
    return result.stdout.strip()


def open_folder(path):
    """Show a folder in Explorer (Windows) or Finder (Mac)."""
    if sys.platform.startswith("win"):
        os.startfile(path)
    elif sys.platform == "darwin":
        subprocess.run(["open", path])
    else:
        subprocess.run(["xdg-open", path])


def video_info(path):
    """Ask ffmpeg how long a video is and how big its picture is."""
    result = subprocess.run(
        [FFMPEG, "-hide_banner", "-i", str(path)], capture_output=True, text=True, errors="replace"
    )
    text = result.stderr
    duration = re.search(r"Duration: (\d+):(\d+):(\d+(?:\.\d+)?)", text)
    size = re.search(r"Video:.*?(\d{2,5})x(\d{2,5})", text)
    if not duration or not size:
        raise ValueError("That file doesn't look like a video ffmpeg can read.")
    hours, minutes, seconds = duration.groups()
    return {
        "seconds": int(hours) * 3600 + int(minutes) * 60 + float(seconds),
        "width": int(size.group(1)),
        "height": int(size.group(2)),
    }
