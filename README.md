# Character Studio

A small web app of character creation tools. Everything runs in your browser, so there's nothing to install.

## How to open it

**On a computer:** download this repository (green **Code** button → **Download ZIP**), unzip it, and double-click `index.html`.

**On a phone:** host it with GitHub Pages (see below), then open the link.

### GitHub Pages (use it from any device)

1. On GitHub, open the repository → **Settings** → **Pages**.
2. Under **Build and deployment**, set **Source** to *Deploy from a branch*, pick the branch, and choose the `/ (root)` folder. Tap **Save**.
3. After a minute or two, the page shows your link (e.g. `https://<your-name>.github.io/Character-sheets/`).

GitHub Pages is free for **public** repositories. A private repository needs a paid GitHub plan.
The code contains no secrets: your API key is typed into the app and stays in your browser.

## First-time setup

1. Get a Gemini API key at <https://aistudio.google.com/apikey>.
2. In the app, open **Settings**, paste the key, and tap **Save key & load models**.
   The app asks Google which image models your key can use and shows what each one supports.

## The tools

| Tool | You upload | What you get |
|---|---|---|
| **Character Sheet** | A character reference | A turnaround + expression sheet |
| **Background** | A background + a character (photo or sheet) | The same character placed in that setting |
| **Outfit** | A character (photo or sheet) + an outfit | The same character wearing that outfit |
| **Pose** | A character (photo or sheet) + a pose reference | The same character in that pose |
| **Character Scene** | A character (photo or sheet) + a text request | One new image of that single character |
| **Characters** | A name + a character sheet | A saved character you can pick in the other tools |
| **Pose Cutter** | One or more character sheets | Each pose/expression as its own PNG (runs on your device, no API) |

The home screen has one big button per tool, with **Settings** at the bottom. Each button opens that tool on its own page (use **← Back** or your phone's back button to return).

Wherever a tool asks for a **Character**, you can upload either a single photo or a character sheet. The hidden prompt explains both cases to the model, so a sheet is always treated as one person.

### Saved characters

Open **Characters** from the home screen to save a character (a name plus their character sheet), or tap **Save as character** under any Character Sheet result. Characters are stored in this browser on this device.

Background, Outfit, Pose and Character Scene have one **Character** box with a saved-character dropdown and two uploads side by side:

- **Saved character** (or an uploaded **Character sheet**) on its own: the sheet is used as the character.
- **Character reference** on its own: that photo is the character.
- **Both:** the reference gives the outfit and look, and the sheet keeps the face and body exact.

Every AI tool has:

- **Model**: a dropdown of the image models your key can use, with quick settings underneath (Ratio, Size, Thinking; only the ones the model supports). The ⚙ gear opens the rest: images per run, temperature, seed, Google Search and more. Anything left on *Auto*/*Default* isn't sent, so the model uses its own default.
- **Hidden prompt**: the prompt sent with your images. All of them are in **Settings → Hidden prompts**: tap one, edit it, and tap **Save prompt**. **Reset to default** brings back the original.
- **Clear & start fresh** empties the uploads, text and results (your model and options stay).
- **Send to…** on each result, to pass the image straight into another tool (e.g. Character Sheet → Character Scene or Pose Cutter).

## Pose Cutter tips

Works best when figures sit on a plain background with a little space between them. Open **Detection settings** if results look wrong:

- **Too many pieces** (a hand or weapon cut out on its own) → raise *Merge distance*.
- **Two poses stuck together** → lower *Merge distance*.
- **Labels or text showing up** → raise *Minimum size*.
- **Background left around the figure** → raise *Background tolerance*.
- **Pale parts of the character disappearing** → lower *Background tolerance*.

## Files

- `index.html`: the page layout
- `css/style.css`: colors and styling
- `js/tools.js`: **the AI tools and their hidden prompts**. Add a new tool by copying a block here.
- `js/models.js`: loads the model list and knows each model's image options
- `js/tool-ui.js`: builds each tool's section on the page
- `js/gemini.js`: sends requests to the Gemini API
- `js/cutter.js`: detects and cuts out figures
- `js/storage.js`: saves your key, choices, and edited prompts in the browser
- `js/app.js`: menu, Settings, Pose Cutter, start-up
