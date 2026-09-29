# Character Studio

A small web app for character creation tools. Everything runs in your browser, so there's nothing to install.

## How to open it

1. Download this repository (green **Code** button → **Download ZIP**) and unzip it.
2. Double-click `index.html`. It opens in your browser.

## First-time setup

1. Get a Gemini API key at <https://aistudio.google.com/apikey>.
2. In the app, open **Settings**, paste the key, and click **Save settings**.
   The key is stored only in your browser. Never put it in a file you upload to GitHub.

## The sections

| Section | What it does |
|---|---|
| **Character Sheet** | Upload reference image(s), pick a saved prompt, add optional details, and generate a sheet with Nano Banana 2 (`gemini-3.1-flash-image-preview`). Results can be downloaded or sent straight to the Pose Cutter. |
| **Pose Cutter** | Upload one or many character sheets. Each separate pose/expression is detected, cut out, and saved as its own PNG (6 poses in → 6 images out). Download them one by one or all together as a `.zip`. |
| **Prompt Library** | Save your predetermined prompts. Put `{details}` in a prompt to choose where the "Extra details" text is inserted. |
| **Settings** | API key and model ID. |

## Pose Cutter tips

The cutter works best when figures sit on a plain background with a little space between them.
If results look wrong, open **Detection settings**:

- **Too many pieces** (a hand or weapon cut out on its own) → raise *Merge distance*.
- **Two poses stuck together** → lower *Merge distance*.
- **Labels or text showing up** → raise *Minimum size*.
- **Background left around the figure** → raise *Background tolerance*.
- **Pale parts of the character disappearing** → lower *Background tolerance*.

## Files

- `index.html`: the page layout
- `css/style.css`: colors and styling
- `js/app.js`: connects buttons to actions
- `js/gemini.js`: talks to the Gemini API
- `js/cutter.js`: detects and cuts out figures
- `js/storage.js`: saves settings and prompts in the browser (the default prompt lives here)
