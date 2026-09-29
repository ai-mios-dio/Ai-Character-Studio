"""
Video Downloader - a small web page you run on your own computer.

How it works:
  1. This program starts a tiny web server on your computer.
  2. Your browser opens http://localhost:5000, which shows the page.
  3. You paste a link and pick MP4 (video) or MP3 (audio).
  4. yt-dlp finds and downloads the video, ffmpeg converts it if needed,
     and the finished file is sent to your browser's Downloads folder.
"""

import shutil
import tempfile
import threading
import webbrowser
from pathlib import Path
from urllib.parse import quote

import imageio_ffmpeg
import yt_dlp
from flask import Flask, Response, jsonify, render_template, request

app = Flask(__name__)

# imageio-ffmpeg ships its own copy of ffmpeg, so you don't have to install it.
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

# Port 5000 is taken by AirPlay on Macs, so this uses 5050.
PORT = 5050


def build_options(choice, folder):
    """Settings for yt-dlp, depending on whether you want video or audio."""
    options = {
        # Save into a temporary folder, named after the video's title.
        "outtmpl": str(Path(folder) / "%(title).100B.%(ext)s"),
        "windowsfilenames": True,  # avoid characters Windows doesn't allow
        "noplaylist": True,  # if the link is in a playlist, only get that one video
        "ffmpeg_location": FFMPEG,
        "quiet": True,
        "noprogress": True,
        "no_warnings": True,
    }

    if choice == "mp3":
        # Grab the best audio, then convert it to MP3.
        options["format"] = "bestaudio/best"
        options["postprocessors"] = [
            {"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "192"}
        ]
    else:
        # Grab the best video + audio and join them into one MP4 file.
        options["format"] = "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b"
        options["merge_output_format"] = "mp4"

    return options


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/download", methods=["POST"])
def download():
    url = (request.form.get("url") or "").strip()
    choice = request.form.get("format", "mp4")

    if not url.startswith(("http://", "https://")):
        return jsonify(error="That doesn't look like a link. It should start with https://"), 400

    folder = tempfile.mkdtemp(prefix="video-downloader-")
    try:
        with yt_dlp.YoutubeDL(build_options(choice, folder)) as ydl:
            ydl.download([url])
    except yt_dlp.utils.DownloadError as error:
        shutil.rmtree(folder, ignore_errors=True)
        message = str(error).replace("ERROR: ", "")
        return jsonify(error=f"Couldn't download that link. {message}"), 400

    files = list(Path(folder).iterdir())
    if not files:
        shutil.rmtree(folder, ignore_errors=True)
        return jsonify(error="The download finished but no file was created."), 500

    file = files[0]

    def send_then_clean_up():
        # Send the file in small pieces, then delete the temporary copy.
        try:
            with open(file, "rb") as handle:
                while chunk := handle.read(1024 * 1024):
                    yield chunk
        finally:
            shutil.rmtree(folder, ignore_errors=True)

    response = Response(send_then_clean_up(), mimetype="application/octet-stream")
    response.headers["Content-Length"] = str(file.stat().st_size)
    response.headers["Content-Disposition"] = (
        f"attachment; filename*=UTF-8''{quote(file.name)}"
    )
    return response


if __name__ == "__main__":
    address = f"http://localhost:{PORT}"
    print(f"\nVideo Downloader is running at {address}")
    print("Keep this window open while you use it. Close it (or press Ctrl+C) to stop.\n")
    # Open the page in your browser a moment after the server starts.
    threading.Timer(1.5, lambda: webbrowser.open(address)).start()
    # 127.0.0.1 means only your own computer can reach this page.
    app.run(host="127.0.0.1", port=PORT)
