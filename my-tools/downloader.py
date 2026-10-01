"""
Downloader: paste a link, see what's in it, then pick what to download.

Two free tools do the work:
  gallery-dl - posts with pictures, albums and videos (Instagram, X/Twitter,
               Reddit, TikTok photo posts, Pinterest, Tumblr and many more)
  yt-dlp     - videos and audio (YouTube, and over 1,000 other sites)

Step 1 (/analyze) looks at the link and lists what's inside without downloading.
Step 2 (/download) downloads the items you picked and sends them to your
browser's Downloads folder. Several files arrive together as one ZIP.
"""

import io
import shutil
import subprocess
import tempfile
import threading
import uuid
import zipfile
from pathlib import Path
from urllib.parse import quote

import yt_dlp
from flask import Blueprint, Response, jsonify, render_template, request
from gallery_dl import config as gallery_config
from gallery_dl import extractor as gallery_extractor
from gallery_dl import job as gallery_job
from gallery_dl.extractor.message import Message

from shared import FFMPEG

downloader = Blueprint("downloader", __name__, url_prefix="/downloader")

VIDEO_TYPES = {"mp4", "webm", "mov", "m4v", "mkv", "avi", "flv"}
AUDIO_TYPES = {"mp3", "m4a", "aac", "ogg", "opus", "wav", "flac"}
BROWSERS = {"firefox", "chrome", "edge", "safari", "brave", "opera", "vivaldi", "chromium"}
MOST_ITEMS = 100  # don't list more than this many items from one link

# What each link contained, by id, so step 2 knows what step 1 found.
lookups = {}
# gallery-dl keeps its settings in one shared place, so run one job at a time.
gallery_lock = threading.Lock()


# ---------- Settings for the two tools ----------

def setup_gallery_dl(browser, folder=None, pick=None):
    """Settings for gallery-dl. `pick` limits which items, e.g. "1,3"."""
    gallery_config.clear()
    gallery_config.set(("output",), "mode", "null")  # keep the command window quiet
    gallery_config.set(("extractor",), "image-range", pick or f"1-{MOST_ITEMS}")
    if folder:
        gallery_config.set(("extractor",), "base-directory", str(folder))
        gallery_config.set(("extractor",), "directory", [])  # no sub-folders
    if browser:
        gallery_config.set(("extractor",), "cookies", [browser])
    # Some posts hand their videos over to yt-dlp; give it ffmpeg to join video + audio.
    gallery_config.set(("downloader", "ytdl"), "raw-options",
                       {"ffmpeg_location": FFMPEG, "merge_output_format": "mp4"})


def ytdlp_options(browser, folder=None, choice="mp4", pick=None):
    """Settings for yt-dlp."""
    options = {
        "quiet": True,
        "noprogress": True,
        "no_warnings": True,
        "noplaylist": True,  # a video inside a playlist: just that video
        "ffmpeg_location": FFMPEG,
        "windowsfilenames": True,  # avoid characters Windows doesn't allow
    }
    if browser:
        options["cookiesfrombrowser"] = (browser,)
    if pick:
        options["playlist_items"] = pick
    if folder is None:
        # Just looking: list a playlist's videos quickly without opening each one.
        options["extract_flat"] = "in_playlist"
        options["playlistend"] = MOST_ITEMS
        return options

    options["outtmpl"] = str(Path(folder) / "%(playlist_index&{:03d} |)s%(title).100B.%(ext)s")
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


# ---------- Step 1: look at a link ----------

def kind_of(file_type, url=""):
    if file_type in VIDEO_TYPES or url.startswith("ytdl:"):
        return "video"
    if file_type in AUDIO_TYPES:
        return "audio"
    return "image"


def look_with_gallery_dl(url, browser):
    """Ask gallery-dl what files a post has. Returns (title, items)."""
    with gallery_lock:
        setup_gallery_dl(browser)
        data_job = gallery_job.DataJob(url, file=io.StringIO())
        data_job.run()

    items, title, has_links = [], "", False
    for message in data_job.data:
        if message[0] == -1:
            # gallery-dl reports a problem as (-1, {"error": ..., "message": ...}).
            raise RuntimeError(message[1].get("message") or message[1].get("error"))
        if message[0] == Message.Directory:
            info = message[1]
            title = title or info.get("description") or info.get("title") or info.get("content") or ""
        elif message[0] == Message.Url:
            file_url, info = message[1], message[2]
            file_type = (info.get("extension") or "").lower()
            kind = kind_of(file_type, file_url)
            items.append({
                "kind": kind,
                "name": f"{kind.title()} {len(items) + 1}",
                "preview": file_url if kind == "image" else None,
            })
        elif message[0] == Message.Queue:
            has_links = True

    if not items and has_links:
        raise RuntimeError("That link is a list of posts. Open one post and paste its link instead.")
    return " ".join(str(title).split())[:120], items


def look_with_ytdlp(url, browser):
    """Ask yt-dlp what videos a link has. Returns (title, items)."""
    with yt_dlp.YoutubeDL(ytdlp_options(browser)) as ydl:
        info = ydl.extract_info(url, download=False)

    def preview(entry):
        if entry.get("thumbnail"):
            return entry["thumbnail"]
        thumbnails = entry.get("thumbnails") or []
        return thumbnails[-1].get("url") if thumbnails else None

    entries = [entry for entry in (info.get("entries") or []) if entry]
    if not entries:
        kind = "audio" if info.get("vcodec") == "none" else "video"
        entries, kinds = [info], [kind]
    else:
        kinds = ["video"] * len(entries)

    items = [
        {"kind": kind, "name": entry.get("title") or f"Video {number}", "preview": preview(entry)}
        for number, (entry, kind) in enumerate(zip(entries, kinds), start=1)
    ]
    return info.get("title") or "", items


@downloader.route("/")
def page():
    return render_template("downloader.html")


@downloader.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    url = (data.get("url") or "").strip()
    browser = data.get("browser") if data.get("browser") in BROWSERS else None
    if not url.startswith(("http://", "https://")):
        return jsonify(error="That doesn't look like a link. It should start with https://"), 400

    problem = None
    title, items, engine = "", [], None

    # Posts with pictures/albums: gallery-dl (if it knows this website).
    if gallery_extractor.find(url):
        try:
            title, items = look_with_gallery_dl(url, browser)
            engine = "gallery-dl"
        except Exception as error:
            problem = str(error)

    # Videos: yt-dlp (also a backup if gallery-dl found nothing).
    if not items:
        try:
            title, items = look_with_ytdlp(url, browser)
            engine = "yt-dlp"
        except yt_dlp.utils.DownloadError as error:
            problem = problem or short_error(error)

    if not items:
        message = problem or "Nothing to download was found at that link."
        tip = " If it's private or needs a login, choose your browser under “Use my logins” and try again."
        return jsonify(error=f"Couldn't read that link. {message}{tip}"), 400

    lookup_id = uuid.uuid4().hex
    lookups[lookup_id] = {"url": url, "engine": engine, "title": title, "items": items}
    return jsonify(id=lookup_id, title=title, items=items, limited=len(items) >= MOST_ITEMS)


# ---------- Step 2: download what you picked ----------

def to_mp3(folder):
    """Turn every video/audio file in the folder into an MP3 (gallery-dl downloads)."""
    for file in list(folder.iterdir()):
        file_type = file.suffix.lower().lstrip(".")
        if file_type in VIDEO_TYPES | AUDIO_TYPES and file_type != "mp3":
            subprocess.run(
                [FFMPEG, "-hide_banner", "-loglevel", "error", "-y", "-i", str(file),
                 "-vn", "-b:a", "192k", str(file.with_suffix(".mp3"))],
                check=True,
            )
            file.unlink()


def send_file_then_clean_up(file, folder, name):
    """Send a file to the browser in small pieces, then delete the temporary folder."""
    def pieces():
        try:
            with open(file, "rb") as handle:
                while chunk := handle.read(1024 * 1024):
                    yield chunk
        finally:
            shutil.rmtree(folder, ignore_errors=True)

    response = Response(pieces(), mimetype="application/octet-stream")
    response.headers["Content-Length"] = str(file.stat().st_size)
    response.headers["Content-Disposition"] = f"attachment; filename*=UTF-8''{quote(name)}"
    return response


def short_error(error):
    """yt-dlp's errors end with a long "please report this issue" note; drop it."""
    return str(error).replace("ERROR: ", "").split("; please report this issue")[0]


def safe_name(text, fallback):
    cleaned = "".join(c for c in text if c not in '<>:"/\\|?*' and ord(c) >= 32).strip(" .")
    return cleaned[:80] or fallback


@downloader.route("/download", methods=["POST"])
def download():
    data = request.get_json()
    lookup = lookups.get(data.get("id"))
    if not lookup:
        return jsonify(error="Please click “Find media” again."), 400
    browser = data.get("browser") if data.get("browser") in BROWSERS else None
    choice = "mp3" if data.get("format") == "mp3" else "mp4"
    numbers = data.get("items")  # e.g. [2] for one item, or "all"
    if numbers == "all":
        numbers = list(range(1, len(lookup["items"]) + 1))
    pick = ",".join(str(int(n)) for n in numbers)

    folder = Path(tempfile.mkdtemp(prefix="my-tools-"))
    files_folder = folder / "files"
    files_folder.mkdir()
    try:
        if lookup["engine"] == "gallery-dl":
            with gallery_lock:
                setup_gallery_dl(browser, files_folder, pick)
                status = gallery_job.DownloadJob(lookup["url"]).run()
            if status and not any(files_folder.iterdir()):
                raise RuntimeError("gallery-dl couldn't download the files.")
            if choice == "mp3":
                to_mp3(files_folder)
        else:
            many = len(lookup["items"]) > 1
            with yt_dlp.YoutubeDL(ytdlp_options(browser, files_folder, choice, pick if many else None)) as ydl:
                ydl.download([lookup["url"]])
    except Exception as error:
        shutil.rmtree(folder, ignore_errors=True)
        return jsonify(error=f"Couldn't download that. {short_error(error)}"), 400

    files = sorted(file for file in files_folder.rglob("*") if file.is_file() and not file.name.endswith(".part"))
    if not files:
        shutil.rmtree(folder, ignore_errors=True)
        return jsonify(error="The download finished but no file was created."), 500

    if len(files) == 1:
        return send_file_then_clean_up(files[0], folder, files[0].name)

    # Several files: pack them into one ZIP (no extra compression; media is already compressed).
    zip_path = folder / "download.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_STORED) as archive:
        for file in files:
            archive.write(file, file.name)
    return send_file_then_clean_up(zip_path, folder, safe_name(lookup["title"], "download") + ".zip")
