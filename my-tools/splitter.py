"""
Split into clips (part of the Video Clipper).

  1. Find the cuts: ffmpeg scores how different each frame is from the one
     before. A big jump means a new shot starts there.
  2. Plan the clips: each shot becomes a clip. A shot longer than the longest
     clip you allow is split into equal parts (6s with a 5s limit = two 3s clips).
  3. Cut the clips: one pass that re-encodes the video at high quality, so every
     clip starts on its exact frame (copying without re-encoding can only cut
     at a few spots and would start clips late).
  4. Take a screenshot of each clip's first frame. If it's blurry, use the
     next clear frame instead. Screenshots come from the original video, at
     full quality.

Files are named after the video: My Video_C01.mp4 + My Video_C01.png, and so on.
"""

import math
import re
import subprocess
import tempfile

import numpy as np

from shared import FFMPEG

# How big a change between frames counts as a cut (lower = more cuts).
SENSITIVITY = {"low": 0.45, "normal": 0.3, "high": 0.2}
SHORTEST_SHOT = 0.5    # a "shot" shorter than this (like a flash) joins the clip before it
SNAPSHOT_SEARCH = 3.0  # how far into a clip to look for a clear frame, in seconds
SHARP_ENOUGH = 0.7     # "clear" = at least 70% as sharp as the sharpest frame in the next half second
COMPARE_WINDOW = 0.5   # seconds
NUDGE = 0.002          # a tiny step back so rounding never skips a cut's first frame
LOOK_SIZE = (480, 270) # frames are shrunk to this size just to measure blur (faster)


class Cancelled(Exception):
    pass


def run_ffmpeg(command, job, duration, progress_from, progress_to):
    """Run ffmpeg, moving the progress bar from one point to another. Returns ffmpeg's log."""
    if job["state"] == "cancelling":
        raise Cancelled()
    with tempfile.TemporaryFile(mode="w+", encoding="utf-8", errors="replace") as log:
        process = subprocess.Popen(
            command + ["-progress", "pipe:1", "-nostats"],
            stdout=subprocess.PIPE, stderr=log, text=True, errors="replace",
        )
        job["process"] = process
        for line in process.stdout:
            if job["state"] == "cancelling" and process.poll() is None:
                process.terminate()  # you clicked Cancel
            key, _, value = line.strip().partition("=")
            if key == "out_time_us" and value.isdigit() and duration:
                done = min(int(value) / 1_000_000 / duration, 1.0)
                job["progress"] = progress_from + (progress_to - progress_from) * done
        process.wait()
        log.seek(0)
        text = log.read()

    if job["state"] == "cancelling":
        raise Cancelled()
    if process.returncode != 0:
        lines = [line for line in text.strip().splitlines() if line.strip()]
        raise RuntimeError(lines[-1] if lines else "ffmpeg stopped unexpectedly.")
    return text


def find_cuts(video, duration, sensitivity, job):
    """Return the times (in seconds) where a new shot starts."""
    threshold = SENSITIVITY.get(sensitivity, SENSITIVITY["normal"])
    log = run_ffmpeg(
        [FFMPEG, "-hide_banner", "-nostdin", "-i", str(video), "-an", "-sn",
         "-vf", f"scale=320:-2,select='gt(scene,{threshold})',showinfo", "-f", "null", "-"],
        job, duration, 0.0, 0.3,
    )
    # showinfo prints the time base once ("time_base: 1/15360") and "pts:12345" per cut.
    base = re.search(r"time_base: (\d+)/(\d+)", log)
    if base:
        tick = int(base.group(1)) / int(base.group(2))
        return [int(p) * tick for p in re.findall(r"\bpts:\s*(-?\d+)", log)]
    return [float(t) for t in re.findall(r"pts_time:([\d.]+)", log)]


def plan_clips(cuts, duration, longest):
    """Turn cut times into a list of clip start times (the first clip starts at 0)."""
    shots = [0.0]
    for cut in sorted(cuts):
        if cut <= 0 or cut >= duration - SHORTEST_SHOT / 2:
            continue
        if cut - shots[-1] < SHORTEST_SHOT and shots[-1] > 0:
            shots[-1] = cut  # the shot before was just a flash: add it to the clip before
        elif cut - shots[-1] >= SHORTEST_SHOT:
            shots.append(cut)

    starts = []
    ends = shots[1:] + [duration]
    for start, end in zip(shots, ends):
        length = end - start
        parts = max(1, math.ceil(length / longest - 1e-9))  # 6s with a 5s limit = 2 parts
        starts += [start + length * part / parts for part in range(parts)]
    return starts


def cut_clips(video, starts, folder, name, job, duration):
    """Cut the video into clips at the start times, in one high-quality pass."""
    digits = max(2, len(str(len(starts))))
    common = [
        "-map", "0:v:0", "-map", "0:a:0?",
        "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-fps_mode", "passthrough",  # keep the original frames exactly (no added copies)
    ]
    command = [FFMPEG, "-hide_banner", "-nostdin", "-loglevel", "error", "-y", "-i", str(video)] + common

    if len(starts) == 1:
        command.append(str(folder / f"{name}_C{1:0{digits}d}.mp4"))
    else:
        times = ",".join(f"{max(start - NUDGE, 0):.4f}" for start in starts[1:])
        # % has a special meaning in ffmpeg's file pattern, so double any % in the folder or name.
        pattern = str(folder / f"{name}_C").replace("%", "%%") + f"%0{digits}d.mp4"
        command += [
            # Start a fresh keyframe exactly at each cut, then split there.
            "-force_key_frames", times,
            "-f", "segment", "-segment_times", times, "-reset_timestamps", "1",
            "-segment_start_number", "1",
            pattern,
        ]
    run_ffmpeg(command, job, duration, 0.3, 0.85)
    return digits


def sharpness_scores(video, start, length):
    """How sharp each frame is near the start of a clip (higher = sharper)."""
    width, height = LOOK_SIZE
    process = subprocess.run(
        [FFMPEG, "-hide_banner", "-nostdin", "-loglevel", "error",
         "-ss", f"{max(start - NUDGE, 0):.4f}", "-i", str(video), "-t", f"{length:.4f}",
         "-an", "-sn", "-vf", f"scale={width}:{height},format=gray", "-f", "rawvideo", "-"],
        capture_output=True,
    )
    frames = np.frombuffer(process.stdout, dtype=np.uint8)
    frames = frames[: len(frames) // (width * height) * width * height].reshape(-1, height, width)
    scores = []
    for frame in frames.astype(np.float32):
        # Sharp edges make big differences between neighbouring pixels; blur smooths them out.
        edges = (frame[:-2, 1:-1] + frame[2:, 1:-1] + frame[1:-1, :-2] + frame[1:-1, 2:]
                 - 4 * frame[1:-1, 1:-1])
        scores.append(float(edges.var()))
    return scores


def first_clear_frame(scores, seconds):
    """
    The first frame that's nearly as sharp as the frames just after it.
    Comparing with the next half second (not the whole clip) means a scene that
    simply gets more detailed later doesn't make a clear start look "blurry".
    """
    if not scores:
        return 0
    per_second = len(scores) / seconds if seconds > 0 else 30
    window = max(3, round(per_second * COMPARE_WINDOW))
    for index, score in enumerate(scores):
        if score >= max(scores[index:index + window]) * SHARP_ENOUGH:
            return index
    return 0


def save_snapshot(video, start, frame_number, path, image_format):
    """Save one frame from the original video at full quality."""
    command = [
        FFMPEG, "-hide_banner", "-nostdin", "-loglevel", "error", "-y",
        "-ss", f"{max(start - NUDGE, 0):.4f}", "-i", str(video),
        "-an", "-sn", "-vf", f"select=eq(n\\,{frame_number})", "-frames:v", "1",
    ]
    if image_format == "jpg":
        command += ["-qmin", "1", "-q:v", "1"]  # highest JPG quality
    subprocess.run(command + [str(path)], check=True, capture_output=True)


def run_split_job(job, video, longest, sensitivity, image_format, folder, duration):
    try:
        job["phase"] = "Finding the cuts…"
        starts = plan_clips(find_cuts(video, duration, sensitivity, job), duration, longest)
        job["total"] = len(starts)

        job["phase"] = f"Cutting {len(starts)} clips…"
        digits = cut_clips(video, starts, folder, video.stem, job, duration)

        ends = starts[1:] + [duration]
        for number, (start, end) in enumerate(zip(starts, ends), start=1):
            if job["state"] == "cancelling":
                raise Cancelled()
            job["phase"] = f"Screenshot {number} of {len(starts)}…"
            search = min(SNAPSHOT_SEARCH, end - start)
            scores = sharpness_scores(video, start, search)
            path = folder / f"{video.stem}_C{number:0{digits}d}.{image_format}"
            save_snapshot(video, start, first_clear_frame(scores, search), path, image_format)
            job["count"] = number
            job["progress"] = 0.85 + 0.15 * number / len(starts)

        job["state"] = "done"
        job["progress"] = 1.0
    except Cancelled:
        job["state"] = "cancelled"
    except Exception as error:
        job["state"] = "error"
        job["error"] = str(error)
