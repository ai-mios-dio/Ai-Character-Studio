# Video Downloader

A simple page that runs on your own computer. Paste a link from YouTube (including Shorts), Instagram, TikTok, X, or [over 1,000 other sites](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md), choose **MP4** (video) or **MP3** (audio), and click **Download**.

Only download videos you have the right to save, like your own or ones shared with permission.

## One-time setup: install Python

Python is the programming language this app is written in. You only install it once.

1. Go to <https://www.python.org/downloads/> and click the big yellow **Download Python** button.
2. Open the file you downloaded and install it.
   - **Windows:** on the first installer screen, tick **"Add python.exe to PATH"** before clicking *Install Now*. This step is important.
   - **Mac:** click through the installer normally.

## Get the app onto your computer

1. On GitHub, open this repository and switch to the branch with this folder (the branch menu is above the file list).
2. Click the green **Code** button, then **Download ZIP**.
3. Unzip it and open the `video-downloader` folder.

## Start it

- **Windows:** double-click `start-windows.bat`.
  - If a blue *"Windows protected your PC"* box appears, click **More info**, then **Run anyway**.
- **Mac:** double-click `start-mac.command`.
  - If macOS says it can't be opened, **right-click** the file, choose **Open**, then **Open** again.
  - If that doesn't work, open the **Terminal** app, type `bash ` (with a space), drag the file into the window, and press Enter.

A window full of text opens (the "command window"). The first time, it spends a minute setting things up. Then your browser opens the page at **http://localhost:5050**.

- **Keep the command window open** while you use the page. Close it when you're done.
- A red line saying *"This is a development server"* is normal. You can ignore it.
- Each time you start the app, it updates itself automatically. That keeps it working when sites change.

## If something goes wrong

| Problem | Try this |
|---|---|
| "Python isn't installed" | Do the setup step above. On Windows, reinstall and tick **Add python.exe to PATH**. |
| A download fails for one video | The video may be private, age-restricted, or login-only (common on Instagram). Try another link to check the app itself works. |
| Downloads suddenly stop working for a site | Close the command window and start the app again. It updates itself on each start. |
| The page doesn't open | Open your browser yourself and go to `http://localhost:5050`. |

## What's inside (for when you're curious)

| File | What it does |
|---|---|
| `app.py` | The small Python web server. It receives the link and asks **yt-dlp** to download it. |
| `templates/index.html` | The page you see in your browser. |
| `requirements.txt` | The list of tools Python installs for you: **Flask** (web server), **yt-dlp** (downloader), **imageio-ffmpeg** (a built-in copy of ffmpeg, which makes MP3s and joins video and audio). |
| `start-windows.bat` / `start-mac.command` | Double-click launchers that set everything up and start the app. |

The page only works on your own computer. Other people on your network or the internet can't reach it.
