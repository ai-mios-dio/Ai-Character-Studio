"""
Video Clipper: two ways to work with a video on your computer.

  Split into clips   - split the video at its cuts (long shots are split
                       evenly), plus a clear screenshot of each clip's start.
                       The details are in splitter.py.
  Screenshots        - save a full-quality screenshot every few seconds.

You pick a video, the settings, and a folder to save into.
"""

import subprocess
import threading
import uuid
from pathlib import Path

from flask import Blueprint, jsonify, render_template, request

from shared import FFMPEG, open_folder, pick_path, video_info
from splitter import run_split_job

clipper = Blueprint("clipper", __name__, url_prefix="/clipper")

# Jobs that are running or finished, by id, so the page can check on them.
jobs = {}

# Where screenshots go unless you choose somewhere else.
DEFAULT_OUTPUT = Path.home() / "Pictures"
if not DEFAULT_OUTPUT.is_dir():
    DEFAULT_OUTPUT = Path.home()


def timestamp_label(seconds, show_fraction):
    """Turn 65.5 seconds into "00-01-05" (or "00-01-05.500") for file names."""
    whole = int(seconds)
    label = f"{whole // 3600:02d}-{whole % 3600 // 60:02d}-{whole % 60:02d}"
    if show_fraction:
        label += f".{round((seconds - whole) * 1000):03d}"
    return label


def new_output_folder(parent, video, label):
    """Make a fresh folder like "My Video - clips" so nothing is overwritten."""
    base = f"{video.stem} - {label}"
    folder = parent / base
    number = 2
    while folder.exists():
        folder = parent / f"{base} ({number})"
        number += 1
    folder.mkdir(parents=True)
    return folder


def run_job(job_id, video, interval, image_format, folder, duration):
    job = jobs[job_id]
    # Keep the first real frame at (or just after) every mark: 0s, 5s, 10s...
    # It picks an original frame (never a blend), at the video's full resolution.
    since_start = "(t-start_t)"
    before = "(prev_t-start_t)"
    pick = f"isnan(prev_t)+gt(floor({since_start}/{interval})\\,floor({before}/{interval}))"
    command = [
        FFMPEG, "-hide_banner", "-nostdin", "-loglevel", "error",
        "-i", str(video),
        "-vf", f"select='{pick}'", "-fps_mode", "vfr",
    ]
    if image_format == "jpg":
        # Highest JPG quality setting (1 = best).
        command += ["-qmin", "1", "-q:v", "1"]
    command += [
        "-progress", "pipe:1", "-nostats",
        str(folder / f"frame_%06d.{image_format}"),
    ]

    process = subprocess.Popen(
        command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors="replace"
    )
    job["process"] = process

    # ffmpeg reports how far along it is, e.g. "out_time_us=5000000" (5 seconds in).
    for line in process.stdout:
        key, _, value = line.strip().partition("=")
        if key == "out_time_us" and value.isdigit() and duration:
            job["progress"] = min(int(value) / 1_000_000 / duration, 1.0)
    errors = process.stderr.read()
    process.wait()

    # Rename frame_000001.png etc. to the moment in the video each one shows.
    frames = sorted(folder.glob(f"frame_*.{image_format}"))
    show_fraction = interval != int(interval)
    for index, frame in enumerate(frames):
        label = timestamp_label(index * interval, show_fraction)
        frame.rename(folder / f"{video.stem} {label}.{image_format}")
    job["count"] = len(frames)

    if job["state"] == "cancelling":
        job["state"] = "cancelled"
    elif process.returncode != 0:
        job["state"] = "error"
        job["error"] = errors.strip().splitlines()[-1] if errors.strip() else "ffmpeg stopped unexpectedly."
    else:
        job["state"] = "done"
        job["progress"] = 1.0


@clipper.route("/")
def page():
    return render_template("clipper.html", default_output=str(DEFAULT_OUTPUT))


@clipper.route("/pick", methods=["POST"])
def pick():
    kind = request.get_json().get("kind")
    try:
        return jsonify(path=pick_path("folder" if kind == "folder" else "video"))
    except Exception as error:
        return jsonify(error=str(error)), 500


@clipper.route("/info", methods=["POST"])
def info():
    video = Path(request.get_json().get("video", "").strip().strip('"'))
    if not video.is_file():
        return jsonify(error="Can't find that video. Check the path."), 400
    try:
        return jsonify(video_info(video))
    except ValueError as error:
        return jsonify(error=str(error)), 400


@clipper.route("/start", methods=["POST"])
def start():
    data = request.get_json()
    mode = "split" if data.get("mode") == "split" else "screenshots"
    video = Path(data.get("video", "").strip().strip('"'))
    output = Path(data.get("output", "").strip().strip('"')).expanduser()
    image_format = "jpg" if data.get("format") == "jpg" else "png"

    # "interval" is the seconds between screenshots, or the longest clip when splitting.
    try:
        interval = round(float(data.get("interval", 0)), 3)
    except (TypeError, ValueError):
        interval = 0
    if interval <= 0:
        return jsonify(error="The seconds must be a number above 0, like 5."), 400
    if mode == "split" and interval < 0.5:
        return jsonify(error="The longest clip must be at least 0.5 seconds."), 400
    if not video.is_file():
        return jsonify(error="Can't find that video. Check the path."), 400
    if not output.is_dir():
        return jsonify(error="Can't find that output folder. Check the path."), 400

    try:
        duration = video_info(video)["seconds"]
    except ValueError as error:
        return jsonify(error=str(error)), 400

    job_id = uuid.uuid4().hex
    if mode == "split":
        folder = new_output_folder(output, video, "clips")
        jobs[job_id] = {"state": "running", "mode": mode, "progress": 0.0, "count": 0,
                        "folder": str(folder), "phase": "Starting…"}
        work = run_split_job
        arguments = (jobs[job_id], video, interval, data.get("sensitivity"), image_format, folder, duration)
    else:
        folder = new_output_folder(output, video, f"every {interval:g}s")
        jobs[job_id] = {"state": "running", "mode": mode, "progress": 0.0, "count": 0, "folder": str(folder)}
        work = run_job
        arguments = (job_id, video, interval, image_format, folder, duration)
    threading.Thread(target=work, args=arguments, daemon=True).start()
    return jsonify(job=job_id, folder=str(folder))


@clipper.route("/status/<job_id>")
def status(job_id):
    job = jobs.get(job_id)
    if not job:
        return jsonify(error="Unknown job."), 404
    count = job["count"]
    if job["mode"] == "screenshots" and job["state"] in ("running", "cancelling"):
        # While running, count the images saved so far.
        count = sum(1 for _ in Path(job["folder"]).glob("frame_*"))
    return jsonify(
        state=job["state"], mode=job["mode"], progress=job["progress"], count=count,
        total=job.get("total"), phase=job.get("phase"), folder=job["folder"], error=job.get("error"),
    )


@clipper.route("/cancel/<job_id>", methods=["POST"])
def cancel(job_id):
    job = jobs.get(job_id)
    if not job or job["state"] != "running":
        return jsonify(ok=True)
    process = job.get("process")
    still_working = process is not None and process.poll() is None  # poll() is None until it finishes
    # Splitting has several steps, so it can stop between them too.
    if still_working or job["mode"] == "split":
        job["state"] = "cancelling"
        if still_working:
            process.terminate()
    return jsonify(ok=True)


@clipper.route("/open", methods=["POST"])
def open_output():
    path = Path(request.get_json().get("folder", ""))
    if not path.is_dir():
        return jsonify(error="That folder doesn't exist anymore."), 400
    open_folder(str(path))
    return jsonify(ok=True)
