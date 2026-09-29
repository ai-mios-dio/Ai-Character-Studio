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
    title: 'Background Swap',
    intro: 'Put your character into a new setting. Upload the background, upload the character, tap Run.',
    inputs: [
      { key: 'background', label: 'Background', tag: 'BACKGROUND' },
      { key: 'character', label: 'Character', tag: 'CHARACTER' },
    ],
    runLabel: 'Swap background',
    prompt:
`Place the character from the CHARACTER image(s) into the setting shown in the BACKGROUND image, completely replacing the character's original background.

${IDENTITY_LOCK} Also keep the character's outfit, accessories, colours, pose, facial expression and camera angle exactly as in the CHARACTER image.

BACKGROUND: recreate the environment from the BACKGROUND image faithfully: same location, architecture, objects, colours, time of day and mood. Ignore any people who appear in the BACKGROUND image.

INTEGRATION: match the background's lighting direction, colour temperature, shadows, reflections, perspective, camera height, scale and depth of field so the character looks naturally photographed in that place, with correct contact shadows where they touch the ground. Keep the visual style of the CHARACTER image (photo stays photo, illustration stays illustration).

Output one single image containing only this one character. No extra people, no duplicates, no text, no borders, no watermark.`,
  },

  {
    id: 'outfit',
    title: 'Outfit Swap',
    intro: 'Dress your character in a new outfit. Upload the character, upload the outfit, tap Run.',
    inputs: [
      { key: 'character', label: 'Character', tag: 'CHARACTER' },
      { key: 'outfit', label: 'Outfit', tag: 'OUTFIT' },
    ],
    runLabel: 'Swap outfit',
    prompt:
`Dress the character from the CHARACTER image(s) in the clothing shown in the OUTFIT image.

${IDENTITY_LOCK} The only thing that changes is the clothing.

OUTFIT: reproduce the clothing from the OUTFIT image accurately: every garment, its cut, fit, length, fabric, texture, colours, patterns, prints, seams, logos and small details, plus footwear and accessories if shown. Use the OUTFIT image ONLY as a clothing reference; ignore the face, body, skin, hair, pose and background of anyone wearing it there. Tailor the clothes to fit the character's own body naturally, with realistic folds and drape. Never reshape the body to fit the outfit.

Keep the character's pose, facial expression, camera angle, framing, background and lighting from the CHARACTER image unless the outfit physically requires a tiny adjustment.

Output one single image containing only this one character. No extra people, no duplicates, no text, no borders, no watermark.`,
  },

  {
    id: 'scene',
    title: 'Character Scene',
    intro: 'Upload a character sheet, describe what you want, and tap Run for a single new image of that character.',
    inputs: [{ key: 'sheet', label: 'Character sheet', tag: 'CHARACTER SHEET' }],
    request: { label: 'What do you want?', placeholder: 'e.g. sitting at a café table in Paris at golden hour, laughing, medium shot' },
    runLabel: 'Create image',
    prompt:
`The CHARACTER SHEET image is a reference sheet of ONE single character. Every panel, view, close-up and expression in it shows the SAME individual from different angles. It is NOT a group of different people, and its grid layout is NOT the desired output format.

Use the sheet only to learn this one character's identity. ${IDENTITY_LOCK} Keep their outfit too, unless the request below says to change it.

OUTPUT RULES:
- Generate ONE new, single, full-frame image that shows this character EXACTLY ONCE.
- Never copy the sheet's layout: no grid, panels, split screen, collage, turnaround, multiple views, multiple poses, or repeated copies of the character.
- Do not add any other people unless the request below explicitly asks for them. Other people must look clearly different from the character.
- No text, labels, captions, borders or watermark.

REQUEST:
{request}`,
  },
];
