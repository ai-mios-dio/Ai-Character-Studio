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
`Design ONE new, original character and show them in a single full-body image, built from the inspiration images provided.

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
      { key: 'people', label: 'Inspiration people', tag: 'INSPIRATION PEOPLE', optional: true, hint: 'Add 2 to 5 pictures for the best results. Full-body pictures help with body proportions.' },
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
    fill: ({ closeness }) => {
      const how = {
        loose: 'LOOSELY similar: capture the general type and overall impression they share, and invent the specifics freely.',
        balanced: 'CLEARLY similar: share the main traits they have in common, like someone of the same type or family, while being a different person.',
        close: 'VERY similar: closely match the features and proportions they share, while still being a distinct new individual and not any one of them.',
      };
      return { faceHow: how[closeness.face || 'balanced'], bodyHow: how[closeness.body || 'balanced'] };
    },
    prompt:
`Design ONE new, original character and show them in a single full-body image.

The INSPIRATION PEOPLE images show several DIFFERENT people who share the kind of look wanted. Study them together and work out what they have in COMMON, then create a new person who clearly belongs to the same type.

FACE: {faceHow}
Look at the shared face shape, eye shape and spacing, eyebrows, nose, lips, jawline, cheekbones, skin tone and complexion, and apparent age range.

BODY PROPORTIONS: {bodyHow}
Look at the shared height impression, build, shoulder-to-hip ratio, waist, chest, leg length, torso length, and how muscle and fat are distributed.

Where the inspiration people differ, use the most typical version or a natural middle ground. The result must NOT be a copy of any single inspiration person, and must not look like one of them with small changes. Ignore their clothing, accessories, poses, backgrounds and image styles.

${BUILD_COHERENCE}

EXTRA DETAILS (follow these if given): {request}

${BUILD_OUTPUT}`,
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
`Design ONE new, original adult character from the description below and show them in a single full-body image. No reference images are provided: where the description says "your choice", decide it yourself so everything fits together naturally.

CHARACTER:
{description}

Give them a specific, distinctive face with its own individual features (face shape, eyes, eyebrows, nose, lips, jaw), not a generic stock face. Choose a hairstyle and hair colour that suit them unless the extra details say otherwise. Show the body type and height through believable, natural anatomy and proportions (head-to-body ratio, leg length, build), with the same skin tone across the whole body.

EXTRA DETAILS (follow these if given): {request}

${BUILD_OUTPUT}`,
  },

  {
    id: 'sheet',
    title: 'Character Sheet',
    intro: 'Upload a character reference and tap Run. You get two sheets: a full-body sheet and a face sheet.',
    inputs: [{ key: 'character', label: 'Character reference', tag: 'CHARACTER REFERENCE' }],
    runLabel: 'Create character sheets',
    saveAsCharacter: true,
    // One Run makes both sheets. Each has its own prompt (editable in Settings) and a fixed ratio.
    outputs: [
      {
        key: 'body',
        title: 'Body sheet',
        aspectRatio: '16:9', // 4 standing figures side by side: each gets a tall, narrow slot
        prompt:
`Using the attached image as the character reference, generate a single full-body character turnaround sheet on a plain white background. Keep the character's face, hair, outfit, and proportions exactly consistent across every view. Photorealistic. No tattoos, no jewelery.
Layout: one row of 4 full-body views, evenly spaced, left to right:
Front view, facing camera
3/4 front view
Right side profile
Back view
In every view: standing upright in a relaxed neutral pose, arms relaxed and held slightly away from the body so the body outline is clearly visible, neutral expression, whole body from head to feet in frame with nothing cropped.
All four figures at exactly the same scale: feet on the same ground line and the top of the head at the same height, so body proportions can be compared between views.
Each view should be clearly separated with consistent lighting and the same neutral background. Only this one character. No text or labels.

${NO_TATTOOS}`,
      },
      {
        key: 'face',
        title: 'Face sheet',
        aspectRatio: '4:3', // a 4 x 3 grid in a 4:3 image gives square panels, ideal for faces
        prompt:
`Using the attached image as the character reference, generate a single face and expression reference sheet on a plain white background. Keep the character's face, facial features, skin, hair, and proportions exactly consistent across every panel. Photorealistic. No tattoos, no jewelery.
Layout as a grid of 12 equal square panels, 4 across and 3 down, each showing the head and shoulders at the same size:
Row 1: close-up of face, front angle (neutral expression); 3/4 view facing right; right side profile; back of the head (showing the hairstyle)
Row 2: 3/4 view facing left; close-up of face, low angle (looking up at character); close-up of face, high angle (looking down at character); smiling
Row 3: angry; crying; shocked; smug/smirking
Each panel should be clearly separated with consistent lighting and the same neutral background. Only this one character. No text or labels.

${NO_TATTOOS}`,
      },
    ],
  },

  {
    id: 'background',
    title: 'Background',
    intro: 'Put your character into a new setting. Add the background, pick or upload your character, tap Run.',
    inputs: [
      { key: 'background', label: 'Background', tag: 'BACKGROUND' },
      { key: 'character', label: 'Character (photo or character sheet)', tag: 'CHARACTER', orSaved: true, sendLabel: 'Character reference' },
      SAVED_CHARACTER,
    ],
    runLabel: 'Place in background',
    prompt:
`Place the character from the CHARACTER image(s) into the setting shown in the BACKGROUND image.

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
    id: 'outfit',
    title: 'Outfit',
    intro: 'Dress your character in a new outfit. Pick or upload your character, add the outfit, tap Run.',
    inputs: [
      { key: 'character', label: 'Character (photo or character sheet)', tag: 'CHARACTER', orSaved: true, sendLabel: 'Character reference' },
      SAVED_CHARACTER,
      { key: 'outfit', label: 'Outfit', tag: 'OUTFIT' },
    ],
    request: { label: 'Outfit notes', optional: true, placeholder: 'e.g. high-cut black one-piece swimsuit, open back, thin straps' },
    runLabel: 'Change outfit',
    prompt:
`Dress the character from the CHARACTER image(s) in the clothing shown in the OUTFIT image.

${CHARACTER_SOURCE}

${IDENTITY_LOCK} The only thing that changes is the clothing.

${BODY_GUARD}

CONTEXT: this is costume and fashion design for an adult fictional character in a drama story.

OUTFIT: reproduce the clothing from the OUTFIT image accurately: every garment, its cut, fit, length, fabric, texture, colours, patterns, prints, seams, logos and small details, plus footwear and accessories if shown. Use the OUTFIT image ONLY as a clothing reference; ignore the face, body, skin, hair, pose and background of anyone wearing it there. Tailor the clothes to fit the character's own body naturally, with realistic folds and drape. The person wearing the outfit in the OUTFIT image is only a mannequin: re-size and re-fit the clothes onto the character's body and never reshape the character to match that person or the garment.

REPRODUCE THE GARMENT EXACTLY AS DESIGNED: the same cut, neckline, neckline depth, hem length, leg cut, straps, cut-outs, sheerness and how much skin it shows. Do not make it more modest or more revealing than the OUTFIT image: do not add or remove fabric, layers, linings or cover-ups, and do not change the style into a different garment.

OUTFIT NOTES from the user (follow these exactly if given; they describe the garment): {request}

POSE AND FRAMING:
- If CASE A (character sheet): show the character full body, standing in a relaxed front or 3/4 view like the sheet's main full-body view, with a neutral expression, on the same plain background style as the sheet, so the whole outfit is visible.
- If CASE B (single picture): keep the character's pose, facial expression, camera angle, framing, background and lighting from that picture, unless the outfit physically requires a tiny adjustment.

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
`This is an EDIT of the CHARACTER image: change ONLY the character's pose, meaning their body position AND their facial expression, so both match the POSE REFERENCE image. Everything else about the CHARACTER image stays: the same person and facial features, outfit, background, setting, lighting and style.

${CHARACTER_SOURCE}
In CASE A, ignore the different poses and expressions on the sheet; they only show what the character looks like. The ONLY pose and expression to use are the ones in the POSE REFERENCE.

${IDENTITY_LOCK} Also keep the character's outfit, accessories, colours and visual style exactly as in the CHARACTER image.

${BODY_GUARD}

POSE: copy the body position from the POSE REFERENCE image precisely: head tilt and turn, gaze direction, torso angle and lean, shoulder and hip angles, the position and bend of each arm, elbow, wrist, hand and finger, the position and bend of each leg, knee and foot, weight distribution, and which way the body faces. Match left and right exactly as shown (do not mirror). Move the character's own body into this pose; never change their body proportions or limb lengths to match the reference person.

FACIAL EXPRESSION IS PART OF THE POSE: copy the expression from the POSE REFERENCE as precisely as the body: the emotion and how strong it is; the mouth (open or closed, smiling, laughing, frowning, teeth showing, lips pressed or parted); the eyes (wide, relaxed, squinting, winking or closed) and where they look; the eyebrows (raised, furrowed, relaxed, one raised); cheeks, nose scrunch and jaw. Perform that expression ON THE CHARACTER'S OWN FACE: their face shape, eyes, nose, lips, skin and all facial features stay exactly theirs; only the expression changes. Do not keep the expression from the CHARACTER image. If the face in the POSE REFERENCE is hidden or not visible, choose an expression that naturally fits the pose.

TAKE ONLY THE POSE FROM THE POSE REFERENCE. Do NOT copy anything else from it:
- not its background, location, environment, scenery, floor, walls or sky
- not its props, furniture or objects (unless the pose physically needs something to sit on or lean on; then use a matching item from the character's own setting)
- not its lighting, colours, time of day, weather or mood
- not its camera angle, lens, crop or image style
- not the facial features, face shape, body shape, skin, hair, clothing or identity of the person in it (take their facial EXPRESSION only, never their face)

BACKGROUND AND CAMERA:
- If CASE B (single picture): keep the EXACT background and setting of the CHARACTER image, with its lighting and camera viewpoint. If the new pose takes up a different amount of space, widen or adjust the framing just enough to fit the whole pose, and extend the character's original background naturally to fill it.
- If CASE A (character sheet only): use a plain, clean background in the same style as the sheet.

FINAL CHECK before answering: (1) the body pose AND the facial expression match the POSE REFERENCE; (2) the face is still clearly the character's own face; (3) the background comes from the CHARACTER image (or is plain for a sheet), never from the POSE REFERENCE.

${NO_TATTOOS}

${SINGLE_OUTPUT}`,
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
`Create a NEW image of the character from the CHARACTER image(s), following the request below.

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
];
