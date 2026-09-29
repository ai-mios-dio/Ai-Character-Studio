// Ready-made choices used by the tools: makeup styles and gallery outfits.
// To add one, copy an entry and change it. `desc` is what the AI is told, so be specific.

// Makeup looks, researched from current beauty trend coverage (2025–2026) plus classic styles.
const MAKEUP_STYLES = [
  {
    name: 'Natural / No-makeup makeup',
    desc: 'Barely-there, skin-first look. Sheer tinted base that lets real skin texture and a few freckles show, concealer only where needed. Brushed-up natural brows. A light wash of neutral taupe on the lids, thin brown mascara, no visible liner. Soft peachy-pink cream blush high on the cheeks. Lips in a my-lips-but-better tinted balm.',
  },
  {
    name: 'Clean Girl',
    desc: 'Fresh, polished, model-off-duty look. Very sheer glowy base, dewy highlight on the cheekbones and nose bridge. Laminated, brushed-up fluffy brows set with clear gel. No eyeshadow or just a sheen of champagne, curled lashes with one coat of black mascara, no liner. Warm cream bronzer lightly on the cheekbones and a soft rosy cream blush. Glossy nude-pink lips with a clear gloss.',
  },
  {
    name: 'Glass Skin (K-beauty)',
    desc: 'Ultra-dewy, poreless, reflective skin that looks lit from within, with a wet-looking sheen on the cheekbones, nose and forehead. Minimal colour: straight soft brows, a sheer shimmer on the lids, subtle brown puppy liner, natural lashes. Rosy flush on the apples of the cheeks. Juicy gradient lip tint (deeper in the centre, fading outward) with a glossy finish.',
  },
  {
    name: 'Korean (K-beauty) soft',
    desc: 'Youthful, soft and natural. Dewy luminous base with a fresh, even tone. Straight, soft, feathery brows. Soft peach or pink eyeshadow, a thin brown puppy-eye liner that follows the lash line and angles slightly down, lightly defined aegyo sal (a soft shimmery highlight with a faint shadow under the lower lash line so the under-eye looks gently puffy). Rosy blush on the apples of the cheeks. Blurred gradient lip: coral or rose tint concentrated in the centre, softly fading out.',
  },
  {
    name: 'Douyin',
    desc: 'Chinese social-media glam: doll-like and polished. Porcelain-smooth, almost airbrushed skin with a soft glow. Sharper, sculpted feathery brows. Big dramatic eyes: warm rosy-brown shadow, glitter on the centre of the lid, puppy-eye liner, strongly defined aegyo sal with sparkle, bold separated upper lashes and clearly drawn lower lashes, small sparkle on the inner corners. Pink blush placed high under the eyes and across the nose bridge. Soft contour, highlight on the nose tip. Vivid gradient lip in deep rose or cherry red, fuller in the centre.',
  },
  {
    name: 'Latina',
    desc: 'Bold, warm and glamorous. Flawless matte-to-satin full-coverage base with a warm sun-kissed bronze: bronzer on the temples, cheekbones and jawline, sculpted contour. Full, defined, brushed-up and laminated-looking brows. Warm brown, bronze and gold eyeshadow deepened in the outer corners, a sharp thick winged liner that extends well past the outer corner, voluminous false lashes. Warm coral or terracotta blush. Signature lips: dark brown lip liner slightly overlined, blended into a nude caramel-brown lipstick, finished with gloss in the centre.',
  },
  {
    name: 'Soft Glam',
    desc: 'Polished and camera-ready but soft. Smooth, satin, full-coverage skin with a soft-focus glow and subtle contour. Groomed, defined brows. Blended neutral eyeshadow (champagne on the lid, soft taupe and warm brown in the crease), a thin soft-brown or black liner smudged at the outer corner, wispy false lashes. Soft rosy-peach blush draped up toward the temples, gentle highlight. Nude-pink or mauve lip, lined and softly blended, satin finish.',
  },
  {
    name: 'Full Glam (Instagram)',
    desc: 'Maximum glam. Flawless full-coverage matte base, sharply carved contour, bright under-eye highlight, intense glowing highlighter on the cheekbones and nose. Sharp, sculpted, fully drawn brows. Dramatic cut-crease eyeshadow in deep brown with a shimmering gold or champagne lid, sharp black winged liner, dramatic full false lashes top and bottom. Overlined lips with a dark liner and a matte nude lipstick, or glossy centre.',
  },
  {
    name: 'Latte makeup',
    desc: 'Warm, monochrome coffee tones everywhere. Glowy bronzed skin. Eyes washed in latte, caramel and espresso browns, a soft smoked brown liner, brown mascara look. Warm bronzer used as blush, a caramel highlight. Lips lined in espresso brown, filled with a milky latte nude and a touch of gloss.',
  },
  {
    name: 'Siren Eyes',
    desc: 'Sultry, elongated, lifted eyes. Smooth matte base, softly sculpted cheeks. Dark brown or black liner tight-lined on both upper and lower waterlines, a small pointed inner-corner wing and a sharp outer wing that pull the eye outward and up, smoky brown shadow blended along the outer lid. Long, fanned-out lashes. Muted blush. Lips in a neutral nude or soft mauve so the eyes stay the focus.',
  },
  {
    name: 'Mob Wife',
    desc: 'Bold, luxurious, glamorous 80s-90s Italian-American style. Matte full-coverage skin, strong bronzer and contour, heavy blush. Bold arched brows. Dramatic smoky eye in black, grey and gunmetal with a defined crease and a metallic gold or bronze lid, siren-style black liner on top and bottom waterlines, big voluminous lashes. Dark lip liner with a deep maroon, burgundy or brick-red lipstick.',
  },
  {
    name: 'Cold Girl',
    desc: 'Looks like a brisk walk on a chilly day. Natural, lightly matte base. Rosy pink cream blush flushed across the cheeks and the bridge and tip of the nose, a touch of it on the eyelids. Shimmery icy highlight on the cheekbones and inner corners. Fluffy natural brows, soft brown mascara, no heavy liner. Windswept rosy, slightly stained lips with a balm finish.',
  },
  {
    name: 'Strawberry Girl',
    desc: 'Sweet, summery and fresh. Luminous, dewy skin. Strawberry-pink blush on the cheeks and across the nose, with soft shimmer on top of the cheekbones. Soft scattered faux freckles over the nose and cheeks. Pink-red tones on the lids, fluttery lashes. Glossy juicy pink or strawberry-red lips.',
  },
  {
    name: '90s Supermodel',
    desc: 'Iconic 90s runway look. Super-matte, velvety skin with sculpted, shadowy contour. Thin, defined, groomed brows. Smoky brown eyeshadow in taupe and espresso, smudged brown-black liner around the eyes, defined lashes. Warm brown-toned blush. The signature lip: dark brown lip liner, slightly overlined for symmetrical full lips, with a nude-brown matte or satin lipstick and a little gloss in the centre.',
  },
  {
    name: 'Old Hollywood',
    desc: 'Classic 1940s-50s film-star glamour. Flawless porcelain-smooth matte base with a soft glow. Defined, groomed arched brows. Clean ivory or soft shimmer lids with a soft brown crease, a precise black winged liner flicked toward the temple, fluttery false lashes. Subtle rosy blush, soft highlight. Crisp, perfectly lined, opaque classic red lipstick with a velvet finish.',
  },
  {
    name: 'Classic Smoky Eye',
    desc: 'Timeless evening look. Smooth, even satin base, soft contour. Defined brows. Deep charcoal-to-black eyeshadow smoked out from the lash line, blended into grey and taupe in the crease with no harsh edges, black kohl on the waterlines, heavy mascara. Neutral blush. Pale nude or soft pink lips to balance the eyes.',
  },
  {
    name: 'Chrome / Metallic Eyes',
    desc: 'Modern 2026 statement eyes. Fresh, radiant, lightweight skin. Groomed brows. Mirror-like chrome or high-shine metallic eyeshadow (silver, gold or rose-gold) across the whole lid, a thin graphic liner, a touch of shimmer on the inner corners, defined lashes. Soft glowy blush. Blurred, soft-focus nude or berry lip so the eyes shine.',
  },
  {
    name: '80s Blue Eyeshadow (revival)',
    desc: 'Retro revival updated for 2026. Radiant skin. Bold, saturated cobalt or electric-blue eyeshadow swept over the lids, blended up toward the brow bone, a pop of blue on the lower lash line, black mascara. Strong rosy blush draped up onto the temples. Glossy pink or berry lips.',
  },
  {
    name: 'Graphic Liner',
    desc: 'Artistic editorial look. Clean, even, radiant skin kept minimal. Neat brushed-up brows. A crisp graphic eyeliner design: a floating crease line and a sharp extended wing, in black or a soft shade like mocha brown, slate blue or olive. Bare or softly tinted lids, defined lashes. Soft neutral blush. Blurred natural-pink or nude lips.',
  },
  {
    name: 'Romantic / Bridal',
    desc: 'Soft, romantic and luminous. Radiant, flawless, long-wearing satin base with a gentle glow. Softly defined brows. Rose-gold and champagne shimmer on the lids, soft brown definition in the crease, a thin tight-lined brown-black liner, wispy false lashes. Rosy-peach blush, soft glowing highlight. Lips in a soft rose or pink-nude, lined and satin.',
  },
  {
    name: 'Goth / Grunge',
    desc: 'Dark and edgy. Pale, matte skin, cool-toned contour. Strong dark brows. Heavy black smudged kohl liner all around the eyes, smoky black and deep plum shadow, clumpy black mascara, slightly lived-in edges. Little or no blush. Deep black-cherry, oxblood or dark plum lips, matte.',
  },
];

// Gallery outfits. Descriptions stick to plain fashion terms: garments, cut, colour, fabric.
const OUTFITS = [
  // Casual
  { id: 'white-tee-jeans', cat: 'Casual', name: 'White tee & jeans', desc: 'Fitted plain white crew-neck T-shirt tucked into high-waisted straight-leg mid-blue denim jeans, brown leather belt, clean white leather sneakers.' },
  { id: 'hoodie-joggers', cat: 'Casual', name: 'Hoodie & joggers', desc: 'Oversized heather-grey pullover hoodie with front pocket, matching grey tapered joggers with cuffed ankles, chunky white sneakers.' },
  { id: 'sundress', cat: 'Casual', name: 'Summer sundress', desc: 'Light floral-print cotton sundress with thin spaghetti straps, square neckline, fitted bodice and flowy knee-length skirt, flat tan leather sandals.' },
  { id: 'denim-jacket', cat: 'Casual', name: 'Denim jacket layers', desc: 'Light-wash denim jacket worn open over a black ribbed tank top, black skinny jeans, black ankle boots.' },
  { id: 'crop-top-cargo', cat: 'Casual', name: 'Crop top & cargos', desc: 'Fitted white cropped tank top, low-rise olive-green cargo pants with side pockets, chunky sneakers.' },

  // Night out
  { id: 'lbd', cat: 'Night out', name: 'Little black dress', desc: 'Classic fitted black mini dress with a sweetheart neckline and thin straps, sheer black tights, black pointed-toe stiletto heels.' },
  { id: 'satin-slip', cat: 'Night out', name: 'Satin slip dress', desc: 'Champagne-coloured bias-cut satin slip dress with thin straps and a cowl neckline, midi length, strappy gold heeled sandals.' },
  { id: 'leather-mini', cat: 'Night out', name: 'Leather jacket & mini', desc: 'Black leather biker jacket over a black lace-trim camisole, black leather mini skirt, black knee-high boots.' },
  { id: 'sequin-party', cat: 'Night out', name: 'Sequin party dress', desc: 'Silver sequin mini dress with long sleeves and a high neckline, sparkling all over, silver strappy heels.' },
  { id: 'bodycon', cat: 'Night out', name: 'Bodycon dress', desc: 'Figure-hugging deep-red ribbed bodycon dress, one-shoulder neckline, above-knee length, nude strappy heels.' },

  // Formal
  { id: 'red-gown', cat: 'Formal', name: 'Red evening gown', desc: 'Floor-length red satin evening gown with an off-the-shoulder neckline, fitted bodice and a high front leg slit, red stiletto heels.' },
  { id: 'cocktail', cat: 'Formal', name: 'Cocktail dress', desc: 'Emerald-green velvet cocktail dress, fitted with a V-neckline and cap sleeves, knee length, black suede pumps.' },
  { id: 'power-suit', cat: 'Formal', name: 'Power suit', desc: 'Tailored camel-beige double-breasted blazer and matching wide-leg trousers, white silk camisole underneath, nude pointed-toe pumps.' },
  { id: 'tuxedo', cat: 'Formal', name: 'Black tuxedo', desc: 'Classic black tuxedo with satin peak lapels, crisp white dress shirt, black bow tie, black patent leather shoes.' },
  { id: 'mens-suit', cat: 'Formal', name: 'Navy suit', desc: 'Slim-fit navy blue two-piece suit, light blue dress shirt, burgundy silk tie, brown leather oxford shoes.' },

  // Swim & beach
  { id: 'one-piece', cat: 'Swim & beach', name: 'One-piece swimsuit', desc: 'Black one-piece swimsuit with a scoop neckline, high-cut leg openings and an open low back, thin straps.' },
  { id: 'bikini', cat: 'Swim & beach', name: 'Bikini', desc: 'Classic triangle bikini in solid white: triangle top with thin straps tied at the neck and back, matching side-tie bottoms.' },
  { id: 'beach-coverup', cat: 'Swim & beach', name: 'Beach cover-up', desc: 'Coral bikini under a sheer white open kimono-style beach cover-up, a patterned sarong tied at the hip, straw sun hat, flat sandals.' },
  { id: 'mens-swim', cat: 'Swim & beach', name: 'Swim shorts', desc: 'Mid-thigh navy swim shorts with a drawstring waist, open short-sleeve linen shirt in white, slide sandals.' },

  // Active
  { id: 'gym-set', cat: 'Active', name: 'Gym set', desc: 'Matching sage-green seamless sports bra and high-waisted leggings, white athletic sneakers.' },
  { id: 'tennis', cat: 'Active', name: 'Tennis whites', desc: 'White pleated tennis skirt, fitted white polo shirt, white sneakers with ankle socks, white visor.' },
  { id: 'running', cat: 'Active', name: 'Running gear', desc: 'Black running shorts, fitted grey technical T-shirt, bright running shoes, sport watch.' },

  // Lounge & sleep
  { id: 'silk-pajamas', cat: 'Lounge & sleep', name: 'Silk pajamas', desc: 'Two-piece dusty-pink silk pajama set: long-sleeve button-up top with piped collar and matching long trousers, satin slippers.' },
  { id: 'satin-robe', cat: 'Lounge & sleep', name: 'Satin robe', desc: 'Knee-length black satin robe with wide sleeves, tied at the waist with a sash, over a matching satin slip nightdress.' },
  { id: 'cozy-knit', cat: 'Lounge & sleep', name: 'Cozy knit set', desc: 'Oversized cream cable-knit sweater and matching knit lounge shorts, fluffy socks.' },

  // Work
  { id: 'office', cat: 'Work', name: 'Office blouse & skirt', desc: 'White silk button-up blouse tucked into a high-waisted charcoal pencil skirt, knee length, black pointed pumps.' },
  { id: 'scrubs', cat: 'Work', name: 'Medical scrubs', desc: 'Ceil-blue medical scrubs: V-neck short-sleeve top and matching straight-leg pants, white clogs.' },
  { id: 'business-casual', cat: 'Work', name: 'Business casual', desc: 'Fitted light-blue oxford shirt with sleeves rolled, tan chino trousers, brown leather loafers and belt.' },

  // Styles
  { id: 'old-money', cat: 'Styles', name: 'Old money', desc: 'Cream cable-knit sweater draped over the shoulders, white collared shirt, tailored beige wide-leg trousers, brown leather loafers, a thin gold watch.' },
  { id: 'streetwear', cat: 'Styles', name: 'Streetwear', desc: 'Oversized black graphic-free T-shirt, baggy light-wash jeans, black puffer vest, high-top sneakers, black cap.' },
  { id: 'y2k', cat: 'Styles', name: 'Y2K', desc: 'Baby-pink velour cropped zip hoodie, matching low-rise velour flared pants, small shoulder bag, platform sneakers.' },
  { id: 'goth', cat: 'Styles', name: 'Goth', desc: 'Black lace long-sleeve top, black corset belt, long black tiered skirt, black platform boots, silver buckles.' },
  { id: 'western', cat: 'Styles', name: 'Western', desc: 'Tan suede fringe jacket, white fitted top, high-waisted flared blue jeans, brown leather cowboy boots, cowboy hat.' },
  { id: 'boho', cat: 'Styles', name: 'Boho', desc: 'Flowy white embroidered peasant blouse, long tiered rust-coloured maxi skirt, layered brown leather sandals, wide-brim hat.' },
];
