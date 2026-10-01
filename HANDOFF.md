# Handoff: AI Character Studio + PC tools (Downloader, Video Clipper, SCAIL-2 video)

This is for the next Claude session, which runs **locally on the user's Windows PC** and continues this project. Read it fully before doing anything. Then read the other handoffs listed in "Read next".

## The user

- New to programming but learning. Explain in plain words, **one task at a time**, and show results before moving on.
- Uses the app mostly on an **Android phone** (Chrome), and has a **Windows PC with an NVIDIA GPU** that runs ComfyUI.
- Likes to be asked before big design changes. Likes researched, concrete options.
- Asked to run big work in **Foreman mode**: the main model plans and reviews, cheaper subagents (Sonnet/Haiku) do the work, Opus only if needed, and token use stays low.
- Wants to **build and test locally first**, and push to GitHub only once things work.

## Repository

- GitHub: **`ai-mios-dio/Ai-Character-Studio`** (the user renamed the account and the repo; the old name `gio-blip89/character-sheets` redirects).
- **`ccr-109790b3-opjx0y`** is the default branch and has the latest web app. GitHub Pages serves it at **`https://ai-mios-dio.github.io/Ai-Character-Studio/`** (check **Settings → Pages** to confirm the exact address and branch).
- **`claude/video-downloader-web-ui-goczzv`** has the PC tools in **`my-tools/`**. The rest of that branch is an older copy of the web app, so ignore it.
- Commit messages: a short title, then a few lines on what changed and why.

## The web app: AI Character Studio (done, working)

A static site: HTML, CSS and plain JavaScript, with no build step and no server. It calls Google's Gemini API (the Nano Banana image models) directly from the browser, using the user's own API key, which is stored in the browser only.

| File | What it does |
|---|---|
| `index.html` | Page skeleton, Settings page, Pose Cutter page. Every CSS/JS tag has `?v=N`. **Bump N on every change** (currently 75), or phones keep old cached files. |
| `css/style.css` | Dark "glass" theme. Variables in `:root`, including `--grad`, the logo gradient. Later rules at the end override earlier ones. |
| `js/tools.js` | **Every AI tool**: `TOOLS = [...]`, plus shared prompt pieces (`IDENTITY_LOCK`, `NO_TATTOOS`, `NO_EXTRAS`, `NATURAL_LOOK`, …). A tool definition is mostly data: inputs, fields, request, outputs and prompt. |
| `js/tool-ui.js` | Builds each tool page as a **step-by-step wizard**: Model → each input → choices → text → **Review** (with Edit per step) → **Results** (Review, Start new, Done). Also `run()`, the "Do it in AI Studio" manual mode, the `Loader` generating screen and `heightPicker`. |
| `js/app.js` | Pages and routing (`#hash`), the main menu, hubs, group menus (`GROUPS`), icons, Saved Characters / Saved Places pages, Settings, Pose Cutter. |
| `js/characters.js` | IndexedDB libraries: `Characters` (sheets, outfits, height, notes) and `Places`. |
| `js/catalog.js` | Makeup styles, outfits, poses, camera angles. |
| `js/gemini.js`, `js/models.js` | API calls and the model list. |
| `js/backup.js` | Settings → Backup & restore (one JSON file; the API key is never included). |
| `js/video.js`, `js/cutter.js` | Video frame extraction for Place from Video; the Pose Cutter. |
| `img/` | Logo and app icons. |
| `README.md` | User guide. Keep it updated when features change. |

**Main menu:** Characters, Places, Scenes, Settings.
- **Characters:** Character Builder, Sheets, Swap, Outfit, Pose, Makeup, Edit, Character Scene, Saved Characters, Pose Cutter.
- **Scenes:** Create a Scene, Scene Sheet, Camera Angle.

**Testing approach that worked:**
- Serve the folder with `python -m http.server 8765`.
- Drive it with Playwright, mocking `generativelanguage.googleapis.com` with a tiny PNG.
- Check the request parts and prompt text, and take screenshots at 390×844 (phone size).

## The PC tools (`my-tools/`, done, working; not yet integrated)

A **Python Flask** app at `http://127.0.0.1:5050`. It is started by `start-windows.bat`, which creates `venv` and upgrades the requirements on each start.

1. **Downloader:** paste a link (YouTube, Instagram, TikTok, X …), list the media, download MP4, MP3, pictures or a ZIP. Uses yt-dlp and gallery-dl, plus `cookies.txt` for logins.
2. **Video Clipper:**
   - **Split mode** splits a video at its cuts. Shots longer than the limit are split evenly.
   - It saves `<video>_C01.mp4` + `<video>_C01.png` pairs into a `<video> - clips` folder. Each PNG is the clip's first sharp frame.
   - There is also a "screenshot every N seconds" mode.

**Read `my-tools/HANDOFF.md`** on that branch for endpoints, internals, gotchas and testing. It's detailed and accurate.

## The video generator: SCAIL-2 (done locally, not yet integrated)

A local SCAIL-2 motion-control setup: ComfyUI plus a `scail_gen.py` command-line tool. It's documented in:
- `C:\ComfyUI_windows_portable_nvidia_cu126\scail_api\HANDOFF.md`
- `C:\ComfyUI_windows_portable_nvidia_cu126\scail_api\README.txt`

**These two files were never read by the cloud session** (it couldn't reach the PC). Read them first.

## What the user wants now

**1. Everything inside AI Character Studio.** The Downloader, the Video Clipper and the SCAIL-2 pipeline become tools inside the web app, using the same look and the same step-by-step wizard. Don't make a separate app.

**2. The web app keeps working exactly as it does now** (GitHub Pages, phone, Gemini tools). The parts that need the PC are done by a **"PC Helper"**: the my-tools Flask server, extended into a small local API that the website calls.

**3. A connection indicator** next to each PC tool:
- **green** = the PC Helper is running and that tool is available
- **red** = not available right now

The website checks this automatically, for example with `GET /health` every ~10 seconds. A red tool can't be run, and shows a short "Start the PC Helper on your PC" hint.

**4. The two-stage video pipeline:**
- **Stage 1, Prep:** pick a video → Clipper (cut detection, split long shots into parts of 5 seconds or less) → a sharp first-frame PNG per clip. The user then edits each PNG themselves to swap in their character.
- **Stage 2, Generate:** pick the folder of edited pairs → SCAIL-2 replacement per clip, **one at a time, in order** → join the results into **`<name>_final.mp4`** in a folder the user chooses.
- Stage 2 needs a progress animation and status messages. Reuse the app's `Loader` style (logo in a spinning ring) and add per-clip rows: waiting → working → done/failed, the current clip, and elapsed time.

**5. File naming:** clips and pictures are `<original video name>_C01.mp4` + `<original video name>_C01.png`, then `_C02`, `_C03`, and so on.
- The user says it out loud as "C-O-1". The existing clipper writes **C + zero + 1** (`_C01`).
- **Match both** (`_C01` and `_CO1`) when reading a folder, and keep writing `_C01` unless the user says otherwise.
- A clip with no matching PNG, or a PNG with no clip, is listed and skipped, not an error.

## Suggested architecture (confirm with the user before building)

**PC Helper:** turn `my-tools/app.py` into the helper.
- Keep it **bound to 127.0.0.1 only**.
- Add `GET /health` → `{ok: true, version, tools: {downloader: true, clipper: true, scail: <ComfyUI reachable?>}}`.
- Allow the website to call it with CORS:
  - `Access-Control-Allow-Origin: https://ai-mios-dio.github.io` (and `http://localhost:8765` for local testing)
  - Answer preflights, including `Access-Control-Allow-Private-Network: true`, because Chrome's local-network rules require it
  - Keep the existing `X-My-Tools: 1` header check (a custom header forces a preflight, which acts as the CSRF guard)
- **cookies.txt must never be committed.** Keep the `.gitignore`.

**Website side:**
- Add a "PC tools" area: a Video group on the main menu with Downloader, Video Clipper, and Make Video (SCAIL-2).
- The tools reuse the wizard and call the helper with `fetch('http://127.0.0.1:5050/...')`.
- A helper address setting goes in Settings (default `http://127.0.0.1:5050`).

**Where the user can use the PC tools:**
- From a browser **on the PC itself**, this works directly.
- **From the phone** it can't reach `127.0.0.1`. That needs a secure tunnel (for example Tailscale Serve or a Cloudflare Tunnel, giving an `https://` address) **plus a secret token** checked by the helper. Plan this as a later step and explain the trade-offs to the user first.

**Folders and files:**
- When the website runs on the PC, the helper can open native pickers (`pick_path`, tkinter) and read and write folders directly. Prefer this: no big uploads.
- Remote use (phone) would need uploads and downloads instead. Later.

**SCAIL-2:** call `scail_gen.py` (or ComfyUI's API) from the helper as a background job, using the same `job` dict contract as `splitter.py` (`state`, `progress`, `count`, `total`, `phase`, `error`, cancel by `state = "cancelling"`). Join the clips with ffmpeg (the concat demuxer, re-encoding if the formats differ). `imageio-ffmpeg` already provides ffmpeg.

## Suggested order (one step at a time, show the user after each)

1. Read everything: this file, `my-tools/HANDOFF.md`, and both SCAIL files. Summarize back to the user in a few lines: what you understood, where things left off, and the open questions. **Wait for a go-ahead.**
2. Get `my-tools/` into the default branch's working copy, unchanged. Check it still starts and works on the PC.
3. Add `/health` and CORS to the helper, and the green/red indicator on the website (start with a single "PC Helper: connected" dot in Settings).
4. Build Video Clipper as a wizard tool in the website, calling the helper.
5. Build the Downloader the same way.
6. Build Make Video (SCAIL-2 Stage 2: folder → per-clip generation → `_final.mp4`) with the progress screen.
7. Test on the user's real files, fix, then update the READMEs and push to GitHub.
8. Later, if wanted: phone access through a secure tunnel plus a token.

## Open questions

- Does Pages deploy from `ccr-109790b3-opjx0y`? And is the address exactly `https://ai-mios-dio.github.io/Ai-Character-Studio/`? (Needed for the CORS allowed origin.)
- SCAIL-2 details: everything in the two `scail_api` files (inputs, settings, output names, run time per clip, VRAM limits). Also whether to call `scail_gen.py` or the ComfyUI API directly.
- Clip length: the user said "no longer than 4 seconds" earlier and "5 seconds or less" now. Confirm which, or make it a setting (the clipper already has a "longest clip" setting).
- Where Stage 2 results go: the user picks the output folder for `<name>_final.mp4`. Should the per-clip results also be kept, and where?
- Phone access to PC tools (tunnel) now or later.
- Clipper output subfolder `<video> - clips`: keep it?
