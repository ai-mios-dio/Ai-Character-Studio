# AI Image Studio

A web app for creating consistent characters, places and scenes with Google's Nano Banana image models. Everything runs in your browser, so there's nothing to install.

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

## How it's organised

The main page has three big buttons:

- **Characters**: every character tool (builders, Sheets (Character Sheet and Outfit Sheet), background, outfit, pose, makeup, edit, character scene), Saved Characters and the Pose Cutter.
- **Places**: Place Builder, Place Sheet and Saved Places. A place is like a character for locations (a bedroom, a café…), so it looks the same every time.
- **Create a Scene**: pick up to two saved characters and a saved place, describe what's happening, and get one image with everyone and everything consistent.

## Places

| Tool | You give it | What you get |
|---|---|---|
| **Place Builder** | A description, reference photos, or both, plus optional type, style and time of day | One wide, empty establishing shot of the place (16:9) |
| **Place Sheet** | A picture of the place | A **views sheet** (2×2 grid: from the entrance, the reverse angle, left wall, right wall, 16:9) and a **details sheet** (3×3 close-ups of furniture, objects and materials, 4:3), with **Save both as a place** |
| **Place from Video** | A walk-around video of a room (the app pulls 12 frames and keeps the sharpest 10; tap to change), plus an optional room description (type it or tap **Describe the room with AI**) | The same views and details sheets, made from real angles of the room, with **Save both as a place** |
| **Saved Places** | A name + views sheet and/or details sheet, plus an optional room description | A saved place to pick in Create a Scene |

Workflow: **Place Builder → Send to… → Place Sheet → Save both as a place → Create a Scene**, or for a real room: **Place from Video → Save both as a place → Create a Scene**.

**Room descriptions** (wall by wall: what's on each wall, colours, materials, lighting) are saved with the place and sent with it in every Create a Scene, which helps keep things in the same positions. Filming tips: walk slowly around the edge of the room facing inward, film each wall and corner at chest height, good light, no people, 30–60 seconds. On-screen captions and stickers are ignored. If an iPhone video won't open, set **Settings → Camera → Formats → Most Compatible**.

## Create a Scene

Pick **Character 1**, optionally **Character 2**, and a **Place** from your saved ones, choose a **Shot** (optional) and describe **What's happening?**. Each saved item's sheets are sent under its own name, and the prompt keeps each character's identity separate and the place's layout, furniture and decor exactly the same.

For each character you can also pick:

- **Outfit**: *As on their body sheet*, or one of that character's saved outfits. With an outfit picked, its sheet is sent instead of their body sheet (it already shows their body in the right clothes), together with their face sheet, which keeps the face exact because its close-ups show more detail than the small faces on a full-body sheet.
- **Pose**: one of 23 ready-made poses (Standing, Walking & candid, Sitting, Lying down, Low poses, Selfies & close-ups), with its description shown under the dropdown.

With two characters, **Pose together** offers 11 poses for two people (walking holding hands, hug from behind, foreheads touching…). An optional **Pose picture** copies the pose from a photo, and **Pose picture is for** says whether it applies to Character 1, Character 2 or both people. A pose picture overrides the pose dropdown for that character. Only the pose is copied from it: never the face, body, clothes or background.

The poses come from Instagram posing guides and photographers' tips (Shotkit, Clipping World, Photo Technolabs, PhotoWorkout, Madeline Hegedus, The Next Trip, The Knot, Jasmine Alley). They live in `js/catalog.js` (`POSES` and `DUO_POSES`), so you can add your own.

### Outfits

Each saved character can have any number of outfits, and each outfit is its own full-body sheet of that character wearing it. To make one:

1. **Outfit** tool: put the character in the new outfit.
2. **Send to… → Outfit Sheet › Character in the outfit**.
3. In **Outfit Sheet**, pick the saved character (their sheets keep the face and body exact) and tap Run. You get one full-body sheet (front, 3/4, side, back), with no face close-ups or expressions.
4. **Save as an outfit**: the character is already chosen; type the outfit name.

You can also upload an outfit sheet under **Outfits** on the character's card in **Saved Characters**, where you can delete outfits too.

## Character tools

| Tool | You upload | What you get |
|---|---|---|
| **Character Builder → Build from Parts** | Inspiration pictures for face, upper body, lower body and/or hair, each with its own Loose / Balanced / Close setting | One new, original full-body character that blends them naturally |
| **Character Builder → Build from People** | Several pictures of people with the look you want, plus Face and Body proportions similarity (Loose / Balanced / Close) | One new character with the features and proportions they have in common |
| **Character Builder → Build from Description** | No pictures: pick gender, age, body type, height, ethnicity and skin tone (or leave on Any), plus optional extra details | One new character matching your choices |
| **Sheets → Character Sheet** | A character reference | Two sheets: a **body sheet** (front, 3/4, side, back at 16:9) and a **face sheet** (12 close-ups and expressions at 4:3) |
| **Sheets → Outfit Sheet** | A saved character + a picture of them in a new outfit | One full-body sheet of that outfit (no expressions), with **Save as an outfit** |
| **Background → Background from Picture** | A background + a character (photo or sheet) | The same character placed in that setting |
| **Background → Replace Person in Scene** | A scene with a person + your character (photo, sheet or saved), outfit choice, and optionally which person | The scene with that person replaced by your character, same pose and expression |
| **Outfit → Outfit from Picture** | A character (photo or sheet) + an outfit picture, plus optional Outfit notes | The same character wearing that exact outfit |
| **Outfit → Outfit Gallery** | A character + a tap on one of 34 ready-made outfit tiles (8 categories) | The same character in that outfit |
| **Outfit → Outfit from Description** | A character + your own description of an outfit or style | The same character in the outfit you described |
| **Pose** | A character (photo or sheet) + a pose reference | The same character in that pose, with the same facial expression |
| **Makeup** | A character + one of 21 makeup styles (Latina, Douyin, Siren Eyes, Old Hollywood…), plus optional notes | The same character with that makeup, everything else unchanged |
| **Edit** | A picture + what should change (quick-tap suggestions like Remove shoes, Add necklace, Remove jewelry), plus an optional picture of a specific item | The same picture with only that change |
| **Character Scene** | A character (photo or sheet) + a text request | One new image of that single character |
| **Characters** | A name + a body sheet and/or face sheet | A saved character you can pick in the other tools |
| **Pose Cutter** | One or more character sheets | Each pose/expression as its own PNG (runs on your device, no API) |

The home screen has one big button per tool, with **Settings** at the bottom. Each button opens that tool on its own page (use **← Back** or your phone's back button to return).

Wherever a tool asks for a **Character**, you can upload either a single photo or a character sheet. The hidden prompt explains both cases to the model, so a sheet is always treated as one person.

### Saved characters

Open **Characters** from the home screen to save a character (a name plus their body sheet, face sheet, or both), or tap **Save both as a character** under a Character Sheet result. When you pick a saved character in a tool, all of their sheets are sent. Characters are stored in this browser on this device.

Background, Outfit, Pose and Character Scene have one **Character** box with a saved-character dropdown and two uploads side by side:

- **Saved character** (or an uploaded **Character sheet**) on its own: the sheet is used as the character.
- **Character reference** on its own: that photo is the character.
- **Both:** the reference gives the outfit and look, and the sheet keeps the face and body exact.

Every AI tool has:

- **Model**: a dropdown of the image models your key can use, with quick settings underneath (Ratio, Size, Thinking; only the ones the model supports). The ⚙ gear opens the rest: images per run, temperature, seed, Google Search and more. Anything left on *Auto*/*Default* isn't sent, so the model uses its own default.
- **Hidden prompt**: the prompt sent with your images. All of them are in **Settings → Hidden prompts**: tap one, edit it, and tap **Save prompt**. **Reset to default** brings back the original.
- **Clear & start fresh** empties the uploads, text and results, and resets dropdowns and the chosen tile (your model and options stay).
- **Leaving a page** clears its uploads, typed text and results automatically, so pages don't fill up. Your choices (model, settings, dropdowns, chosen outfit tile) are kept. Download or save anything you want to keep before leaving.
- **Edit this picture** on each result opens it in the Edit tool, ready for the next change. On the Edit page this chains edits: each result can be edited again.
- **Send to…** on each result, to pass the image straight into another tool (e.g. Character Sheet → Character Scene or Pose Cutter). It replaces whatever was in that box.

## When a picture is blocked

The error message says which filter stopped it:

- **Adjustable filter:** change it in **Settings → Safety filter** (Google default, Strict, Standard, Relaxed, or Off). This applies to every tool.
- **Fixed filter / content rules:** Google's own limits, which no app or setting can change. Describing an outfit in plain fashion terms in **Outfit notes** can help when a harmless request was misread. Photos of real people are filtered more strictly than original characters made with the Character Builder.

## Making a new character

1. **Character Builder**: choose **Build from Parts** (a different picture for face, upper body, lower body, hair) **Build from People** (several people with the look you want; the character gets what they have in common), or **Build from Description** (no pictures; pick from dropdowns). In Build from Parts, choose how closely to follow each part. Loose takes only the general idea, Balanced keeps the main traits, Close follows the picture closely. Tip: set **Images per run** to 2–4 under ⚙ to get several versions to pick from.
2. **Send to… → Character Sheet › Character reference**, then create the body and face sheets.
3. **Save both as a character**, and pick them in any tool from then on.

## Makeup styles and gallery outfits

Both lists live in `js/catalog.js`. Each entry has a name and a detailed description that the AI follows; add or edit entries there. In the **Outfit Gallery**, tap **Create example pictures** once to fill the tiles: it makes one picture per outfit on a plain mannequin (one API call each) and saves them on this device.

## Character sheet tips

- Make sheets at **Size: 4K** so every panel keeps its detail.
- The body sheet (16:9) and face sheet (4:3) set their own ratio, so the Ratio setting is hidden for this tool.
- Each sheet has its own hidden prompt in **Settings → Hidden prompts**.

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
- `js/catalog.js`: makeup styles, Outfit Gallery outfits and Create a Scene poses
- `js/models.js`: loads the model list and knows each model's image options
- `js/tool-ui.js`: builds each tool's section on the page
- `js/gemini.js`: sends requests to the Gemini API
- `js/cutter.js`: detects and cuts out figures
- `js/storage.js`: saves your key, choices, and edited prompts in the browser
- `js/app.js`: menu, Settings, Pose Cutter, start-up
