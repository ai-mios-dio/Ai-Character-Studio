# My Tools

A small set of tools that runs on your own computer, in your browser. Only your own computer can open the page.

| Tool | What it does |
|---|---|
| **Downloader** | Paste a link from YouTube (including Shorts), Instagram, TikTok, X/Twitter, Reddit, Pinterest and [many](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md) [more](https://github.com/mikf/gallery-dl/blob/master/docs/supportedsites.md). Click **Find media** to see what's in it, then save videos as **MP4** or **MP3**, pictures as-is, or a whole album as one **ZIP**. |
| **Video Clipper** | Pick a video on your computer and save a full-quality screenshot every few seconds (you choose how many) into a folder you choose. |

Only download things you have the right to save, like your own posts or ones shared with permission.

## One-time setup: install Python

Python is the programming language these tools are written in. You only install it once.

1. Go to <https://www.python.org/downloads/> and click the big yellow **Download Python** button.
2. Open the file you downloaded and install it.
   - **Windows:** on the first installer screen, tick **"Add python.exe to PATH"** before clicking *Install Now*. This step is important.
   - **Mac:** click through the installer normally.

## Get the tools onto your computer

1. On GitHub, open this repository and switch to the branch with this folder (the branch menu is above the file list).
2. Click the green **Code** button, then **Download ZIP**.
3. Unzip it and open the `my-tools` folder.

## Start it

- **Windows:** double-click `start-windows.bat`.
  - If a blue *"Windows protected your PC"* box appears, click **More info**, then **Run anyway**.
- **Mac:** double-click `start-mac.command`.
  - If macOS says it can't be opened, **right-click** the file, choose **Open**, then **Open** again.
  - If that doesn't work, open the **Terminal** app, type `bash ` (with a space), drag the file into the window, and press Enter.

A window full of text opens (the "command window"). The first time, it spends a minute setting things up. Then your browser opens the home page at **http://localhost:5050**.

- **Keep the command window open** while you use the tools. Close it when you're done.
- A red line saying *"This is a development server"* is normal. You can ignore it.
- Each time you start it, it updates itself automatically. That keeps downloads working when websites change.

## Using the Downloader

1. Paste a link and click **Find media**.
2. You'll see everything in that link:
   - **Video:** choose **MP4** (video) or **MP3** (just the audio).
   - **Picture:** click **Download picture**. You get the original file, at full quality.
   - **Album or post with several items:** download items one by one, or click **Download all (ZIP)**.
3. The file lands in your browser's normal **Downloads** folder.

**Private or login-only posts** (very common on Instagram): open **Use my logins**, pick the browser you're logged in with, and click **Find media** again. It borrows that browser's login, so you never type a password here. Firefox works most reliably. If you get an error, close that browser fully and try again.

## Using the Video Clipper

1. **Video:** click **Choose video…** and pick a video file. It shows the video's size and length.
2. **Take a screenshot every:** type a number of seconds, like `5`. Decimals like `0.5` work too.
3. **Image type:** **PNG** keeps every detail (no quality loss, bigger files). **JPG** is the highest JPG quality, with smaller files.
4. **Save to:** click **Choose folder…**. It remembers your choice for next time.
5. Click **Run**. You'll see a progress bar, and you can **Cancel** at any time.

Each run makes a new folder inside your chosen folder, like `My Video - every 5s`, so nothing gets overwritten. Each screenshot is named after the moment it shows, like `My Video 00-01-05.png` (1 minute 5 seconds). Screenshots are the video's real frames at its full resolution.

The "Choose…" windows sometimes open **behind** your browser. If nothing seems to happen, check your taskbar or Dock. You can also paste a path into the box instead.

## If something goes wrong

| Problem | Try this |
|---|---|
| "Python isn't installed" | Do the setup step above. On Windows, reinstall and tick **Add python.exe to PATH**. |
| A link fails | The post may be private or login-only. Try **Use my logins**. Try another link to check the tool itself works. |
| Downloads suddenly stop working for a site | Close the command window and start the tools again. They update themselves on each start. |
| The page doesn't open | Open your browser yourself and go to `http://localhost:5050`. |

## What's inside (for when you're curious)

| File | What it does |
|---|---|
| `app.py` | Starts the small web server and shows the home page. |
| `downloader.py` | The Downloader. **gallery-dl** handles posts, pictures and albums, and **yt-dlp** handles videos. |
| `clipper.py` | The Video Clipper. It asks **ffmpeg** to save one frame every few seconds. |
| `shared.py` | Helpers both tools use: ffmpeg, the "Choose…" windows, and reading a video's length. |
| `templates/` | The pages you see in your browser. `static/style.css` is how they look. |
| `requirements.txt` | The tools Python installs for you: **Flask** (web server), **yt-dlp**, **gallery-dl**, and **imageio-ffmpeg** (a built-in copy of ffmpeg). |
| `start-windows.bat` / `start-mac.command` | Double-click launchers that set everything up and start the tools. |
