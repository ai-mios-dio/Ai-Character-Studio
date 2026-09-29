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
- CASE A, CHARACTER SHEET: the image is a turnaround / reference sheet with several panels, views, close-ups or expressions. Every panel shows the SAME ONE individual from different angles. It is NOT a group of different people, and its grid layout is NOT the output format. Combine all panels to understand this one character: full-body views for height, build, body proportions and outfit; close-ups for the face.
- CASE B, SINGLE PICTURE: the image shows the character once. That picture is the reference for who they are.

EXTRA CHARACTER SHEET (only if an image labelled CHARACTER SHEET is also included): it is an additional reference of the SAME character shown in the CHARACTER image, not a different person. It shows one individual in several panels, not a group. Use it ONLY to get the identity exactly right: face, facial features, skin tone, eye colour, height, build and body proportions. The character's look (outfit, hair styling, makeup, accessories) comes from the CHARACTER image, NEVER from the sheet: ignore the sheet's clothing, poses, expressions, background and layout. If the two images disagree on outfit or styling, the CHARACTER image wins. Everything the instructions below say about the CHARACTER image still refers to the CHARACTER image, not the sheet.`;

// Optional extra upload box: a character sheet used only for face/body accuracy.
const SHEET_INPUT = {
  key: 'sheet',
  label: 'Character sheet (optional)',
  tag: 'CHARACTER SHEET',
  optional: true,
  hint: 'Adds accuracy for the face and body. The outfit and look still come from the Character image above.',
};

// Shared ending: one image, one character, nothing extra.
const SINGLE_OUTPUT =
  'Output one single image that shows this character EXACTLY ONCE. Never a grid, panels, collage, turnaround, split screen or multiple copies of the character. ' +
  'No extra people, no text, no labels, no borders, no watermark.';

const TOOLS = [
  {
    id: 'sheet',
    title: 'Character Sheet',
    intro: 'Upload a character reference and tap Run to get a turnaround and expression sheet.',
    inputs: [{ key: 'character', label: 'Character reference', tag: 'CHARACTER REFERENCE' }],
    runLabel: 'Create character sheet',
    defaultOptions: { aspectRatio: '16:9' },
    prompt:
`Using the attached image as the character reference, generate a single character turnaround and expression reference sheet on a plain white background. Keep the character's face, hair, outfit, and proportions exactly consistent across every view. Photorealistic. No tattoos, no jewelery.
Layout as a grid:
Front view, full body, facing camera, arms relaxed at sides
3/4 front view
Right side profile, full body
Close-up of face, front angle
Close-up of face, low angle (looking up at character)
Close-up of face, high angle (looking down at character)
Expression grid: neutral, smiling, angry, crying, shocked, smug/smirking
Each panel should be clearly separated with consistent lighting and the same neutral background.`,
  },

  {
    id: 'background',
    title: 'Background',
    intro: 'Put your character into a new setting. Upload the background, upload the character (a photo or a character sheet), tap Run.',
    inputs: [
      { key: 'background', label: 'Background', tag: 'BACKGROUND' },
      { key: 'character', label: 'Character (photo or character sheet)', tag: 'CHARACTER' },
      SHEET_INPUT,
    ],
    runLabel: 'Place in background',
    prompt:
`Place the character from the CHARACTER image(s) into the setting shown in the BACKGROUND image.

${CHARACTER_SOURCE}

${IDENTITY_LOCK} Keep the character's outfit, accessories, colours and visual style exactly as in the reference.

POSE AND FRAMING:
- If CASE A (character sheet): show the character full body, in a natural relaxed pose that suits the setting (standing, based on the sheet's front or 3/4 view), with a neutral or gentle expression.
- If CASE B (single picture): keep the character's pose, facial expression and camera angle exactly as in that picture, and completely replace its original background.

BACKGROUND: recreate the environment from the BACKGROUND image faithfully: same location, architecture, objects, colours, time of day and mood. Ignore any people who appear in the BACKGROUND image.

INTEGRATION: match the background's lighting direction, colour temperature, shadows, reflections, perspective, camera height, scale and depth of field so the character looks naturally photographed in that place, with correct contact shadows where they touch the ground. Keep the visual style of the character reference (photo stays photo, illustration stays illustration).

${SINGLE_OUTPUT}`,
  },

  {
    id: 'outfit',
    title: 'Outfit',
    intro: 'Dress your character in a new outfit. Upload the character (a photo or a character sheet), upload the outfit, tap Run.',
    inputs: [
      { key: 'character', label: 'Character (photo or character sheet)', tag: 'CHARACTER' },
      SHEET_INPUT,
      { key: 'outfit', label: 'Outfit', tag: 'OUTFIT' },
    ],
    runLabel: 'Change outfit',
    prompt:
`Dress the character from the CHARACTER image(s) in the clothing shown in the OUTFIT image.

${CHARACTER_SOURCE}

${IDENTITY_LOCK} The only thing that changes is the clothing.

OUTFIT: reproduce the clothing from the OUTFIT image accurately: every garment, its cut, fit, length, fabric, texture, colours, patterns, prints, seams, logos and small details, plus footwear and accessories if shown. Use the OUTFIT image ONLY as a clothing reference; ignore the face, body, skin, hair, pose and background of anyone wearing it there. Tailor the clothes to fit the character's own body naturally, with realistic folds and drape. Never reshape the body to fit the outfit.

POSE AND FRAMING:
- If CASE A (character sheet): show the character full body, standing in a relaxed front or 3/4 view like the sheet's main full-body view, with a neutral expression, on the same plain background style as the sheet, so the whole outfit is visible.
- If CASE B (single picture): keep the character's pose, facial expression, camera angle, framing, background and lighting from that picture, unless the outfit physically requires a tiny adjustment.

${SINGLE_OUTPUT}`,
  },

  {
    id: 'pose',
    title: 'Pose',
    intro: 'Put your character in the same pose as a reference. Upload the character (a photo or a character sheet), upload the pose, tap Run.',
    inputs: [
      { key: 'character', label: 'Character (photo or character sheet)', tag: 'CHARACTER' },
      SHEET_INPUT,
      { key: 'pose', label: 'Pose reference', tag: 'POSE REFERENCE' },
    ],
    runLabel: 'Match pose',
    prompt:
`This is an EDIT of the CHARACTER image: change ONLY the character's body position so it matches the pose in the POSE REFERENCE image. Everything else about the CHARACTER image stays: the same person, outfit, background, setting, lighting and style.

${CHARACTER_SOURCE}
In CASE A, ignore the different poses and expressions on the sheet; they only show what the character looks like. The ONLY pose to use is the one in the POSE REFERENCE.

${IDENTITY_LOCK} Also keep the character's outfit, accessories, colours and visual style exactly as in the CHARACTER image.

POSE: copy the body position from the POSE REFERENCE image precisely: head tilt and turn, gaze direction, torso angle and lean, shoulder and hip angles, the position and bend of each arm, elbow, wrist, hand and finger, the position and bend of each leg, knee and foot, weight distribution, and which way the body faces. Match left and right exactly as shown (do not mirror). Move the character's own body into this pose; never change their body proportions or limb lengths to match the reference person.

TAKE ONLY THE POSE FROM THE POSE REFERENCE. Do NOT copy anything else from it:
- not its background, location, environment, scenery, floor, walls or sky
- not its props, furniture or objects (unless the pose physically needs something to sit on or lean on; then use a matching item from the character's own setting)
- not its lighting, colours, time of day, weather or mood
- not its camera angle, lens, crop or image style
- not the face, body shape, skin, hair, clothing or identity of the person in it

BACKGROUND AND CAMERA:
- If CASE B (single picture): keep the EXACT background and setting of the CHARACTER image, with its lighting and camera viewpoint. If the new pose takes up a different amount of space, widen or adjust the framing just enough to fit the whole pose, and extend the character's original background naturally to fill it.
- If CASE A (character sheet only): use a plain, clean background in the same style as the sheet.

FINAL CHECK before answering: the background must come from the CHARACTER image (or be plain for a sheet), never from the POSE REFERENCE.

${SINGLE_OUTPUT}`,
  },

  {
    id: 'scene',
    title: 'Character Scene',
    intro: 'Upload your character (a photo or a character sheet), describe what you want, and tap Run for a new image of that character.',
    inputs: [
      { key: 'character', label: 'Character (photo or character sheet)', tag: 'CHARACTER' },
      SHEET_INPUT,
    ],
    request: { label: 'What do you want?', placeholder: 'e.g. sitting at a café table in Paris at golden hour, laughing, medium shot' },
    runLabel: 'Create image',
    prompt:
`Create a NEW image of the character from the CHARACTER image(s), following the request below.

${CHARACTER_SOURCE}
In both cases, use the reference only to learn who the character is. The pose, expression, setting and framing come from the request below.

${IDENTITY_LOCK} Keep their outfit too, unless the request below says to change it.

OUTPUT RULES:
- Generate ONE new, full-frame image that shows this character EXACTLY ONCE.
- Never copy a sheet's layout: no grid, panels, split screen, collage, turnaround, multiple views, multiple poses, or repeated copies of the character.
- Do not add any other people unless the request below explicitly asks for them. Other people must look clearly different from the character.
- No text, labels, captions, borders or watermark.

REQUEST:
{request}`,
  },
];
