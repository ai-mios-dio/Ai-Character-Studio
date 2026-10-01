"""
My Tools - a small set of tools that runs on your own computer.

How it works:
  1. This program starts a tiny web server on your computer.
  2. Your browser opens http://localhost:5050, which shows the home page.
  3. Each tool lives in its own file:
       downloader.py - download a video or MP3 from a link
       clipper.py    - save a screenshot every few seconds of a video
"""

import threading
import webbrowser

from flask import Flask, render_template

from clipper import clipper
from downloader import downloader

app = Flask(__name__)
app.register_blueprint(downloader)
app.register_blueprint(clipper)

# Port 5000 is taken by AirPlay on Macs, so this uses 5050.
PORT = 5050


@app.route("/")
def home():
    return render_template("home.html")


if __name__ == "__main__":
    address = f"http://localhost:{PORT}"
    print(f"\nMy Tools is running at {address}")
    print("Keep this window open while you use it. Close it (or press Ctrl+C) to stop.\n")
    # Open the page in your browser a moment after the server starts.
    threading.Timer(1.5, lambda: webbrowser.open(address)).start()
    # 127.0.0.1 means only your own computer can reach this page.
    app.run(host="127.0.0.1", port=PORT)
