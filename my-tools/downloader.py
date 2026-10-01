"""
Downloader: paste a link (a video, a post, or a whole profile), see what's in it,
then pick what to download.

Two free tools do the work:
  gallery-dl - posts, pictures, albums and profiles (Instagram, X/Twitter,
               TikTok, Reddit, Pinterest, Bluesky, Facebook and many more)
  yt-dlp     - videos and audio (YouTube videos, channels and playlists, and
               over 1,000 other sites)

Step 1 (/analyze, then /more) lists what's inside, a batch at a time.
Step 2 (/download) downloads the items you picked in the background, then
your browser saves the result (several files arrive together as one ZIP).
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
BATCH = 60  # how many items to list at a time; "Load more" gets the next batch

# A cookies.txt file you saved from your browser (see the README). It stays on your computer.
COOKIES_FILE = Path(__file__).with_name("cookies.txt")

# What each link contained, by id, so later steps know what step 1 found.
lookups = {}
# Downloads running in the background, by id.
jobs = {}
# gallery-dl keeps its settings in one shared place, so run one gallery-dl job at a time.
gallery_lock = threading.Lock()


# ---------- Logins and settings for the two tools ----------

def login_choice(value):
    """"file" (the saved cookies.txt), a browser name, or None for no login."""
    if value == "file":
        return "file" if COOKIES_FILE.is_file() else None
    return value if value in BROWSERS else None


def setup_gallery_dl(login, folder=None, pick=None):
    """Settings for gallery-dl. `pick` limits which files, e.g. "1-60" or "2,5"."""
    gallery_config.clear()
    gallery_config.set(("output",), "mode", "null")  # keep the command window quiet
    if pick:
        gallery_config.set(("extractor",), "image-range", pick)
    if folder:
        gallery_config.set(("extractor",), "base-directory", str(folder))
        gallery_config.set(("extractor",), "directory", [])  # no sub-folders
        # Only download the picked files, not other posts this page links to.
        gallery_config.set(("extractor",), "child-filter", "False")
    if login == "file":
        gallery_config.set(("extractor",), "cookies", str(COOKIES_FILE))
        gallery_config.set(("extractor",), "cookies-update", False)  # leave your file as it is
    elif login:
        gallery_config.set(("extractor",), "cookies", [login])
    # Some posts hand their videos over to yt-dlp; give it ffmpeg to join video + audio.
    gallery_config.set(("downloader", "ytdl"), "raw-options",
                       {"ffmpeg_location": FFMPEG, "merge_output_format": "mp4"})


def ytdlp_options(login, folder=None, choice="mp4", pick=None, start=None, end=None):
    """Settings for yt-dlp."""
    options = {
        "quiet": True,
        "noprogress": True,
        "no_warnings": True,
        "noplaylist": True,  # a video inside a playlist: just that video
        "ffmpeg_location": FFMPEG,
        "windowsfilenames": True,  # avoid characters Windows doesn't allow
    }
    if login == "file":
        options["cookiefile"] = str(COOKIES_FILE)
    elif login:
        options["cookiesfrombrowser"] = (login,)
    if pick:
        options["playlist_items"] = pick
    if folder is None:
        # Just looking: list a channel's or playlist's videos quickly without opening each one.
        options["extract_flat"] = "in_playlist"
        if start:
            options["playliststart"] = start
            options["playlistend"] = end
        return options

    options["outtmpl"] = str(Path(folder) / "%(playlist_index&{:03d} |)s%(title).100B [%(id)s].%(ext)s")
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


def friendly(error):
    """Turn the tools' error messages into something easier to act on."""
    text = str(error).replace("ERROR: ", "").split("; please report this issue")[0]
    lowered = text.lower()
    if "chrome cookie" in lowered or "dpapi" in lowered or "decrypt" in lowered or (
        "permission denied" in lowered and "cookies" in lowered
    ):
        return ("Couldn't borrow the logins from that browser. Chrome (and Edge) on Windows lock "
                "and encrypt their logins so other apps can't read them. Use the “cookies.txt file” "
                "option instead, or Firefox.")
    if "login" in lowered or "log in" in lowered or "401" in lowered or "403" in lowered:
        return text + " This probably needs you to be logged in: use “Use my logins”."
    return text


# ---------- Step 1: look at a link, a batch at a time ----------

def kind_of(file_type, url=""):
    if file_type in VIDEO_TYPES or url.startswith("ytdl:"):
        return "video"
    if file_type in AUDIO_TYPES:
        return "audio"
    return "image"


def describe(info):
    """A short caption for a post from whatever text the website gave us."""
    text = info.get("description") or info.get("content") or info.get("title") or ""
    return " ".join(str(text).split())[:150]


def gallery_batch(url, login, start, count):
    """
    List up to `count` files from a post or profile, starting at file number `start`.
    Returns (posts, links, maybe_more). `links` are other pages to look at next,
    like the separate posts a profile points to.
    """
    with gallery_lock:
        setup_gallery_dl(login, pick=f"{start}-{start + count - 1}")
        data_job = gallery_job.DataJob(url, file=io.StringIO())
        data_job.run()

    posts, links, number, post = [], [], start - 1, None
    for message in data_job.data:
        if message[0] == -1:
            # gallery-dl reports a problem as (-1, {"error": ..., "message": ...}).
            raise RuntimeError(message[1].get("message") or message[1].get("error"))
        if message[0] == Message.Directory:
            # A new post starts; its files follow.
            post = {"title": describe(message[1]), "items": []}
            posts.append(post)
        elif message[0] == Message.Url:
            number += 1
            if post is None:
                post = {"title": "", "items": []}
                posts.append(post)
            file_url, info = message[1], message[2]
            kind = kind_of((info.get("extension") or "").lower(), file_url)
            post["items"].append({
                "kind": kind,
                "preview": file_url if kind == "image" else None,
                "number": number,
            })
        elif message[0] == Message.Queue:
            links.append(message[1])

    got = number - start + 1
    return [p for p in posts if p["items"]], links, got >= count


def is_list(entry):
    """In a YouTube channel, some entries are lists themselves (Videos, Shorts, Live tabs)."""
    kind = (entry.get("ie_key") or "").lower()
    return entry.get("_type") in ("url", "url_transparent") and ("tab" in kind or "playlist" in kind)


def preview_of(entry):
    if entry.get("thumbnail"):
        return entry["thumbnail"]
    thumbnails = entry.get("thumbnails") or []
    return thumbnails[-1].get("url") if thumbnails else None


def ytdlp_batch(url, login, start, count):
    """List up to `count` videos from a video, playlist or channel. Same answer as gallery_batch."""
    with yt_dlp.YoutubeDL(ytdlp_options(login, start=start, end=start + count - 1)) as ydl:
        info = ydl.extract_info(url, download=False)

    if "entries" not in info:
        # Just one video (or song).
        kind = "audio" if info.get("vcodec") == "none" else "video"
        item = {"kind": kind, "preview": preview_of(info), "number": None, "name": info.get("title")}
        return [{"title": info.get("title") or "", "items": [item]}], [], False

    posts, links, number = [], [], start - 1
    for entry in info["entries"]:
        number += 1
        if not entry:
            continue
        if is_list(entry):
            links.append(entry["url"])
            continue
        item = {
            "kind": "video",
            "preview": preview_of(entry),
            "number": entry.get("playlist_index") or number,
            "name": entry.get("title"),
        }
        posts.append({"title": entry.get("title") or "", "items": [item]})
    return posts, links, number - start + 1 >= count


def engine_for(url):
    """gallery-dl if it knows the website, otherwise yt-dlp."""
    if url.startswith("ytdl:"):
        return "yt-dlp", url[5:]
    return ("gallery-dl" if gallery_extractor.find(url) else "yt-dlp"), url


def explore(lookup, count):
    """Add up to `count` more items to a lookup. Returns the new posts."""
    new_posts, added = [], 0
    while added < count:
        source = next((s for s in lookup["sources"] if s["more"]), None)
        if source is None:
            if not lookup["waiting"]:
                break
            engine, url = engine_for(lookup["waiting"].pop(0))
            source = {"url": url, "engine": engine, "next": 1, "more": True}
            lookup["sources"].append(source)

        batch = gallery_batch if source["engine"] == "gallery-dl" else ytdlp_batch
        try:
            posts, links, more = batch(source["url"], lookup["login"], source["next"], count - added)
        except Exception:
            source["more"] = False
            if source is lookup["sources"][0] and not lookup["items"]:
                raise  # the link itself didn't work
            lookup["skipped"] += 1  # one post out of many didn't work; carry on
            continue

        if source["next"] == 1:
            # Pages this one points to (e.g. a profile's posts): look at them next.
            lookup["waiting"].extend(link for link in links if link not in lookup["seen"])
            lookup["seen"].update(links)
        source["next"] += count - added
        source["more"] = more

        source_number = lookup["sources"].index(source)
        for post in posts:
            post["id"] = len(lookup["posts"])
            for position, item in enumerate(post["items"], start=1):
                item["id"] = len(lookup["items"])
                item["source"] = source_number
                if not item.get("name"):
                    many = len(post["items"]) > 1
                    label = {"video": "Video", "image": "Picture", "audio": "Audio"}[item["kind"]]
                    item["name"] = f"{label} {position}" if many or not post["title"] else post["title"]
                lookup["items"].append(item)
            lookup["posts"].append(post)
            new_posts.append(post)
            added += len(post["items"])
    return new_posts


def public(posts):
    """What the page needs to know about posts (leave out the inner details)."""
    return [
        {"id": p["id"], "title": p["title"],
         "items": [{key: item[key] for key in ("id", "kind", "name", "preview")} for item in p["items"]]}
        for p in posts
    ]


def answer(lookup, posts):
    more = any(s["more"] for s in lookup["sources"]) or bool(lookup["waiting"])
    return jsonify(id=lookup["id"], posts=public(posts), more=more, skipped=lookup["skipped"])


@downloader.route("/")
def page():
    return render_template("downloader.html", has_cookies=COOKIES_FILE.is_file())


@downloader.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    url = (data.get("url") or "").strip()
    login = login_choice(data.get("login"))
    if not url.startswith(("http://", "https://")):
        return jsonify(error="That doesn't look like a link. It should start with https://"), 400

    def new_lookup(engine):
        return {"id": uuid.uuid4().hex, "url": url, "login": login, "posts": [], "items": [],
                "sources": [{"url": url, "engine": engine, "next": 1, "more": True}],
                "waiting": [], "seen": set(), "skipped": 0}

    problem = None
    engines = ["gallery-dl", "yt-dlp"] if gallery_extractor.find(url) else ["yt-dlp"]
    for engine in engines:
        lookup = new_lookup(engine)
        try:
            posts = explore(lookup, BATCH)
        except Exception as error:
            problem = problem or friendly(error)
            continue
        if posts:
            lookups[lookup["id"]] = lookup
            return answer(lookup, posts)

    message = problem or "Nothing to download was found at that link."
    tip = "" if "logins" in message else " If it's private or needs a login, use “Use my logins” and try again."
    return jsonify(error=f"Couldn't read that link. {message}{tip}"), 400


@downloader.route("/more", methods=["POST"])
def more():
    lookup = lookups.get(request.get_json().get("id"))
    if not lookup:
        return jsonify(error="Please click “Find media” again."), 400
    try:
        posts = explore(lookup, BATCH)
    except Exception as error:
        return jsonify(error=friendly(error)), 400
    return answer(lookup, posts)


# ---------- Logins: a saved cookies.txt file ----------

def from_this_page():
    # Only this app's own page sends this header, so other websites can't change your logins.
    return request.headers.get("X-My-Tools") == "1"


@downloader.route("/cookies", methods=["POST"])
def save_cookies():
    if not from_this_page():
        return jsonify(error="Not allowed."), 403
    upload = request.files.get("file")
    text = upload.read().decode("utf-8", errors="replace") if upload else ""
    looks_right = "Netscape HTTP Cookie File" in text or any(
        line.count("\t") >= 6 for line in text.splitlines() if not line.startswith("#")
    )
    if not looks_right:
        return jsonify(error="That doesn't look like a cookies.txt file. Export it again with the extension."), 400
    COOKIES_FILE.write_text(text, encoding="utf-8")
    return jsonify(ok=True)


@downloader.route("/cookies/remove", methods=["POST"])
def remove_cookies():
    if not from_this_page():
        return jsonify(error="Not allowed."), 403
    COOKIES_FILE.unlink(missing_ok=True)
    return jsonify(ok=True)


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


def safe_name(text, fallback):
    cleaned = "".join(c for c in text if c not in '<>:"/\\|?*' and ord(c) >= 32).strip(" .")
    return cleaned[:80] or fallback


def finished_files(folder):
    return sorted(
        file for file in folder.rglob("*")
        if file.is_file() and not file.name.endswith((".part", ".ytdl", ".temp"))
    )


def run_download(job, lookup, items, choice):
    folder = Path(job["folder"])
    files_folder = folder / "files"
    try:
        # Group the picked items by where they came from, then download each group.
        groups = {}
        for item in items:
            groups.setdefault(item["source"], []).append(item["number"])
        for source_number, numbers in groups.items():
            source = lookup["sources"][source_number]
            pick = ",".join(str(n) for n in sorted(n for n in numbers if n))
            if source["engine"] == "gallery-dl":
                with gallery_lock:
                    setup_gallery_dl(lookup["login"], files_folder, pick)
                    gallery_job.DownloadJob(source["url"]).run()
            else:
                options = ytdlp_options(lookup["login"], files_folder, choice, pick or None)
                with yt_dlp.YoutubeDL(options) as ydl:
                    ydl.download([source["url"]])
        if choice == "mp3":
            to_mp3(files_folder)

        files = finished_files(files_folder)
        if not files:
            raise RuntimeError("Nothing could be downloaded. It may need a login: use “Use my logins”.")
        if len(files) == 1:
            job["file"], job["name"] = str(files[0]), files[0].name
        else:
            # Several files: pack them into one ZIP (no extra squeezing; media is already compressed).
            zip_path = folder / "download.zip"
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_STORED) as archive:
                for file in files:
                    archive.write(file, file.relative_to(files_folder))
            job["file"], job["name"] = str(zip_path), job["zip_name"]
        job["state"] = "done"
    except Exception as error:
        job["state"] = "error"
        job["error"] = f"Couldn't download that. {friendly(error)}"
        shutil.rmtree(folder, ignore_errors=True)


@downloader.route("/download", methods=["POST"])
def download():
    data = request.get_json()
    lookup = lookups.get(data.get("id"))
    if not lookup:
        return jsonify(error="Please click “Find media” again."), 400
    choice = "mp3" if data.get("format") == "mp3" else "mp4"
    wanted = data.get("items")  # a list of item ids, or "all"
    items = lookup["items"] if wanted == "all" else [lookup["items"][int(i)] for i in wanted]

    picked = {item["id"] for item in items}
    post_titles = {p["title"] for p in lookup["posts"] if any(i["id"] in picked for i in p["items"])}
    zip_name = next(iter(post_titles)) if len(post_titles) == 1 else lookup["url"].rstrip("/").split("/")[-1]
    folder = Path(tempfile.mkdtemp(prefix="my-tools-"))
    (folder / "files").mkdir()

    job_id = uuid.uuid4().hex
    jobs[job_id] = {"state": "running", "folder": str(folder), "total": len(items),
                    "zip_name": safe_name(zip_name, "download") + ".zip"}
    threading.Thread(target=run_download, args=(jobs[job_id], lookup, items, choice), daemon=True).start()
    return jsonify(job=job_id)


@downloader.route("/status/<job_id>")
def status(job_id):
    job = jobs.get(job_id)
    if not job:
        return jsonify(error="Unknown download."), 404
    count = 0
    if job["state"] == "running":
        count = len(finished_files(Path(job["folder"]) / "files"))
    return jsonify(state=job["state"], count=count, total=job["total"], error=job.get("error"))


@downloader.route("/file/<job_id>")
def file(job_id):
    """Your browser fetches the finished file from here, then the temporary copy is deleted."""
    job = jobs.pop(job_id, None)
    if not job or job["state"] != "done":
        return "This download has expired. Please download it again.", 404
    path, folder = Path(job["file"]), job["folder"]

    def pieces():
        try:
            with open(path, "rb") as handle:
                while chunk := handle.read(1024 * 1024):
                    yield chunk
        finally:
            shutil.rmtree(folder, ignore_errors=True)

    response = Response(pieces(), mimetype="application/octet-stream")
    response.headers["Content-Length"] = str(path.stat().st_size)
    response.headers["Content-Disposition"] = f"attachment; filename*=UTF-8''{quote(job['name'])}"
    return response
