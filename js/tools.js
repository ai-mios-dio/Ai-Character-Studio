// Every AI tool in Character Studio is described here.
// To add a new tool, copy one of these blocks and change it; the page builds itself from this list.
//
//   inputs:   the upload boxes. `tag` is how the images are labelled when sent to the model,
//             so the prompt can refer to e.g. "the CHARACTER image".
//   request:  if set, shows a text box you fill in; its text replaces {request} in the prompt.
//   prompt:   the hidden (but editable) default prompt.

// Shared wording so every tool protects the character's identity the same way.
const IDENTITY_LOCK =
  'IDENTITY LOCK: the character must remain exactly the same individual. Preserve precisely: ' +
  'face shape and every facial feature, skin tone and complexion, age, eye colour, eyebrows, hair (style, length, colour, hairline), ' +
  'body type, height, build, weight, and body proportions (head-to-body ratio, shoulder width, limb length, hands). ' +
  'Do not beautify, slim, bulk up, de-age, age, restyle, or reinterpret the character in any way.';


// Explains how to read the CHARACTER upload, which can be a single picture OR a character sheet.
// Each tool adds its own "if sheet / if single picture" instructions after this.
const CHARACTER_SOURCE =
`ABOUT THE CHARACTER IMAGE(S): first decide which of these two cases applies.
- CASE A, CHARACTER SHEET: the image is a turnaround / reference sheet with several panels, views, close-ups or expressions (there may be two: a full-body BODY sheet and a close-up FACE sheet). Every panel shows the SAME ONE individual from different angles. It is NOT a group of different people, and its grid layout is NOT the output format. Combine all panels to understand this one character: the full-body views (body sheet) for height, build, body proportions and outfit; the close-ups (face sheet) for the face.
- CASE B, SINGLE PICTURE: the image shows the character once. That picture is the reference for who they are.

EXTRA CHARACTER SHEET(S) (only if images labelled CHARACTER SHEET are also included; there may be a full-body BODY sheet and a close-up FACE sheet): they are additional references of the SAME character shown in the CHARACTER image, not a different person. It shows one individual in several panels, not a group. Use it ONLY to get the identity exactly right: face, facial features, skin tone, eye colour, height, build and body proportions. The character's look (outfit, hair styling, makeup, accessories) comes from the CHARACTER image, NEVER from the sheet: ignore the sheet's clothing, poses, expressions, background and layout. If the two images disagree on outfit or styling, the CHARACTER image wins. Everything the instructions below say about the CHARACTER image still refers to the CHARACTER image, not the sheet.`;

// Stops a person in the OUTFIT / POSE / BACKGROUND image from leaking their body shape into the character.
const BODY_GUARD =
`BODY PROPORTIONS COME ONLY FROM THE CHARACTER. Any other reference image (OUTFIT, POSE REFERENCE, BACKGROUND) may show a different person. That person's body is irrelevant: do NOT copy, blend in or average toward their height, build, weight, shoulder width, chest, waist, hips, limb length, leg length, torso length, neck, hand size or head size. Take the character's body only from the character references. If character sheets are provided (or the CHARACTER image is a sheet), the full-body front, side and back views are the authority for body proportions, and the face close-ups are the authority for the face.
PROPORTION CHECK before answering: compare your result with the character references. Head-to-body ratio, shoulder-to-hip ratio, leg-to-torso ratio and overall build must match the character exactly, not the other person. If they drift, correct them.`;

// Dropdown of your saved characters (see the Characters page).
//   Picked on its own: the saved sheet is used as the character.
//   Picked together with a Character photo: the photo gives the look, the sheet gives face and body.
const SAVED_CHARACTER = {
  key: 'sheet',
  type: 'saved',
  label: 'Character sheet',
  sendLabel: 'Character sheet',
  tag: 'CHARACTER SHEET',
  hint: 'Pick one of your characters. On its own it is used as the character. With a Character photo above, the photo gives the outfit and look, and the saved sheet keeps the face and body exact.',
};

// Every character in Character Studio is an original, AI-generated fictional adult.
// Stated in each prompt so the model has the right context. Keep it true: if you ever
// use a photo of a real person, edit this line out of that tool's prompt in Settings.
const FICTIONAL_CHARACTER =
  'CONTEXT: the character in these images is an original, AI-generated fictional adult character created for a drama story. It is not a real person and does not depict any real person.';

// For the Character Builder: describes the character being created (inspiration pictures could be anything).
const FICTIONAL_RESULT =
  'CONTEXT: the result is an original, fictional adult character for a drama story, not a real person.';

// For Places: the room or location is a fictional set.
const FICTIONAL_PLACE =
  'CONTEXT: this is set and location design for an original, fictional drama story. The place is fictional.';

// No people in place images (they are reusable sets).
const EMPTY_PLACE = 'The place is EMPTY: no people, no body parts, no reflections of people, no text, labels or watermark.';

// Used in every prompt: characters never have tattoos.
const NO_TATTOOS =
  'NO TATTOOS: the character has no tattoos anywhere (face, neck, chest, back, arms, hands, legs or feet). ' +
  'Do not add any. If a person in any other image (for example the person wearing the outfit, doing the pose, or used as inspiration) has tattoos, do not copy them: keep the character\'s skin plain. ' +
  'If the character\'s own reference shows tattoos, remove them and show clear, natural skin.';

// Shared ending: one image, one character, nothing extra.
const SINGLE_OUTPUT =
  'Output one single image that shows this character EXACTLY ONCE. Never a grid, panels, collage, turnaround, split screen or multiple copies of the character. ' +
  'No extra people, no text, no labels, no borders, no watermark.';

// Shared by both Character Builder tools: one seamless person, and the same kind of output image.
const BUILD_COHERENCE =
`ONE NATURAL PERSON, NOT A COLLAGE:
- The same skin tone and undertone across the face, neck, arms, hands and legs.
- One consistent apparent age for the whole body.
- Smooth, natural transitions at the neck, shoulders, waist and hips, with no visible joins or mismatched parts.
- Believable anatomy: head, torso and legs in realistic proportion to each other. Where the inspirations conflict (for example a slim upper body and a heavier lower body), blend them into one plausible build rather than joining two different bodies.
- Consistent lighting over the whole figure.`;

const BUILD_OUTPUT =
`OUTPUT: one photorealistic full-body image (unless the extra details ask for another style). Front view, head to feet fully in frame, standing upright in a relaxed neutral pose with arms slightly away from the body, neutral expression, looking at the camera. Simple fitted plain clothing in neutral colours (a plain fitted top and fitted shorts or leggings) so the body shape is clearly visible, barefoot or simple plain shoes. Plain white background, even studio lighting. No tattoos, no jewelery. Only this one character. No text or labels.

${NO_TATTOOS}`;

// Shared by the three outfit tools (from Picture, Gallery, Description): fit, exactness, framing.
const OUTFIT_RULES =
`FIT: tailor the clothes to fit the character's own body naturally, with realistic folds and drape. Never reshape the character to match the garment or anyone else.

REPRODUCE THE GARMENT EXACTLY AS DESIGNED: the same cut, neckline, neckline depth, hem length, leg cut, straps, cut-outs, sheerness and how much skin it shows. Do not make it more modest or more revealing than described: do not add or remove fabric, layers, linings or cover-ups, and do not change the style into a different garment.

POSE AND FRAMING:
- If CASE A (character sheet): show the character full body, standing in a relaxed front or 3/4 view like the sheet's main full-body view, with a neutral expression, on the same plain background style as the sheet, so the whole outfit is visible.
- If CASE B (single picture): keep the character's pose, facial expression, camera angle, framing, background and lighting from that picture, unless the outfit physically requires a tiny adjustment. If the picture does not show enough of the body for the outfit, widen the framing just enough to show it, extending the original background naturally.`;

// Place sheets: the same two prompts for Place Sheet (pictures) and Place from Video (frames).
// `source` says what the attached pictures are.
const PLACE_SOURCE_RULES =
`ROOM DESCRIPTION from the user (the source of truth for layout and details; follow it exactly if given): {request}

IGNORE anything that is not part of the room itself: on-screen text, captions, stickers, emojis, watermarks, app buttons, and any people. The pictures may be blurry, tilted or stretched by a phone's wide lens: show the room straight and undistorted.`;

const placeViewsPrompt = (source) =>
`${FICTIONAL_PLACE}

Using ${source}, generate a single location reference sheet (a set turnaround) of this exact place, on a white background.
Layout: a 2 x 2 grid of 4 equal landscape panels separated by thin white gaps:
Top left: wide view from the main entrance or doorway, looking into the space
Top right: reverse view from the opposite side, looking back toward the entrance
Bottom left: view toward the left wall
Bottom right: view toward the right wall
Every panel: eye level (about 1.5 m), wide-angle, the same lighting and time of day.

CONSISTENCY: it is the SAME place in every panel: identical architecture, room size and shape, layout, furniture pieces and their positions and sizes, materials, colours, decor, windows, doors and light sources. Anything seen in more than one panel must match exactly and sit in a consistent position. Parts not visible in the pictures: design them to match the place's style, and keep them consistent between panels.

${PLACE_SOURCE_RULES}

Photorealistic. ${EMPTY_PLACE}`;

const placeDetailsPrompt = (source) =>
`${FICTIONAL_PLACE}

Using ${source}, generate a single details reference sheet of this exact place, on a white background.
Layout: a 3 x 3 grid of 9 equal square close-up panels separated by thin white gaps, showing the place's most recognisable elements:
1. the main furniture piece (for example the bed or sofa), 2. a second furniture piece, 3. storage (wardrobe, shelves or cabinets),
4. the main table, desk or work surface with its objects, 5. a window with its curtains or blinds (or a mirror or door), 6. a light fixture, lamp or light strip,
7. decor (art, plants or personal objects), 8. textiles (bedding, rug or cushions), 9. a close-up of the floor and wall materials.
Choose the nine that best fit this place.

CONSISTENCY: every item must match the pictures exactly: same design, shape, colours, materials, pattern and condition. Consistent lighting in every panel.

${PLACE_SOURCE_RULES}

Photorealistic. ${EMPTY_PLACE}`;

// Used by "Describe the room with AI" (a regular Gemini text model, not an image model).
const ROOM_DESCRIBE_PROMPT =
`These pictures show ONE room (they may be frames from a walk-around video). Write a precise description of the room so an artist could recreate it consistently from any angle. Use exactly these sections, one paragraph each:
The Left Wall: ...
The Back Wall: ...
The Right Wall: ...
The Entrance / Front Wall: ... (skip it if it is never visible)
Architecture and Lighting: floor, walls, ceiling, windows, doors, and every light source with its colour.
Treat "left", "back" and "right" as seen when standing at the entrance looking in. For every item give its position (which wall; left, centre or right; next to which other item), colour, material, size and style, and include small decor. Ignore people, on-screen text, captions, stickers and emojis. Plain text only: no introduction and no other headings.`;

const ROOM_DESCRIPTION_REQUEST = {
  label: 'Room description',
  optional: true,
  hint: 'Wall by wall: what is on each wall, colours, materials, lighting. It is saved with the place and used in every scene. Tap the button to let AI write it from the pictures, then fix anything wrong.',
  placeholder: 'The Left Wall: a bed with a thick white blanket… The Back Wall: a white vanity desk with an LED mirror… The Right Wall: … Architecture and Lighting: …',
  aiPrompt: ROOM_DESCRIBE_PROMPT,
};

// Create a Scene: the camera spots match the 4 panels of a Place Sheet's VIEWS sheet.
const PLACE_VIEWS = [
  { name: 'From the entrance', panel: 'top-left', desc: 'Camera at the main entrance or doorway, looking into the room.' },
  { name: 'From the far side, facing the entrance', panel: 'top-right', desc: 'Camera on the opposite side of the room, looking back toward the entrance.' },
  { name: 'Facing the left wall', panel: 'bottom-left', desc: 'Camera looking toward the left wall (left as seen from the entrance).' },
  { name: 'Facing the right wall', panel: 'bottom-right', desc: 'Camera looking toward the right wall (right as seen from the entrance).' },
];

// Create a Scene, "Words only": turns a pose photo into a description, so the person in it is never sent.
const POSE_DESCRIBE_PROMPT =
`Describe ONLY the body pose in this photo, precisely enough that an artist could recreate it with a completely different person. For each person in the photo (if there are two, describe the one on the left first, and how they touch or hold each other): which way the body faces and the camera angle to them; standing, sitting, kneeling or lying; head tilt and turn and where the eyes look; the facial expression; torso lean and twist; each arm, elbow, wrist and hand (what the hands rest on or hold); each leg, knee and foot; where the weight is. Say left and right from the viewer's side.
Do NOT describe the person themselves: no face, hair, skin, body shape, age, clothing, shoes, accessories, background, props or lighting. Plain text, one short paragraph per person, no headings or lists.`;

// Character Sheet: more than one reference picture of the same person.
const MULTI_REFERENCE =
`SEVERAL REFERENCE IMAGES (labelled 1 of N, 2 of N…): they all show this same one fictional character. Treat them as equally important (the order does not matter) and combine them into one consistent design: details that stay the same across the images define the character. Use the outfit from the image that shows it most completely. Do not reproduce any single reference photo's pose, crop, lighting or background.`;

// Build from People (and Inspired Character Sheet, step 1): a new character from what several people share.
const blendFill = ({ closeness }) => {
      const how = {
        loose: 'LOOSELY similar: capture the general type and overall impression they share, and invent the specifics freely.',
        balanced: 'CLEARLY similar: share the main traits they have in common, like someone of the same type or family, while being a different person.',
        close: 'VERY similar: closely match the features and proportions they share, while still being a distinct new individual and not any one of them.',
      };
      return { faceHow: how[closeness.face || 'balanced'], bodyHow: how[closeness.body || 'balanced'] };
    };
const BLEND_PROMPT =
`${FICTIONAL_RESULT}

Design ONE new, original character and show them in a single full-body image.

The INSPIRATION PEOPLE images show several DIFFERENT people who share the kind of look wanted. Study them together and work out what they have in COMMON, then create a new person who clearly belongs to the same type. They are labelled 1 of N, 2 of N…; all are equally important and the order means nothing, so do not favour image 1.

FACE: {faceHow}
Look at the shared face shape, eye shape and spacing, eyebrows, nose, lips, jawline, cheekbones, skin tone and complexion, and apparent age range.

BODY PROPORTIONS: {bodyHow}
Look at the shared height impression, build, shoulder-to-hip ratio, waist, chest, leg length, torso length, and how muscle and fat are distributed.

Where the inspiration people differ, use the most typical version or a natural middle ground. The result must NOT be a copy of any single inspiration person, and must not look like one of them with small changes. Ignore their clothing, accessories, poses, backgrounds and image styles.

${BUILD_COHERENCE}

EXTRA DETAILS (follow these if given): {request}

${BUILD_OUTPUT}`;

// Character Sheet prompts (also used by Inspired Character Sheet, step 2).
// Sheets only: stops the "doll" / mannequin look (plastic skin, blank eyes) without changing who they are.
const NATURAL_LOOK =
`LOOK LIKE A REAL PERSON, NOT A DOLL: this must look like an unretouched photo of a real actor at a costume fitting, not a doll, mannequin, wax figure or 3D render.
- Skin: real skin texture with visible pores, fine lines, slight natural unevenness in tone, a little natural shine; no airbrushed, plastic or porcelain skin.
- Face: natural slight asymmetry; eyes with life (natural moisture, catchlights, relaxed lids), not glassy or staring; natural lips with texture.
- Expression (where a calm one is asked for): relaxed and alive, as if caught between words: soft jaw, lips gently closed or barely parted, a hint of warmth in the eyes. Not a blank, frozen or empty stare, and not a posed smile.
- Hair: real strands with a few natural flyaways, not a helmet or wig.
- Body: natural relaxed posture with a slight weight shift, relaxed hands with natural finger curl, real fabric wrinkles.
- Light: soft photographic studio light with natural shadows, true-to-life colours; no over-smoothing, glow or beauty filter.
These are photographic qualities only: keep the character's face, features, skin tone and body exactly as in the reference.`;

const SHEET_BODY_PROMPT =
`${FICTIONAL_CHARACTER}

{multiRef}Using the attached image(s) as the character reference, generate a single full-body character turnaround sheet on a plain white background. Keep the character's face, hair, outfit, and proportions exactly consistent across every view. Photorealistic. No tattoos, no jewelery.
Layout: one row of 4 full-body views, evenly spaced, left to right:
Front view, facing camera
3/4 front view
Right side profile
Back view
In every view: standing upright in a relaxed natural pose, arms relaxed and held slightly away from the body so the body outline is clearly visible, calm natural expression, whole body from head to feet in frame with nothing cropped.
All four figures at exactly the same scale: feet on the same ground line and the top of the head at the same height, so body proportions can be compared between views.
Each view should be clearly separated with consistent lighting and the same neutral background. Only this one character. No text or labels.

${NATURAL_LOOK}

${NO_TATTOOS}`;
const SHEET_FACE_PROMPT =
`${FICTIONAL_CHARACTER}

{multiRef}Using the attached image(s) as the character reference, generate a single face and expression reference sheet on a plain white background. Keep the character's face, facial features, skin, hair, and proportions exactly consistent across every panel. Photorealistic. No tattoos, no jewelery.
Layout as a grid of 12 equal square panels, 4 across and 3 down, each showing the head and shoulders at the same size:
Row 1: close-up of face, front angle (calm, relaxed natural expression); 3/4 view facing right; right side profile; back of the head (showing the hairstyle)
Row 2: 3/4 view facing left; close-up of face, low angle (looking up at character); close-up of face, high angle (looking down at character); smiling
Row 3: angry; crying; shocked; smug/smirking
Each panel should be clearly separated with consistent lighting and the same neutral background. Only this one character. No text or labels.

The expressions (smiling, angry, crying, shocked, smug) must look like a real actor genuinely feeling them: a smile that reaches the eyes with slight crinkles, tension in the brow and jaw for anger, wet eyes and reddened skin for crying. The same face in every panel.

${NATURAL_LOOK}

${NO_TATTOOS}`;

// Swap an Item: what can be swapped, plus rules specific to each kind of item.
const SWAP_ITEMS = [
  { name: 'Shoes', what: 'shoes', hint: 'Both feet get the new pair.', rules: 'Both feet wear the new shoes as a matching pair. Keep socks or bare feet as they were unless the notes say otherwise; the heel height changes only as much as the new shoes require, and the stance stays natural.' },
  { name: 'Bag', what: 'bag', hint: 'Held or worn the same way as before (or naturally, if they had none).', rules: 'Carry the new bag the same way as the old one (in the hand, on the shoulder, crossbody). If there was no bag, add it in the most natural way for the pose.' },
  { name: 'Jacket or coat', what: 'jacket or coat', hint: 'Worn over the rest of the outfit.', rules: 'Wear it over the existing top the same way (open or closed) the reference shows; the clothes underneath stay the same where visible.' },
  { name: 'Top', what: 'top (shirt, blouse, sweater or T-shirt)', hint: 'Only the upper garment changes.', rules: 'Only the upper-body garment changes; bottoms, shoes and outer layers stay. Keep the tuck (tucked in or out) as the reference shows it.' },
  { name: 'Bottoms', what: 'bottoms (trousers, jeans, skirt or shorts)', hint: 'Only the lower garment changes.', rules: 'Only the lower-body garment changes; the top, shoes and outer layers stay.' },
  { name: 'Dress', what: 'dress', hint: 'Replaces the top and bottoms.', rules: 'The new dress replaces the current top and bottoms; shoes, outer layers and accessories stay unless the notes say otherwise.' },
  { name: 'Hat', what: 'hat or headwear', hint: 'Sits naturally on their own hair.', rules: 'Place it on the character\'s own head and hair at a natural angle; the hairstyle stays, adjusted only where the hat sits.' },
  { name: 'Glasses', what: 'glasses or sunglasses', hint: 'Fitted to their own face.', rules: 'Fit them to the character\'s own face and eyes; never change the face to fit the glasses.' },
  { name: 'Jewelry', what: 'jewelry (necklace, earrings, bracelet, rings or watch shown in the reference)', hint: 'Only the pieces shown in the picture.', rules: 'Add or replace only the pieces shown in the reference, in the matching place on the body (neck, ears, wrist, fingers).' },
  { name: 'Hairstyle', what: 'hairstyle', hint: 'Cut, length, colour and styling; the face stays theirs.', rules: 'Copy the haircut, length, volume, texture, parting, colour and styling. The face, hairline shape, skin and all facial features stay exactly the character\'s own.' },
  { name: 'Other', what: 'item shown in the ITEM REFERENCE (see the notes for what it is)', hint: 'Say what it is in the notes.', rules: 'Work out which item it is from the reference and the notes, and replace only that.' },
];

// Scene Sheet: one moment (character + pose + place) seen from 3 camera positions in one image.
const SCENE_ANGLES_PROMPT =
`${FICTIONAL_CHARACTER} The place is a fictional set.

The SCENE REFERENCE image shows the character in a pose in a place. Create ONE image that shows this EXACT same moment from 3 different camera positions, like a film crew photographing one frozen moment from around the set.

LAYOUT: {layout}:
{views}
Every panel shows the whole character (head to feet) at the same size, with the surroundings around them. No text, labels, numbers, arrows or borders other than the thin gaps.

SAME MOMENT IN EVERY PANEL:
- POSE: exactly the pose from the SCENE REFERENCE, frozen: the same position of the head, arms, hands, legs and feet, the same weight and balance, the same facial expression and gaze direction. Seen from a new angle, the pose must be the same 3D pose, not a new pose. Where a limb is hidden in the reference, continue it naturally.
- CHARACTER: the same person, face, hair, body proportions, outfit, shoes, accessories and anything they hold, exactly as in the SCENE REFERENCE.
- PLACE: the same location, furniture, objects, walls, floor and decor as in the SCENE REFERENCE, each in the same position relative to the character, seen from each new camera position. Parts of the place that the reference does not show (for example behind the camera) must be designed to match its style, materials and colours, and stay consistent between panels.
- LIGHT: the same light sources, direction, colour and time of day; shadows fall the same way in the world, so they look different from each camera position.

CHARACTER SHEET (only if images labelled CHARACTER SHEET are included): they show this same character from other angles. Use them ONLY to get the face, hair (for example the back of the hairstyle) and body proportions right from the sides the SCENE REFERENCE does not show. Pose, outfit, props, place and lighting come from the SCENE REFERENCE, never from the sheet.
THE RESULT IS BUILT FROM THE SCENE REFERENCE: every panel shows the moment and the place from the SCENE REFERENCE. Never copy the CHARACTER SHEET's plain white background, its standing neutral pose, its outfit (if it differs) or its layout; the sheets are only a guide to what the person looks like.

${IDENTITY_LOCK}

Photorealistic, matching the style of the SCENE REFERENCE. Only this one character (plus anyone else already in the SCENE REFERENCE, in their same positions).

NOTES (follow these if given): {request}

${NO_TATTOOS}`;

// Added to the end of EVERY prompt when it is sent (see buildPrompt in tool-ui.js), including prompts
// edited in Settings. Stops the model inventing small props and duplicates (e.g. two coffee cups on
// a table that wasn't in view). Tools that design a place from a description set allowExtras.
const NO_EXTRAS =
`NO INVENTED EXTRAS: do not add objects, props, animals or people that are not in the reference images and not asked for in these instructions (including the request). In particular, no small props such as cups, mugs, drinks, food, plates, phones, books, magazines, bags, bottles, candles, plants, flowers, vases, pillows, decorations or clutter. Never duplicate an object or show two of something where the references show one. If the image must show an area the references do not show (for example from a new camera angle), fill it with the simplest plausible continuation of the place: plain walls and floor, and only furniture that matches the place, with its surfaces left clear and empty.`;

const TOOLS = [
  {
    id: 'builder',
    title: 'Build from Parts',
    group: 'builder', // opened from the Character Builder menu, not the home screen
    menuText: 'Face, upper body, lower body and hair from different pictures',
    intro: 'Design a new character from inspiration pictures. Add any of the parts below, choose how closely to follow each one, and tap Run.',
    inputs: [
      { key: 'face', label: 'Face', tag: 'FACE INSPIRATION', optional: true, closeness: true },
      { key: 'upper', label: 'Upper body', tag: 'UPPER BODY INSPIRATION', optional: true, closeness: true },
      { key: 'lower', label: 'Lower body', tag: 'LOWER BODY INSPIRATION', optional: true, closeness: true },
      { key: 'hair', label: 'Hair', tag: 'HAIR INSPIRATION', optional: true, closeness: true },
    ],
    requireAny: 'Add at least one inspiration picture (face, upper body, lower body or hair).',
    request: { label: 'Extra details', optional: true, placeholder: 'e.g. late 20s, athletic, warm olive skin, confident look' },
    runLabel: 'Build character',
    defaultOptions: { aspectRatio: '2:3' }, // tall frame for a full-body figure
    // Writes the {parts} section: only the parts you uploaded, each with its own closeness.
    fill: ({ has, closeness }) => {
      const what = {
        face: 'face shape and facial features (eyes, eyebrows, nose, lips, jaw, cheekbones), skin tone and complexion',
        upper: 'upper-body build: shoulders, chest, arms, torso shape, and how muscle and fat are distributed',
        lower: 'lower-body build: waist, hips, buttocks, thighs, leg shape and leg length',
        hair: 'hairstyle, length, texture and colour',
      };
      const how = {
        loose: 'LOOSE INSPIRATION. Take only the general impression (overall type, rough shape, colouring and vibe) and invent the specific details freely, so the result is clearly different from the reference.',
        balanced: 'BALANCED. Keep the main recognisable characteristics, but reinterpret the finer details so it becomes part of a new person.',
        close: 'CLOSE MATCH. Follow this reference closely in shape, proportions and details.',
      };
      const names = { face: 'FACE', upper: 'UPPER BODY', lower: 'LOWER BODY', hair: 'HAIR' };
      const lines = Object.keys(what).filter((k) => has[k]).map((k) =>
        `- ${names[k]} (from the ${names[k]} INSPIRATION image): ${what[k]}. How closely: ${how[closeness[k] || 'balanced']}`);
      const missing = Object.keys(what).filter((k) => !has[k]).map((k) => names[k].toLowerCase());
      if (missing.length) lines.push(`- No picture was given for: ${missing.join(', ')}. Invent these so they suit the rest of the character naturally.`);
      return { parts: lines.join('\n') };
    },
    prompt:
`${FICTIONAL_RESULT}

Design ONE new, original character and show them in a single full-body image, built from the inspiration images provided.

WHAT TO TAKE FROM EACH IMAGE:
{parts}

Take ONLY the listed part from each inspiration image. Ignore everything else in it: the other body parts, the person's identity, clothing, accessories, pose, background, lighting and image style.

${BUILD_COHERENCE}
This must be a NEW individual, not a copy of anyone in the inspiration images.

EXTRA DETAILS (follow these if given): {request}

${BUILD_OUTPUT}`,
  },

  {
    id: 'blend',
    title: 'Build from People',
    group: 'builder',
    menuText: 'Several pictures of people with the look you want',
    intro: 'Add pictures of a few people with the kind of look you want. A new character is designed with the features and proportions they have in common.',
    inputs: [
      { key: 'people', label: 'Inspiration people', tag: 'INSPIRATION PEOPLE', labelEach: true, optional: true, hint: 'Add 2 to 5 pictures for the best results. Full-body pictures help with body proportions.' },
    ],
    requireAny: 'Add pictures of the people you want to use as inspiration (2 to 5 works best).',
    // Two switches that aren't tied to one upload box.
    closenessControls: [
      { key: 'face', label: 'Face' },
      { key: 'body', label: 'Body proportions' },
    ],
    request: { label: 'Extra details', optional: true, placeholder: 'e.g. early 30s, taller than average, friendly look' },
    runLabel: 'Build character',
    defaultOptions: { aspectRatio: '2:3' },
    fill: blendFill,
    prompt: BLEND_PROMPT,
  },

  {
    id: 'describe',
    title: 'Build from Description',
    group: 'builder',
    menuText: 'No pictures: pick gender, age, body type, height and more',
    intro: 'Design a new character without any pictures. Pick what you want below, add any extra details, and tap Run.',
    inputs: [],
    fields: [
      { key: 'gender', label: 'Gender', options: ['Man', 'Woman', 'Androgynous'] },
      { key: 'age', label: 'Age', options: ['18–24', '25–34', '35–44', '45–54', '55–64', '65+'] },
      { key: 'body', label: 'Body type', options: ['Slim', 'Athletic', 'Average', 'Muscular', 'Curvy', 'Stocky', 'Plus-size'] },
      { key: 'height', label: 'Height', options: ['Short', 'Average', 'Tall', 'Very tall'] },
      { key: 'ethnicity', label: 'Ethnicity', options: ['Black / African', 'East Asian', 'South Asian', 'Southeast Asian', 'Hispanic / Latino', 'Middle Eastern / North African', 'Pacific Islander', 'Indigenous American', 'White / European', 'Mixed'] },
      { key: 'skin', label: 'Skin tone', options: ['Very fair', 'Fair', 'Light', 'Medium / olive', 'Tan', 'Brown', 'Dark brown', 'Deep'] },
    ],
    request: { label: 'Extra details', optional: true, placeholder: 'e.g. long curly red hair, green eyes, freckles, confident look' },
    runLabel: 'Build character',
    defaultOptions: { aspectRatio: '2:3' },
    // Writes the {description} section from your choices. "Any" lets the AI decide.
    fill: ({ fields }) => {
      const pick = (k) => fields[k];
      const body = {
        Slim: 'slim, lean build with a narrow frame',
        Athletic: 'athletic, toned build with visible fitness',
        Average: 'average, everyday build',
        Muscular: 'muscular build with clearly developed muscles',
        Curvy: 'curvy build with a defined waist and fuller hips and chest',
        Stocky: 'stocky, solid, broad build',
        'Plus-size': 'plus-size, full-figured build',
      };
      const height = {
        Short: 'short for their gender: noticeably shorter legs and torso relative to an average adult',
        Average: 'average height for their gender, with typical adult proportions',
        Tall: 'tall for their gender: long legs and a long torso',
        'Very tall': 'very tall for their gender: notably long legs and a long, lengthy frame',
      };
      const line = (label, value, fallback) => `- ${label}: ${value || fallback}`;
      const description = [
        line('Gender', pick('gender') && pick('gender').toLowerCase(), 'your choice'),
        line('Age', pick('age') && `${pick('age')} years old`, 'an adult age of your choice'),
        line('Body type', body[pick('body')], 'your choice, natural and believable'),
        line('Height', height[pick('height')], 'your choice'),
        line('Ethnicity', pick('ethnicity'), 'your choice'),
        line('Skin tone', pick('skin') && pick('skin').toLowerCase(), 'your choice, consistent with the ethnicity'),
      ].join('\n');
      return { description };
    },
    prompt:
`${FICTIONAL_RESULT}

Design ONE new, original adult character from the description below and show them in a single full-body image. No reference images are provided: where the description says "your choice", decide it yourself so everything fits together naturally.

CHARACTER:
{description}

Give them a specific, distinctive face with its own individual features (face shape, eyes, eyebrows, nose, lips, jaw), not a generic stock face. Choose a hairstyle and hair colour that suit them unless the extra details say otherwise. Show the body type and height through believable, natural anatomy and proportions (head-to-body ratio, leg length, build), with the same skin tone across the whole body.

EXTRA DETAILS (follow these if given): {request}

${BUILD_OUTPUT}`,
  },

  {
    id: 'sheet',
    title: 'Character Sheet',
    group: 'sheets',
    menuText: 'From picture(s) of ONE character: body sheet + face sheet',
    intro: 'Upload one or more pictures of your character (for example a face close-up and a full-body photo) and tap Run. You get two sheets: a full-body sheet and a face sheet.',
    inputs: [{ key: 'character', label: 'Character reference', tag: 'CHARACTER REFERENCE', labelEach: true }],
    runLabel: 'Create character sheets',
    saveAsCharacter: true,
    // The note about several reference pictures is only added when there IS more than one.
    fill: ({ count }) => ({ multiRef: count.character > 1 ? MULTI_REFERENCE + '\n\n' : '' }),
    // One Run makes both sheets. Each has its own prompt (editable in Settings) and a fixed ratio.
    outputs: [
      {
        key: 'body',
        title: 'Body sheet',
        aspectRatio: '16:9', // 4 standing figures side by side: each gets a tall, narrow slot
        prompt: SHEET_BODY_PROMPT,
      },
      {
        key: 'face',
        title: 'Face sheet',
        aspectRatio: '4:3', // a 4 x 3 grid in a 4:3 image gives square panels, ideal for faces
        prompt: SHEET_FACE_PROMPT,
      },
    ],
  },

  {
    id: 'sheet-inspired',
    title: 'Inspired Character Sheet',
    group: 'sheets',
    menuText: 'A NEW character inspired by several people: body sheet + face sheet',
    intro: 'Add pictures of a few people with the kind of look you want. First a new character is designed from what they have in common, then their body and face sheets are made from that design, so both sheets show the same new person.',
    inputs: [
      { key: 'people', label: 'Inspiration people', tag: 'INSPIRATION PEOPLE', labelEach: true, optional: true, hint: 'Add 2 to 5 pictures for the best results. Full-body pictures help with body proportions.' },
    ],
    requireAny: 'Add pictures of the people you want to use as inspiration (2 to 5 works best).',
    closenessControls: [
      { key: 'face', label: 'Face' },
      { key: 'body', label: 'Body proportions' },
    ],
    request: { label: 'Extra details', optional: true, placeholder: 'e.g. early 30s, taller than average, friendly look' },
    runLabel: 'Design character & make sheets',
    saveAsCharacter: true,
    fill: (a) => ({ ...blendFill(a), multiRef: '' }), // the sheets are made from ONE design picture
    outputs: [
      // first: made before the others; the sheets are then made from this picture instead of the inspiration people.
      { key: 'design', title: 'New character', first: true, aspectRatio: '2:3', prompt: BLEND_PROMPT },
      { key: 'body', title: 'Body sheet', aspectRatio: '16:9', prompt: SHEET_BODY_PROMPT },
      { key: 'face', title: 'Face sheet', aspectRatio: '4:3', prompt: SHEET_FACE_PROMPT },
    ],
  },

  {
    id: 'outfit-sheet',
    noOutfitPick: true, // this tool changes or makes the outfit, so no saved-outfit choice
    title: 'Outfit Sheet',
    group: 'sheets',
    menuText: 'A saved character in a new outfit: full-body views only, saved as one of their outfits',
    intro: 'Pick the saved character and add a picture of them wearing the outfit (e.g. an Outfit result: Send to… → Outfit Sheet). You get a full-body sheet of that outfit, no expressions. Then save it as one of their outfits.',
    inputs: [
      { key: 'character', label: 'Character in the outfit', tag: 'CHARACTER', orSaved: true, sendLabel: 'Character in the outfit', required: true, missing: 'Add a picture of the character wearing the outfit.' },
      SAVED_CHARACTER,
    ],
    runLabel: 'Create outfit sheet',
    saveAsOutfit: true,
    outputs: [
      {
        key: 'body',
        title: 'Outfit sheet',
        aspectRatio: '16:9',
        prompt:
`${FICTIONAL_CHARACTER}

Generate a single full-body character turnaround sheet of the CHARACTER wearing the outfit shown in the CHARACTER image, on a plain white background. Photorealistic.

${CHARACTER_SOURCE}

OUTFIT: copy the outfit from the CHARACTER image exactly: every garment, colour, pattern, fabric, fit and length, the shoes, and any accessories, bag, hat or glasses. Where a view shows a side of the outfit that is hidden in the CHARACTER image (for example the back), continue it in the same style, colour and fabric. The outfit is identical in all four views.

${IDENTITY_LOCK}

Layout: one row of 4 full-body views, evenly spaced, left to right:
Front view, facing camera
3/4 front view
Right side profile
Back view
In every view: standing upright in a relaxed natural pose, arms relaxed and held slightly away from the body so the body outline and the outfit are clearly visible, calm natural expression, whole body from head to feet in frame with nothing cropped.
All four figures at exactly the same scale: feet on the same ground line and the top of the head at the same height, so body proportions can be compared between views.
Each view should be clearly separated with consistent lighting and the same neutral background. Only this one character. No face close-ups, no expressions panels, no text or labels.

${NATURAL_LOOK}

${NO_TATTOOS}`,
      },
    ],
  },

  {
    id: 'background',
    title: 'Swap Background',
    group: 'swap',
    menuText: 'Same character, new background from a picture',
    intro: 'Put your character into a new setting. Add the background, pick or upload your character, tap Run.',
    inputs: [
      { key: 'background', label: 'Background', tag: 'BACKGROUND' },
      { key: 'character', label: 'Character (photo or character sheet)', tag: 'CHARACTER', orSaved: true, sendLabel: 'Character reference' },
      SAVED_CHARACTER,
    ],
    runLabel: 'Place in background',
    prompt:
`${FICTIONAL_CHARACTER}

Place the character from the CHARACTER image(s) into the setting shown in the BACKGROUND image.

${CHARACTER_SOURCE}

${IDENTITY_LOCK} Keep the character's outfit, accessories, colours and visual style exactly as in the reference.

${BODY_GUARD}

POSE AND FRAMING:
- If CASE A (character sheet): show the character full body, in a natural relaxed pose that suits the setting (standing, based on the sheet's front or 3/4 view), with a neutral or gentle expression.
- If CASE B (single picture): keep the character's pose, facial expression and camera angle exactly as in that picture, and completely replace its original background.

BACKGROUND: recreate the environment from the BACKGROUND image faithfully: same location, architecture, objects, colours, time of day and mood. Ignore any people who appear in the BACKGROUND image.

INTEGRATION: match the background's lighting direction, colour temperature, shadows, reflections, perspective, camera height, scale and depth of field so the character looks naturally photographed in that place, with correct contact shadows where they touch the ground. Keep the visual style of the character reference (photo stays photo, illustration stays illustration).

${NO_TATTOOS}

${SINGLE_OUTPUT}`,
  },

  {
    id: 'replace-person',
    title: 'Swap into a Photo',
    group: 'swap',
    menuText: 'Your character takes the place of the person in a photo',
    intro: 'Upload a scene with a person in it, pick or upload your character, and tap Run. Your character takes that person\'s place, pose and expression.',
    inputs: [
      { key: 'scene', label: 'Scene with a person', tag: 'SCENE', missing: 'Add the scene picture (the one with the person to replace) first.' },
      { key: 'character', label: 'Character (photo or character sheet)', tag: 'CHARACTER', orSaved: true, sendLabel: 'Character reference' },
      SAVED_CHARACTER,
    ],
    fieldsTitle: 'Options',
    fields: [
      { key: 'outfit', label: 'Outfit', required: true, wide: true, options: ["Keep my character's outfit", "Use the scene person's outfit"] },
    ],
    defaultFields: { outfit: "Keep my character's outfit" },
    request: { label: 'Which person?', optional: true, placeholder: 'Only needed if there are several people, e.g. the woman on the left in the red dress' },
    runLabel: 'Replace person',
    fill: ({ fields }) => ({
      outfitRule: fields.outfit === "Use the scene person's outfit"
        ? "The character wears the ORIGINAL person's outfit from the SCENE: the same garments, colours, shoes and accessories, re-fitted to the character's own body. Never change the character's body to fit the clothes."
        : "The character wears their OWN outfit and shoes from the CHARACTER image (with only a character sheet, the outfit shown on the sheet), fitted naturally to the pose. Ignore the original person's clothing completely.",
    }),
    prompt:
`${FICTIONAL_CHARACTER}

The SCENE image shows a setting with a person in it. Replace that person with the character from the CHARACTER image(s), so the character is in the scene instead.

WHICH PERSON TO REPLACE: {request} (if "None.", replace the main, most prominent person; if there is only one person, replace them).

${CHARACTER_SOURCE}

${IDENTITY_LOCK}

${BODY_GUARD}

REMOVE THE ORIGINAL PERSON COMPLETELY: none of their face, facial features, hair, skin tone, tattoos or body shape may remain. The result must clearly be the character, not a blend of the two.

KEEP FROM THE SCENE:
- the exact background, setting, objects and any other people (unchanged)
- the composition, camera angle, framing, lighting, colour grading and image style
- the replaced person's position, size in the frame, pose, gestures, what they hold or touch, and facial expression, performed by the character with their own face and body

OUTFIT: {outfitRule}

INTEGRATION: match the scene's lighting direction, shadows, reflections, perspective and depth of field, with natural contact where the character touches the ground or objects and clean, natural edges around the hair, so the character looks truly photographed in that scene.

${NO_TATTOOS}

Output one single image: the SCENE with only that one person replaced by the character. The character appears exactly once; any other people stay as they were. No text, labels, borders or watermark.`,
  },

  {
    id: 'swap-item',
    title: 'Swap an Item',
    group: 'swap',
    menuText: 'Change one thing (shoes, bag, jacket, hair…) to the one in a picture',
    intro: 'Pick your character, choose what to swap, and add a picture of the new item. Only that item changes; everything else stays the same.',
    inputs: [
      { key: 'character', label: 'Character (photo or character sheet)', tag: 'CHARACTER', orSaved: true, sendLabel: 'Character reference' },
      SAVED_CHARACTER,
      { key: 'item', label: 'New item', tag: 'ITEM REFERENCE', sendLabel: 'New item', hint: 'A picture of the item on its own, or someone wearing it. Only the item is copied.', missing: 'Add a picture of the new item.' },
    ],
    fieldsTitle: 'What to swap',
    fields: [
      { key: 'itemType', label: 'Item', required: true, wide: true, options: SWAP_ITEMS.map((i) => i.name), describe: (v) => SWAP_ITEMS.find((i) => i.name === v)?.hint || '' },
    ],
    request: { label: 'Notes', optional: true, placeholder: 'e.g. the left pair in the picture; keep my socks; make it black instead' },
    runLabel: 'Swap item',
    fill: ({ fields }) => {
      const it = SWAP_ITEMS.find((i) => i.name === fields.itemType) || SWAP_ITEMS.at(-1);
      return { item: it.what, itemRules: it.rules };
    },
    prompt:
`${FICTIONAL_CHARACTER}

This is an EDIT of the CHARACTER image: replace ONLY the character's {item} with the one shown in the ITEM REFERENCE image. Everything else stays exactly the same.

${CHARACTER_SOURCE}

${IDENTITY_LOCK}

${BODY_GUARD}

THE NEW ITEM: copy it from the ITEM REFERENCE exactly: its shape and cut, colour, material and texture, pattern, hardware, stitching and small details. Fit it naturally to the character's own body, size and pose, with correct perspective, folds, shadows and lighting of the CHARACTER image. If the item is only partly visible in the reference, complete it in the same design.
{itemRules}

TAKE ONLY THE ITEM FROM THE ITEM REFERENCE. If a person is wearing it there, do NOT copy their face, hair (unless the item is the hairstyle), skin, body shape, pose, other clothes, background or lighting.

KEEP EVERYTHING ELSE: the same face, expression, hair (unless the item is the hairstyle), body, pose, all other clothing and accessories, background, lighting, camera angle and framing. Remove the old {item} completely; nothing of it should show under or around the new one.
- If CASE A (character sheet only): show the character once, full body, standing in a relaxed front or 3/4 view like the sheet's main view, on a plain background in the sheet's style, so the new item is clearly visible.

NOTES (follow these if given): {request}

${NO_TATTOOS}

${SINGLE_OUTPUT}`,
  },

  {
    id: 'outfit',
    noOutfitPick: true, // this tool changes or makes the outfit, so no saved-outfit choice
    title: 'Outfit from Picture',
    group: 'outfit',
    menuText: 'Copy an outfit from a picture you upload',
    intro: 'Dress your character in a new outfit. Pick or upload your character, add the outfit picture, tap Run.',
    inputs: [
      { key: 'character', label: 'Character (photo or character sheet)', tag: 'CHARACTER', orSaved: true, sendLabel: 'Character reference' },
      SAVED_CHARACTER,
      { key: 'outfit', label: 'Outfit', tag: 'OUTFIT' },
    ],
    request: { label: 'Outfit notes', optional: true, placeholder: 'e.g. high-cut black one-piece swimsuit, open back, thin straps' },
    runLabel: 'Change outfit',
    prompt:
`${FICTIONAL_CHARACTER}

Dress the character from the CHARACTER image(s) in the clothing shown in the OUTFIT image.

${CHARACTER_SOURCE}

${IDENTITY_LOCK} The only thing that changes is the clothing.

${BODY_GUARD}

This is costume and fashion design for that character.

OUTFIT: reproduce the clothing from the OUTFIT image accurately: every garment, its cut, fit, length, fabric, texture, colours, patterns, prints, seams, logos and small details, plus footwear and accessories if shown. Use the OUTFIT image ONLY as a clothing reference; ignore the face, body, skin, hair, pose and background of anyone wearing it there. The person wearing the outfit in the OUTFIT image is only a mannequin: re-size and re-fit the clothes onto the character's body.

OUTFIT NOTES from the user (follow these exactly if given; they describe the garment): {request}

${OUTFIT_RULES}

${NO_TATTOOS}

${SINGLE_OUTPUT}`,
  },

  {
    id: 'outfit-gallery',
    noOutfitPick: true, // this tool changes or makes the outfit, so no saved-outfit choice
    title: 'Outfit Gallery',
    group: 'outfit',
    menuText: 'Tap a ready-made outfit from a board of tiles',
    intro: 'Pick or upload your character, tap an outfit tile, and tap Run.',
    inputs: [
      { key: 'character', label: 'Character (photo or character sheet)', tag: 'CHARACTER', orSaved: true, sendLabel: 'Character reference' },
      SAVED_CHARACTER,
    ],
    tiles: {
      key: 'outfit',
      title: 'Choose an outfit',
      hint: 'Tap a tile. Tap "Create example pictures" once to fill the tiles with pictures.',
      required: 'Tap an outfit tile first.',
      items: OUTFITS,
      // Example pictures show the outfit on a plain mannequin, so no person is involved.
      examplePrompt: (item) => `Fashion catalogue product photo of this outfit displayed on a plain white featureless headless mannequin, full length with the shoes shown: ${item.desc} Centred, soft even studio lighting, plain light grey seamless background. No person, no face, no text.`,
    },
    request: { label: 'Outfit notes', optional: true, placeholder: 'Optional changes, e.g. make it navy blue, add a matching jacket' },
    runLabel: 'Change outfit',
    fill: ({ fields }) => {
      const item = OUTFITS.find((o) => o.id === fields.outfit);
      return { outfit: item ? `${item.name}: ${item.desc}` : '' };
    },
    prompt:
`${FICTIONAL_CHARACTER}

Dress the character from the CHARACTER image(s) in the outfit described below.

${CHARACTER_SOURCE}

${IDENTITY_LOCK} The only thing that changes is the clothing.

${BODY_GUARD}

This is costume and fashion design for that character.

OUTFIT: {outfit}
Show every garment exactly as described, with realistic fabric, texture, colour and fit.

OUTFIT NOTES from the user (changes to the outfit above; follow exactly if given): {request}

${OUTFIT_RULES}

${NO_TATTOOS}

${SINGLE_OUTPUT}`,
  },

  {
    id: 'outfit-describe',
    noOutfitPick: true, // this tool changes or makes the outfit, so no saved-outfit choice
    title: 'Outfit from Description',
    group: 'outfit',
    menuText: 'Describe any outfit or style in your own words',
    intro: 'Pick or upload your character, describe the outfit you want, and tap Run.',
    inputs: [
      { key: 'character', label: 'Character (photo or character sheet)', tag: 'CHARACTER', orSaved: true, sendLabel: 'Character reference' },
      SAVED_CHARACTER,
    ],
    request: { label: 'Describe the outfit', placeholder: 'e.g. emerald silk evening gown with a thigh slit and gold heels, or: 70s disco style' },
    runLabel: 'Change outfit',
    prompt:
`${FICTIONAL_CHARACTER}

Dress the character from the CHARACTER image(s) in the outfit the user describes below.

${CHARACTER_SOURCE}

${IDENTITY_LOCK} The only thing that changes is the clothing.

${BODY_GUARD}

This is costume and fashion design for that character.

OUTFIT (the user's description; follow it exactly, and if it names a style rather than exact garments, design a complete, stylish outfit in that style): {request}

${OUTFIT_RULES}

${NO_TATTOOS}

${SINGLE_OUTPUT}`,
  },

  {
    id: 'pose',
    title: 'Pose',
    intro: 'Put your character in the same pose and facial expression as a reference. Pick or upload your character, add the pose, tap Run.',
    inputs: [
      { key: 'character', label: 'Character (photo or character sheet)', tag: 'CHARACTER', orSaved: true, sendLabel: 'Character reference' },
      SAVED_CHARACTER,
      { key: 'pose', label: 'Pose reference', tag: 'POSE REFERENCE' },
    ],
    runLabel: 'Match pose',
    prompt:
`${FICTIONAL_CHARACTER}

This is an EDIT of the CHARACTER image: change ONLY the character's pose, meaning their body position AND their facial expression, so both match the POSE REFERENCE image. Everything else about the CHARACTER image stays: the same person and facial features, outfit, background, setting, lighting and style.

${CHARACTER_SOURCE}
In CASE A, ignore the different poses and expressions on the sheet; they only show what the character looks like. The ONLY pose and expression to use are the ones in the POSE REFERENCE.

${IDENTITY_LOCK} Also keep the character's outfit, accessories, colours and visual style exactly as in the CHARACTER image.

${BODY_GUARD}

POSE: copy the body position from the POSE REFERENCE image precisely: head tilt and turn, gaze direction, torso angle and lean, shoulder and hip angles, the position and bend of each arm, elbow, wrist, hand and finger, the position and bend of each leg, knee and foot, weight distribution, and which way the body faces. Match left and right exactly as shown (do not mirror). Move the character's own body into this pose; never change their body proportions or limb lengths to match the reference person.

OUTFIT LOCK: the character keeps EXACTLY the outfit they wear in the CHARACTER image: every garment, and especially their SHOES (same style, colour, heel height and material), plus socks, accessories, bags, hats and glasses. Only the POSITION of the feet comes from the POSE REFERENCE; the footwear on those feet is always the character's own. If a garment or the shoes were not visible in the CHARACTER image, continue the character's outfit in the same style (with a character sheet, use the outfit and shoes shown on the sheet), and never borrow them from the POSE REFERENCE.

FACIAL EXPRESSION IS PART OF THE POSE: copy the expression from the POSE REFERENCE as precisely as the body: the emotion and how strong it is; the mouth (open or closed, smiling, laughing, frowning, teeth showing, lips pressed or parted); the eyes (wide, relaxed, squinting, winking or closed) and where they look; the eyebrows (raised, furrowed, relaxed, one raised); cheeks, nose scrunch and jaw. Perform that expression ON THE CHARACTER'S OWN FACE: their face shape, eyes, nose, lips, skin and all facial features stay exactly theirs; only the expression changes. Do not keep the expression from the CHARACTER image. If the face in the POSE REFERENCE is hidden or not visible, choose an expression that naturally fits the pose.

TAKE ONLY THE POSE FROM THE POSE REFERENCE. Do NOT copy anything else from it:
- not its background, location, environment, scenery, floor, walls or sky
- not its props, furniture or objects (unless the pose physically needs something to sit on or lean on; then use a matching item from the character's own setting)
- not its lighting, colours, time of day, weather or mood
- not its camera angle, lens, crop or image style
- not the facial features, face shape, body shape, skin, hair or identity of the person in it (take their facial EXPRESSION only, never their face)
- not their clothing, shoes, boots, socks, accessories, bags, hats, glasses or jewelry

BACKGROUND AND CAMERA:
- If CASE B (single picture): keep the EXACT background and setting of the CHARACTER image, with its lighting and camera viewpoint. If the new pose takes up a different amount of space, widen or adjust the framing just enough to fit the whole pose, and extend the character's original background naturally to fill it.
- If CASE A (character sheet only): use a plain, clean background in the same style as the sheet.

FINAL CHECK before answering: (1) the body pose AND the facial expression match the POSE REFERENCE; (2) the face is still clearly the character's own face; (3) the outfit and SHOES are exactly the character's own, unchanged; (4) the background comes from the CHARACTER image (or is plain for a sheet), never from the POSE REFERENCE.

${NO_TATTOOS}

${SINGLE_OUTPUT}`,
  },

  {
    id: 'makeup',
    title: 'Makeup',
    intro: 'Pick or upload your character, choose a makeup style, and tap Run. Everything else stays the same.',
    inputs: [
      { key: 'character', label: 'Character (photo or character sheet)', tag: 'CHARACTER', orSaved: true, sendLabel: 'Character reference' },
      SAVED_CHARACTER,
    ],
    fieldsTitle: 'Makeup',
    fields: [
      {
        key: 'style', label: 'Makeup style', required: true, wide: true,
        options: MAKEUP_STYLES.map((m) => m.name),
        describe: (name) => MAKEUP_STYLES.find((m) => m.name === name)?.desc || '',
      },
    ],
    request: { label: 'Makeup notes', optional: true, placeholder: 'Optional changes, e.g. red lips instead, no false lashes' },
    runLabel: 'Apply makeup',
    fill: ({ fields }) => {
      const m = MAKEUP_STYLES.find((x) => x.name === fields.style);
      return { makeup: m ? `${m.name}. ${m.desc}` : '' };
    },
    prompt:
`${FICTIONAL_CHARACTER}

This is an EDIT: apply the makeup look described below to the character's face. Change ONLY the makeup.

${CHARACTER_SOURCE}

${IDENTITY_LOCK} Makeup must not change the character's bone structure or features: the face shape, eye shape, nose, lip shape and proportions stay exactly theirs. Only colour, finish and definition change (contour, liner and lip liner may create the effect the style describes, as real makeup would).

MAKEUP LOOK: {makeup}
Apply every part of this look precisely: base and skin finish, brows, eyeshadow, liner, lashes, blush, contour, highlight and lips. Adapt the shades naturally to the character's skin tone, with realistic makeup texture on real skin (not painted or plastic-looking).

MAKEUP NOTES from the user (changes to the look above; follow exactly if given): {request}

EVERYTHING ELSE STAYS THE SAME:
- If CASE B (single picture): keep the hair, outfit, accessories, pose, facial expression, camera angle, framing, background and lighting exactly as in that picture.
- If CASE A (character sheet): show a front-facing head-and-shoulders portrait of the character with a neutral expression on a plain background, so the makeup is clearly visible.

${NO_TATTOOS}

${SINGLE_OUTPUT}`,
  },

  {
    id: 'edit',
    title: 'Edit',
    intro: 'Make a small change to a picture: remove or change shoes, add or remove jewelry, and so on. Everything else stays the same.',
    inputs: [
      { key: 'image', label: 'Picture to edit', tag: 'IMAGE TO EDIT', missing: 'Add the picture you want to edit first.' },
      { key: 'item', label: 'Item picture (optional)', tag: 'ITEM REFERENCE', optional: true, hint: 'Only if you want a specific item, e.g. these exact shoes or this necklace.' },
    ],
    request: {
      label: 'What should change?',
      placeholder: 'e.g. remove the shoes, bare feet',
      suggestions: [
        ['Remove shoes', 'remove the shoes and show natural bare feet'],
        ['Change shoes', 'change the shoes to black strappy high-heel sandals'],
        ['Shoes from item picture', 'replace the shoes with the exact shoes from the ITEM REFERENCE picture'],
        ['Add necklace', 'add a thin delicate gold chain necklace'],
        ['Remove jewelry', 'remove all jewelry (necklaces, earrings, rings, bracelets, watches)'],
        ['Add earrings', 'add small gold hoop earrings'],
        ['Remove glasses', 'remove the glasses'],
        ['Remove bag', 'remove the bag'],
        ['Add item from picture', 'add the item from the ITEM REFERENCE picture, worn naturally'],
      ],
    },
    runLabel: 'Apply edit',
    prompt:
`${FICTIONAL_CHARACTER}

This is a precise, minimal EDIT of the IMAGE TO EDIT. Make ONLY the change requested below.

REQUESTED CHANGE: {request}

KEEP EVERYTHING ELSE EXACTLY THE SAME: the person's identity, face, facial expression, hair, skin, body, body proportions and pose; every other garment, shoe and accessory that the request does not mention; the background, lighting, colours, camera angle, framing, resolution and image style. Do not restyle, retouch, beautify, re-pose or re-frame anything.

REMOVING something: show what would naturally be there without it (for example bare feet, skin, or the fabric or background behind it), matching the surrounding lighting and texture. Do not put anything new in its place unless asked.

ADDING or CHANGING something: make it realistic, correctly sized and positioned, and lit and shadowed to match the image.

ITEM REFERENCE (only if that picture is included): it shows the exact item to use. Reproduce that item faithfully (design, shape, colour, material and details) and fit it naturally onto the character. Use it only for the item; ignore any person, body, clothing or background in it.

${NO_TATTOOS}

Output one single image: the edited IMAGE TO EDIT. No text, labels, borders or watermark.`,
  },

  {
    id: 'scene',
    title: 'Character Scene',
    intro: 'Pick or upload your character, describe what you want, and tap Run for a new image of that character.',
    inputs: [
      { key: 'character', label: 'Character (photo or character sheet)', tag: 'CHARACTER', orSaved: true, sendLabel: 'Character reference' },
      SAVED_CHARACTER,
    ],
    request: { label: 'What do you want?', placeholder: 'e.g. sitting at a café table in Paris at golden hour, laughing, medium shot' },
    runLabel: 'Create image',
    prompt:
`${FICTIONAL_CHARACTER}

Create a NEW image of the character from the CHARACTER image(s), following the request below.

${CHARACTER_SOURCE}
In both cases, use the reference only to learn who the character is. The pose, expression, setting and framing come from the request below.

${IDENTITY_LOCK} Keep their outfit too, unless the request below says to change it.

${BODY_GUARD}

OUTPUT RULES:
- Generate ONE new, full-frame image that shows this character EXACTLY ONCE.
- Never copy a sheet's layout: no grid, panels, split screen, collage, turnaround, multiple views, multiple poses, or repeated copies of the character.
- Do not add any other people unless the request below explicitly asks for them. Other people must look clearly different from the character.
- No text, labels, captions, borders or watermark.

${NO_TATTOOS}

REQUEST:
{request}`,
  },
  {
    id: 'place-builder',
    allowExtras: true, // designs a whole place from a description, so it may add fitting decor
    title: 'Place Builder',
    section: 'places',
    intro: 'Design a new place (a room or location). Describe it, add reference photos, or both, and tap Run. You get one wide, empty shot of the place.',
    inputs: [
      { key: 'refs', label: 'Reference photos (optional)', tag: 'PLACE REFERENCE', optional: true, hint: 'Photos of the room or of rooms you like. Several photos are treated as one place.' },
    ],
    fieldsTitle: 'The place',
    fields: [
      { key: 'type', label: 'Type', options: ['Bedroom', 'Living room', 'Kitchen', 'Bathroom', 'Home office', 'Office', 'Café', 'Restaurant', 'Bar / club', 'Classroom', 'Gym', 'Hotel room', 'Hallway / entrance', 'Car interior', 'Street', 'Park', 'Beach', 'Rooftop'] },
      { key: 'style', label: 'Style', options: ['Modern', 'Minimalist', 'Cozy', 'Luxury', 'Scandinavian', 'Industrial', 'Rustic', 'Bohemian', 'Vintage', 'Traditional'] },
      { key: 'time', label: 'Time of day', options: ['Morning', 'Midday', 'Golden hour', 'Evening', 'Night'] },
    ],
    request: { label: 'Describe the place', optional: true, placeholder: "e.g. Mara's bedroom: small city apartment, big window with a view, queen bed with white linen, plants, a desk with a laptop" },
    requireAny: 'Describe the place or add at least one reference photo.',
    requireAnyOrText: true,
    runLabel: 'Build place',
    defaultOptions: { aspectRatio: '16:9' },
    fill: ({ fields }) => ({
      place: [
        fields.type ? `Type: ${fields.type}.` : '',
        fields.style ? `Style: ${fields.style}.` : '',
        fields.time ? `Time of day: ${fields.time}.` : '',
      ].filter(Boolean).join(' ') || 'Not specified; choose what fits the description and references.',
    }),
    prompt:
`${FICTIONAL_PLACE}

Design ONE specific place (a room or location) and show it in a single wide establishing photograph. It will be reused as a consistent set for future scenes, so it must be clear and recognisable.

THE PLACE: {place}
DESCRIPTION (follow it if given): {request}

PLACE REFERENCE photos (only if included): follow their layout, architecture, furniture, materials, colours and style closely. If there are several, treat them as one place (different angles or inspirations for the same room) and combine them into one coherent space.

Make it specific and lived-in: clearly placed furniture, windows, doors, light sources, decor and textures, so each item can be recognised again later.

CAMERA: wide-angle establishing shot at eye level (about 1.5 m high) from the entrance or a corner, showing most of the space: floor, walls, the main furniture, windows and the door.

Photorealistic, natural lighting that matches the time of day. ${EMPTY_PLACE}`,
  },

  {
    id: 'place-sheet',
    title: 'Place Sheet',
    section: 'places',
    intro: 'Upload a picture of a place (for example from Place Builder) and tap Run. You get two sheets: a views sheet and a details sheet.',
    inputs: [{ key: 'place', label: 'Place picture(s)', tag: 'PLACE', missing: 'Add a picture of the place first.', hint: 'One wide picture works; extra angles of the same place help.' }],
    runLabel: 'Create place sheets',
    saveAs: 'places',
    request: ROOM_DESCRIPTION_REQUEST,
    saveNotes: true,
    outputs: [
      { key: 'views', title: 'Views sheet', aspectRatio: '16:9', prompt: placeViewsPrompt('the attached PLACE image(s) of this place') },
      { key: 'details', title: 'Details sheet', aspectRatio: '4:3', prompt: placeDetailsPrompt('the attached PLACE image(s) of this place') },
    ],
  },

  {
    id: 'place-video',
    title: 'Place from Video',
    section: 'places',
    intro: 'Film a slow walk around a room, choose the video, keep the sharp frames, and tap Run. You get a views sheet and a details sheet of that room.',
    inputs: [
      {
        key: 'frames', type: 'video', label: 'Room video', tag: 'VIDEO FRAMES', frameCount: 12, maxFrames: 10,
        missing: 'Choose a video of the room first.',
        hint: 'Walk slowly around the edge of the room facing inward, film each wall and corner at chest height, in good light, with no people. 30 to 60 seconds is plenty.',
      },
    ],
    request: ROOM_DESCRIPTION_REQUEST,
    saveNotes: true,
    runLabel: 'Create place sheets',
    saveAs: 'places',
    outputs: [
      { key: 'views', title: 'Views sheet', aspectRatio: '16:9', prompt: placeViewsPrompt('the attached VIDEO FRAMES, which are still frames from a walk-around video of ONE room (different angles of the same place)') },
      { key: 'details', title: 'Details sheet', aspectRatio: '4:3', prompt: placeDetailsPrompt('the attached VIDEO FRAMES, which are still frames from a walk-around video of ONE room (different angles of the same place)') },
    ],
  },

  {
    id: 'create-scene',
    title: 'Create a Scene',
    section: 'home',
    group: 'scenes',
    menuText: 'Put your saved characters in your saved places',
    intro: 'Pick your characters and a place, describe what is happening, and tap Run.',
    inputs: [
      { key: 'char1', type: 'library', library: 'characters', label: 'Character 1', tag: 'CHARACTER 1', outfits: true, poses: true, missing: 'Choose Character 1 first (save characters in Characters → Saved Characters).' },
      { key: 'char2', type: 'library', library: 'characters', label: 'Character 2 (optional)', tag: 'CHARACTER 2', outfits: true, poses: true, optional: true },
      { key: 'place', type: 'library', library: 'places', label: 'Place', tag: 'PLACE', optional: true, hint: 'Pick a saved place so it looks the same in every scene. Without one, the setting comes from your description.' },
      {
        key: 'poseRef', label: 'Pose picture (optional)', tag: 'POSE REFERENCE', optional: true, sendLabel: 'Pose picture',
        hint: 'A photo of someone in the pose you want. Only the pose is copied, never their face, body, clothes or background. Choose who it is for, and how it is sent, under "Camera & poses".',
        sendFirst: true, // sent before the characters, so their own pictures are the last (strongest) people the AI sees
        afterText: 'The person in this POSE REFERENCE is a STRANGER who does NOT appear in the scene. Use only their pose. Do not copy their face, hair, skin, body shape, height, weight or anything they wear.',
        // "Words only": the AI first describes the pose in words and only the words are sent, so the stranger can't leak in.
        describe: { field: 'poseMode', value: 'Words only (the pose person can\'t leak in)', prompt: POSE_DESCRIBE_PROMPT },
      },
    ],
    fieldsTitle: 'Camera & poses',
    fields: [
      { key: 'shot', label: 'Shot', wide: true, options: ['Wide shot (whole room)', 'Full body', 'Medium shot (waist up)', 'Close-up'] },
      { key: 'view', label: 'Camera spot in the place', wide: true, options: PLACE_VIEWS.map((v) => v.name), describe: (v) => PLACE_VIEWS.find((x) => x.name === v)?.desc || '' },
      { key: 'together', label: 'Pose together (with 2 characters)', wide: true, options: DUO_POSES.map((p) => p.name), describe: (v) => DUO_POSES.find((p) => p.name === v)?.desc || '' },
      { key: 'poseFor', label: 'Pose picture is for', wide: true, options: ['Character 1', 'Character 2', 'Both (copy the two people in it)'] },
      { key: 'poseMode', label: 'Pose picture sends', wide: true, options: ['Photo (most exact pose)', 'Words only (the pose person can\'t leak in)'], describe: (v) => v.startsWith('Words') ? 'The AI first describes the pose in words; only the words are sent, never the photo. Use this if the person from the pose picture shows up in your scene.' : 'The photo is sent. Most exact pose, but sometimes the person in it leaks into the scene.' },
    ],
    request: { label: "What's happening?", placeholder: 'e.g. Mara sits on the edge of her bed reading a letter, evening lamp light. Leo leans in the doorway, arms crossed.' },
    runLabel: 'Create scene',
    defaultOptions: { aspectRatio: '16:9' },
    defaultFields: { poseFor: 'Character 1', poseMode: 'Photo (most exact pose)' },
    fill: ({ has, fields, described }) => {
      const words = described.poseRef; // the pose in words, when "Words only" is chosen
      const two = !!fields.char2;
      const poseFor = fields.poseFor || 'Character 1';
      const lines = [];
      if (has.poseRef && poseFor.startsWith('Both')) lines.push(words ? `BOTH CHARACTERS take this pose for two people (described from a reference photo; the first person described goes to Character 1): ${words}` : 'BOTH CHARACTERS: copy the poses of the two people in the POSE REFERENCE picture (the left person\'s pose goes to whichever character stands on that side), including how they touch or hold each other.');
      else if (two && fields.together) {
        const duo = DUO_POSES.find((p) => p.name === fields.together);
        if (duo) lines.push(`TOGETHER: ${duo.desc}`);
      }
      (two ? ['1', '2'] : ['1']).forEach((n) => {
        if (has.poseRef && (poseFor === `Character ${n}` || poseFor.startsWith('Both'))) {
          if (!poseFor.startsWith('Both')) lines.push(words ? `CHARACTER ${n} takes this pose (described from a reference photo): ${words}` : `CHARACTER ${n}: copy the body pose and facial expression of the person in the POSE REFERENCE picture, performed by CHARACTER ${n} with their own face and body.`);
          return;
        }
        const pose = POSES.find((p) => p.id === fields[`char${n}Pose`]);
        if (pose) lines.push(`CHARACTER ${n}: ${pose.desc}`);
      });
      const view = PLACE_VIEWS.find((v) => v.name === fields.view);
      return {
        shot: fields.shot || 'Your choice, whatever tells the scene best.',
        view: view ? `${view.desc} Match the camera position, direction and height of the ${view.panel} panel of the PLACE VIEWS sheet, so the room looks the same as in that panel.` : 'Your choice: pick the PLACE VIEWS panel that best shows the scene and match its camera position, direction and height.',
        poses: lines.length ? lines.join('\n') : 'Whatever fits the scene description naturally.',
      };
    },
    prompt:
`${FICTIONAL_CHARACTER} The place is a fictional set.

Create ONE new image of the scene described below, using the saved references.

REFERENCES (each group is labelled with its name):
- CHARACTER 1, and CHARACTER 2 if included: character sheets (a full-body BODY sheet and/or a close-up FACE sheet). Each sheet shows ONE person from several angles; it is not a group, and its grid layout is not the output format.
- A character may instead come as an OUTFIT SHEET (a full-body sheet of that character already wearing the outfit for this scene) plus their FACE SHEET (close-ups of their face).
- PLACE, if included: location sheets of one place: a VIEWS sheet (the same room from several camera positions) and/or a DETAILS sheet (close-ups of its furniture, objects and materials). It may also come with a written description of the room; follow it for where things are.
- POSE REFERENCE, if included: a photo that shows ONLY the pose to use (see POSES).

SCENE: {request}
SHOT: {shot}
CAMERA SPOT (if a PLACE is included): {view}
POSES:
{poses}

CHARACTERS: ${IDENTITY_LOCK} This applies to EACH character separately: each one must look exactly like their own references (the face sheet decides the face, the body sheet decides height, build and proportions). Never mix features between characters; they stay clearly different people. Their relative heights must match their sheets.

OUTFITS: if a character comes with an OUTFIT SHEET, that sheet is their full-body reference: it decides their height, build, body proportions AND their clothing. They wear EXACTLY that outfit: every garment, colour, pattern, fabric, fit, length, the shoes, and the accessories, bag and jewelry shown on it. Their FACE SHEET decides the face in close detail; if the small faces on the outfit sheet differ slightly, follow the FACE SHEET. Ignore any clothing visible on the face sheet. A character without an outfit sheet keeps the outfit from their sheets unless the scene says otherwise.

POSE REFERENCE (if included): the person in it is a STRANGER, not one of the characters, and must NOT appear in the image. Take ONLY the pose from it: body position, head angle, arms, hands, legs, feet, weight and facial expression, matching left and right as shown. Never copy the face, hair, skin, body shape, height, weight, clothes, shoes, accessories, background, props, lighting or camera style of the person in it, and never change a character's body proportions to fit it. Think of it as a stick-figure diagram: the character performs the pose with their OWN face, hair, body and outfit.
IDENTITY CHECK (when a POSE REFERENCE is included): look at the finished face and body. If they resemble the person in the POSE REFERENCE more than the character's own FACE sheet and body/outfit sheet, redo them as the character.

PLACE (if included): the scene happens in THIS exact place: the same architecture, layout, furniture pieces and their positions, materials, colours, decor and windows as in the PLACE references. Use the camera spot above, as if standing where that view was taken, and show only what would be visible from there. Do not add, remove or rearrange furniture unless the scene asks for it.
- ROOM SIZE: keep the room's real size and open floor space exactly as in the PLACE references. Never make the room smaller, narrower or more cramped, and never push walls or furniture closer together to fit the characters. Use a natural wide-angle view (about a 24 mm lens at eye level, about 1.5 m high) so the room feels as spacious as in its references.
- FURNITURE ALIGNMENT: every piece keeps its exact orientation and placement. Furniture that stands against a wall stays flush and parallel to that wall (for example the bed's headboard stays flat against its wall, square to it, never angled, rotated or pulled into the room). Straight lines of walls, floor tiles, bed and furniture edges stay straight and follow one consistent perspective. Lighting and time of day follow the scene; otherwise match the place references. If no PLACE references are included, create a fitting setting from the scene description.

REAL-WORLD SCALE (very important): the sheets have plain backgrounds, so they show NO size. Build the scene at true real-world size:
- If a character comes with a "real height", draw them at EXACTLY that height. Otherwise they are ordinary adults of normal height (about 155-185 cm / 5'1"-6'1"), never giants. With two characters, their height difference must match their heights (or their sheets).
- Furniture and architecture keep their real sizes: a standard door is about 200-210 cm tall (a standing adult's head stays clearly below the top of the door frame); a ceiling is about 240-270 cm; a bed is about 190-210 cm long with the top of the mattress at about knee to mid-thigh height of a standing adult; a desk or vanity top is about 75 cm (hip height); a chair seat is about 45 cm (knee height); a wardrobe is about 180-220 cm tall.
- Furniture keeps its full shape and proportions from the PLACE references. NEVER shrink, shorten, squash, crop or cut off furniture (for example making a bed shorter or narrower) to make room for a character. If something does not fit in the frame, move the camera back or change the camera angle instead of changing the furniture.
- Check heights against fixed reference points in the room (door frames, windows, mirror, wardrobe, bed, desk) before answering. If a character looks too big for the room, make the character smaller, not the room.

INTEGRATION: characters at the correct scale for the furniture and for each other, touching the floor and objects naturally with matching shadows, lighting and perspective.

${NO_TATTOOS}

Output one single, full-frame image (no grid, panels or collage). Each character appears exactly once. No other people unless the scene asks for them. No text, labels, borders or watermark.`,
  },

  {
    id: 'scene-angles',
    title: 'Scene Sheet',
    section: 'home',
    group: 'scenes',
    menuText: 'One picture of your character posed in a place → 3 views of that exact moment in one image',
    intro: 'Add a picture of your character in a pose in a place. You get one image with 3 views of that exact moment from around them: same pose, same place, same lighting. Picking the saved character helps get their face, hair and body right from the sides the picture doesn\'t show.',
    inputs: [
      { key: 'character', label: 'Character in a pose in a place', tag: 'SCENE REFERENCE', orSaved: true, required: true, sendLabel: 'Scene picture', missing: 'Add the picture of your character posed in the place.' },
      SAVED_CHARACTER,
    ],
    noOutfitPick: true, // the outfit comes from the scene picture
    fieldsTitle: 'Views',
    fields: [
      { key: 'views', label: 'Views', required: true, wide: true, options: ['Front, side, back', 'Front, 3/4, back', '3/4 left, front, 3/4 right'] },
    ],
    defaultFields: { views: 'Front, side, back' },
    request: { label: 'Notes', optional: true, placeholder: 'e.g. keep the phone in her right hand; show the window behind her in the back view' },
    runLabel: 'Make scene sheet',
    outputs: [{ key: 'sheet', title: 'Scene sheet', aspectRatio: '16:9', prompt: SCENE_ANGLES_PROMPT }],
    fill: ({ fields }) => {
      const v = {
        'Front, 3/4, back': ['FRONT: camera in front of the character, facing them.', '3/4: camera moved about 45 degrees around them.', 'BACK: camera behind the character, looking at their back, with what is in front of them now visible beyond them.'],
        '3/4 left, front, 3/4 right': ['3/4 LEFT: camera about 45 degrees to the character\'s right side (our left).', 'FRONT: camera in front of the character, facing them.', '3/4 RIGHT: camera about 45 degrees to the character\'s left side (our right).'],
      }[fields.views] || ['FRONT: camera in front of the character, facing them.', 'SIDE: camera at 90 degrees, a clean side profile of the pose.', 'BACK: camera behind the character, looking at their back, with what is in front of them now visible beyond them.'];
      return {
        layout: 'one row of 3 equal tall panels side by side, separated by thin white gaps, in this order from left to right',
        views: v.map((t, i) => `${i + 1}. ${t}`).join('\n') + '\nThe camera circles AROUND the character at the same distance and at chest height; only its position changes.',
      };
    },
  },

  {
    id: 'camera-angle',
    title: 'Camera Angle',
    section: 'home',
    group: 'scenes',
    menuText: 'Re-shoot a scene picture from another camera angle (low angle, POV, over the shoulder…)',
    intro: 'Add a picture of your character in a scene and pick a camera angle. You get the same moment, same pose and same place, photographed from that angle. Set the ratio in the Model step (4:5 for Instagram posts, 9:16 for Reels and TikTok).',
    inputs: [
      { key: 'character', label: 'Scene picture', tag: 'SCENE REFERENCE', orSaved: true, required: true, sendLabel: 'Scene picture', missing: 'Add the scene picture to re-shoot.' },
      SAVED_CHARACTER,
    ],
    noOutfitPick: true,
    fieldsTitle: 'Camera angle',
    fields: [
      { key: 'angle', label: 'Angle', required: true, wide: true, groups: CAMERA_ANGLES, options: CAMERA_ANGLES.map((a) => a.name), describe: (v) => CAMERA_ANGLES.find((a) => a.name === v)?.desc || '' },
    ],
    request: { label: 'Notes', optional: true, placeholder: 'e.g. show more of the bed; keep her looking at the camera' },
    runLabel: 'Re-shoot',
    defaultOptions: { aspectRatio: '4:5' },
    fill: ({ fields }) => {
      const a = CAMERA_ANGLES.find((x) => x.name === fields.angle) || CAMERA_ANGLES[0];
      return { angle: `${a.name.toUpperCase()}: ${a.desc}` };
    },
    prompt:
`${FICTIONAL_CHARACTER} The place is a fictional set.

The SCENE REFERENCE image shows a moment: the character in a pose in a place. Re-shoot this EXACT same moment from a different camera position, as if a second photographer took it at the same instant.

NEW CAMERA: {angle}

Only the camera changes. Everything in front of it stays the same:
- POSE: exactly the same 3D pose, frozen: head, arms, hands, legs, feet, weight and balance, facial expression and where they look (they may look at or away from the new camera only as the reference shows). Seen from the new camera, it must be the same pose, not a new one. Only if the angle description above says so, the phone arm may change.
- CHARACTER: the same person, face, hair, body proportions, outfit, shoes, accessories and anything they hold.
- PLACE: the same location, furniture, objects and decor, each in the same position relative to the character, now seen from the new camera. Areas the reference does not show must be designed to match the place's style, materials and colours.
- LIGHT: the same light sources, direction, colour and time of day; shadows fall the same way in the world.
Correct perspective and real-world scale for the new camera position: people, furniture and room keep their true sizes.

CHARACTER SHEET (only if images labelled CHARACTER SHEET are included): they show this same character from other angles. Use them ONLY to get the face, hair and body right from sides the SCENE REFERENCE does not show. Pose, outfit, props, place and lighting come from the SCENE REFERENCE.
THE RESULT IS A RE-SHOOT OF THE SCENE REFERENCE: never copy the CHARACTER SHEET's plain white background, its standing neutral pose, its outfit (if it differs) or its grid layout. The output is one single photo of the scene.

${IDENTITY_LOCK}

Photorealistic, matching the style of the SCENE REFERENCE. Only this character (plus anyone already in the SCENE REFERENCE, in their same positions).

NOTES (follow these if given): {request}

${NO_TATTOOS}

${SINGLE_OUTPUT}`,
  },

];
