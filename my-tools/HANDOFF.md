# Handoff: My Tools (Downloader + Video Clipper)

This is for the next Claude session, which will **integrate these tools into the user's other project**. It covers where the code is, how it works, what was learned the hard way, what's tested, and what's still open.

## Where the code is

- **Repository:** `gio-blip89/character-sheets` (GitHub)
- **Branch:** `claude/video-downloader-web-ui-goczzv` (not merged into the default branch)
- **Folder:** `my-tools/`. The rest of the repo is an unrelated app called "Character Studio", so ignore it.
- The user-facing guide is `my-tools/README.md`. This file is the developer-facing one.

## Working with the user

- The user is **new to programming** but keen to learn. Explain what you're doing in plain words, and work **one task at a time** so it isn't overwhelming.
- The user runs everything on a **Windows** PC (they also may use a Mac). The app runs locally, never as a public site.
- Cloud sessions can't reach YouTube or Instagram (the network proxy blocks them, and those sites also block data-center IPs). So real-site testing happens on the user's computer. Ask them to paste the command-window log when something fails, which worked well before.

## What the tools do

**Downloader**
- Paste a link to a **video, a post, or a whole profile/channel/playlist** and click **Find media**.
- It lists everything, grouped by post. Each item gets buttons: **MP4 / MP3** for videos and **Download picture** for images. Posts get **Download post (ZIP)**, and there's **Download all (ZIP)**.
- Profiles load in batches of about 60 items, with a **Load more** button.
- **Logins:** a saved `cookies.txt` file (works with Chrome), or borrowing cookies straight from Firefox and other browsers.

**Video Clipper**, two modes:
- **Split into clips:**
  1. Detect shot cuts.
  2. Split any shot longer than the "longest clip" setting into equal parts (6s with a 5s limit = two 3s clips).
  3. Cut frame-accurate clips.
  4. Save a screenshot of each clip's first *clear* frame. If the first frame is blurry, it moves forward until one is clear.

  Output is `<video>_C01.mp4` + `<video>_C01.png`, and so on, in a new folder `<video> - clips` inside the chosen folder.
- **Screenshots:** one full-resolution frame every N seconds, named by timestamp, like `<video> 00-01-05.png`.

## How it's built

A small **Python Flask** app at `http://127.0.0.1:5050`, bound to localhost only. It uses port 5050 because port 5000 is taken by AirPlay on macOS.

| File | What it does |
|---|---|
| `app.py` | Creates the Flask app, registers two Blueprints, serves the home page and opens the browser on start. |
| `downloader.py` | The `downloader` blueprint (`/downloader/...`). It uses **gallery-dl** (posts, images, albums, profiles) and **yt-dlp** (videos, channels, playlists). |
| `clipper.py` | The `clipper` blueprint (`/clipper/...`): page, file and folder pickers, video info, start/status/cancel/open-folder, and the screenshot mode. |
| `splitter.py` | Split-into-clips logic. Plain functions with no Flask, so it's **the easiest piece to reuse**. |
| `shared.py` | `FFMPEG` path (from **imageio-ffmpeg**, so there's no separate ffmpeg install), `pick_path()` (native file/folder dialog), `open_folder()`, `video_info()`. |
| `templates/` | Jinja pages. `base.html` holds a shared `post(url, data)` JSON helper and `show(el, msg, kind)`. The pages are `home.html`, `downloader.html` and `clipper.html`. |
| `static/style.css` | Shared styles. Colors are set as CSS variables, with light and dark themes. |
| `requirements.txt` | `flask`, `yt-dlp`, `gallery-dl`, `imageio-ffmpeg`, `numpy`. Unpinned on purpose, because the launchers run `pip install --upgrade` on every start. yt-dlp and gallery-dl need frequent updates as sites change. |
| `start-windows.bat`, `start-mac.command` | Double-click launchers. They create `venv/`, install or upgrade requirements, and run `app.py`. |
| `.gitignore` | Ignores `venv/`, `__pycache__/` and **`cookies.txt`** (the user's login cookies, which must never be committed). |

### Endpoints

All POST endpoints take JSON, except the cookies upload, which is multipart.

| Endpoint | Purpose |
|---|---|
| `POST /downloader/analyze {url, login}` | First batch. Returns `{id, posts:[{id,title,items:[{id,kind,name,preview}]}], more, skipped}`. |
| `POST /downloader/more {id}` | Next batch for the same lookup. |
| `POST /downloader/download {id, items: [ids] \| "all", format: mp4\|mp3\|original}` | Starts a background job. Returns `{job}`. |
| `GET /downloader/status/<job>` | Returns `{state: running\|done\|error, count, total, error}`. |
| `GET /downloader/file/<job>` | Streams the finished file (a single file, or a ZIP for several) as an attachment, then deletes the temp folder. One-time use. |
| `POST /downloader/cookies` (multipart `file`), `POST /downloader/cookies/remove` | Save or delete `my-tools/cookies.txt`. These require the header `X-My-Tools: 1`. |
| `POST /clipper/pick {kind: video\|folder}` | Opens a native dialog and returns `{path}`. |
| `POST /clipper/info {video}` | Returns `{seconds, width, height}`. |
| `POST /clipper/start {mode: split\|screenshots, video, interval, sensitivity, format: png\|jpg, output}` | `interval` means "longest clip" in split mode, or "seconds between screenshots" in screenshot mode. Returns `{job, folder}`. |
| `GET /clipper/status/<job>` | Returns `{state, mode, progress 0..1, count, total, phase, folder, error}`. |
| `POST /clipper/cancel/<job>`, `POST /clipper/open {folder}` | Cancel a job, or open the output folder in Explorer or Finder. |

Jobs and lookups live in in-memory dicts (`jobs`, `lookups`). They're lost on restart, which is fine for a single local user.

## How the Downloader works (`downloader.py`)

- **Engine choice:** if `gallery_dl.extractor.find(url)` matches, try gallery-dl first, then fall back to yt-dlp. URLs starting with `ytdl:` go to yt-dlp.
- **Listing in batches (`explore`):**
  - A *lookup* holds a list of **sources** (`{url, engine, next, more}`) and a queue of **waiting** URLs.
  - Each batch asks a source for items `next .. next+count-1`. gallery-dl does this with `image-range`, yt-dlp with `playliststart`/`playlistend` plus `extract_flat="in_playlist"`.
  - Sub-pages a source points to are queued and explored next: gallery-dl `Message.Queue` (for example, an Instagram user → its `/posts` list) and yt-dlp tab or playlist entries (for example, YouTube channel tabs).
  - A failing sub-source is skipped and counted in `skipped`. A failing first source raises an error.
- **Every item stores `(source, number)`**, its position within that source. A download groups the picked items by source. It re-runs gallery-dl's `DownloadJob` with `image-range` = those numbers, or yt-dlp with `playlist_items`.
- **Downloads run in a background thread.** The browser polls `status`, then navigates to `/file/<job>`, so big ZIPs stream to disk instead of being held in memory. ZIPs use `ZIP_STORED` (no compression, since media is already compressed).
- **MP3:** yt-dlp uses its `FFmpegExtractAudio` postprocessor. gallery-dl videos are converted afterward with ffmpeg (`to_mp3`).
- **Logins:** `login_choice()` returns `"file"`, a browser name, or `None`.
  - gallery-dl: config `cookies` = file path or `[browser]`, with `cookies-update: False` so the user's file is never rewritten.
  - yt-dlp: `cookiefile` or `cookiesfrombrowser`.
- **`friendly()`** rewrites common errors. Chrome cookie copy or decrypt failures point the user to cookies.txt, and login-related errors suggest "Use my logins".

### gallery-dl gotchas (version 1.32.x)

- gallery-dl keeps its settings in one global config, so every gallery-dl run is wrapped in `gallery_lock` and `setup_gallery_dl()` calls `config.clear()` first.
- In `DataJob.data`, errors arrive as `(-1, {"error":..., "message":...})`. The `Directory` message is stored as `(Message.Directory, kwdict)`, a 2-tuple. Extractors themselves *yield* a 3-tuple, `(Message.Directory, "", kwdict)`.
- The `image-range` option stops extraction early once it passes the end of the range, which is what makes batching cheap.
- When **downloading**, `child-filter: "False"` is set so gallery-dl doesn't also follow `Queue` links to other posts. Older docs call this option `chapter-filter`.
- A post's files follow its `Directory` message. That's how items are grouped into posts.

### Chrome cookies on Windows (the user hit this)

Chrome locks its cookie database while it's running (`[Errno 13] Permission denied ... Network\Cookies`). Newer Chrome also uses app-bound encryption, so other programs can't decrypt the cookies even when Chrome is closed. Borrowing cookies from Chrome or Edge on Windows is therefore unreliable.

The fix that's in place: the user exports **cookies.txt** with the Chrome extension "Get cookies.txt LOCALLY" and uploads it in the page. Firefox borrowing still works directly.

## How Split into clips works (`splitter.py`)

`run_split_job(job, video, longest, sensitivity, image_format, folder, duration)` updates the `job` dict as it goes: `phase`, `progress`, `count`, `total`, `state`, `error`. Cancel works by setting `job["state"] = "cancelling"`.

1. **`find_cuts`:** `scale=320:-2,select='gt(scene,T)',showinfo`. It parses `pts:` times and `time_base` for exact times. T is 0.45 for "Fewer cuts", 0.3 for "Normal" and 0.2 for "More cuts".
2. **`plan_clips`:** cuts less than 0.5s apart are merged, and a flash joins the clip *before* it. Each shot gets `ceil(length / longest)` equal parts.
3. **`cut_clips`:** one re-encode pass:
   - `libx264 -crf 16 -preset medium -pix_fmt yuv420p`, AAC 192k, `-fps_mode passthrough`
   - `-force_key_frames T` and `-f segment -segment_times T -reset_timestamps 1 -segment_start_number 1`, with the same times T for both
   - This gives frame-accurate starts in a single encode.
   - Every time is nudged back by `NUDGE = 0.002`s, so a float rounding error can't skip a cut's frame.
   - `%` in the output path, folder *and* file name, must be doubled for the segment pattern.
   - A single clip is written as a plain file, because the segment muxer without times would split every 2 seconds.
4. **Screenshots:**
   - `sharpness_scores` decodes up to 3s from each clip start, from the **original** video, as 480×270 grayscale. Sharpness is the variance of a Laplacian computed with numpy.
   - `first_clear_frame` picks the first frame that's at least 70% as sharp as the sharpest frame in the **next 0.5s**. A local window is used because a global maximum wrongly skipped clear frames in scenes that get more detailed later.
   - `save_snapshot` grabs that same frame index (`-ss start -i ... select=eq(n\,k)`) at full resolution, as PNG or max-quality JPG.

**Screenshot mode** (`clipper.run_job`) uses `select='isnan(prev_t)+gt(floor((t-start_t)/N)\,floor((prev_t-start_t)/N))' -fps_mode vfr`. The `fps=1/N` filter was tried first and was **about 1.2s off**, so don't go back to it.

**Pickers:** `shared.pick_path` runs tkinter in a *separate Python process*, because Tk must own the main thread on macOS. The dialog can open behind the browser.

## Testing approach (what worked in a cloud session)

- **Synthetic videos** made with ffmpeg `lavfi` sources (`testsrc2`, `mandelbrot`, `smptehdbars`, `rgbtestsrc`, `cellauto`, `color`). Force `fps=30,settb=1/30,setpts=N` per segment, or the timings drift.
- **Checking results:** clips and screenshots were matched back to source frames by comparing downscaled grayscale frames with numpy. When counting frames, use `showinfo` with no output padding, because `-f rawvideo` can duplicate a frame.
- **Downloader without the internet:** a fake gallery-dl extractor was registered in the test process only, with `gallery_dl.extractor.add(cls)`. It served a post and a 150-post "profile" from local files via `python -m http.server`.
- **The UI** was driven with Playwright, using the preinstalled Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.

## Status

- ✅ **Tested in a cloud session:**
  - Downloader on local fakes: posts, profiles with Load more, picking across batches, ZIP, MP3, cookies save, reject and remove.
  - Clipper on synthetic videos: exact cuts, even splitting, the blur skip, no-audio video, `%` names, cancel at every step.
  - Fresh-install launcher (Mac script on Linux).
- ⚠️ **Not yet tested on real sites or the user's own footage.** The user's first real run hit the Chrome cookie error, which led to the cookies.txt option. After that, they haven't reported results.
- **Known limitations:**
  - A post that straddles a batch boundary appears as two cards after Load more.
  - Threads isn't supported by gallery-dl or yt-dlp.
  - Instagram profiles basically require cookies and may rate-limit.
  - HDR or 10-bit clips are converted to 8-bit `yuv420p` with no tone-mapping.
- **Choices to confirm with the user:**
  - Naming is `_C01`. The user said "CO1", which was interpreted as C-zero-one.
  - Clip output goes into a `<video> - clips` subfolder rather than straight into the chosen folder.

## Integration notes

- **Easiest to reuse:** `splitter.py` and `shared.py` are plain Python functions. `downloader.py`'s `explore`, `gallery_batch`, `ytdlp_batch` and `run_download` contain the logic, with Flask only in the route functions. The `job` dict is a simple progress and cancel contract.
- **If the other tool is Flask:** copy the modules and register the `downloader` and `clipper` blueprints. The templates extend `base.html`, so adapt them to the other app's layout and keep the `post()` helper.
- **If it's another Python web framework or a desktop app:** keep the modules and rewrite only the routes and UI.
- **If it's not Python** (for example Node or Electron): run this as a local Python service, or call the scripts as subprocesses. yt-dlp and gallery-dl are Python. ffmpeg itself is available as a binary.
- **Keep these behaviors:**
  - Bind to localhost only.
  - Never commit `cookies.txt`, and keep the `X-My-Tools` header check (or an equivalent CSRF guard) on endpoints that change it.
  - Keep `pip install --upgrade` (or another update path) for yt-dlp and gallery-dl.
  - Keep the reminder to only download content the user has the right to save.
