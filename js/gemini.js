// Talks to Google's Gemini API (the Nano Banana models) to generate images.

// Turns Google's error replies into a message that says how to fix the problem.
function explainApiError(status, data, model) {
  const msg = data.error?.message || `Request failed (HTTP ${status})`;
  const reason = data.error?.status || '';
  const tips = {
    PERMISSION_DENIED:
      'Google refused this API key. Make a new key at aistudio.google.com/apikey and paste it in Settings. ' +
      'If you made the key in Google Cloud Console instead, open the key there and check that "Generative Language API" ' +
      'is enabled and allowed, and that any website restriction includes this site.',
    INVALID_ARGUMENT: /api key/i.test(msg)
      ? 'The API key is wrong or incomplete. Copy it again from aistudio.google.com/apikey and paste it in Settings.'
      : 'The model rejected one of the settings. Open Model options and set them back to Default, and try Settings → Safety filter → Google default.',
    RESOURCE_EXHAUSTED:
      'You hit your usage limit. Wait a minute and try again. Image models may need billing turned on for your key in AI Studio.',
    NOT_FOUND: `The model "${model}" isn't available to your key. Tap Refresh model list in Settings and pick another.`,
  };
  const tip = tips[reason] || (status === 403 ? tips.PERMISSION_DENIED : '');
  return new Error(tip ? `${msg}\n→ ${tip}` : msg);
}

// Google's adjustable safety filters. The app can set these (Settings > Safety filter).
// Google's fixed image filter is separate and can't be changed by any app.
const SAFETY_CATEGORIES = [
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
];

// Explains, in plain words, why a request came back without an image.
function explainNoImage(data, text) {
  const candidate = data.candidates?.[0] || {};
  const reason = candidate.finishReason || data.promptFeedback?.blockReason || '';
  const blocked = [...(candidate.safetyRatings || []), ...(data.promptFeedback?.safetyRatings || [])]
    .filter((r) => r.blocked).map((r) => r.category.replace('HARM_CATEGORY_', '').replace(/_/g, ' ').toLowerCase());
  const why = {
    SAFETY: `Blocked by Google's ADJUSTABLE safety filter${blocked.length ? ` (${blocked.join(', ')})` : ''}. You can relax or turn it off in Settings → Safety filter.`,
    IMAGE_SAFETY: "Blocked by Google's FIXED image filter, which no app or setting can turn off. If the request is harmless, describing the outfit in plain fashion terms can help. Photos of real people are filtered more strictly than original characters.",
    PROHIBITED_CONTENT: "Blocked by Google's FIXED content rules, which no app or setting can turn off. Photos of real people are filtered more strictly than original characters.",
    IMAGE_PROHIBITED_CONTENT: "Blocked by Google's FIXED content rules, which no app or setting can turn off. Photos of real people are filtered more strictly than original characters.",
    BLOCKLIST: 'Blocked because the request contains a word Google does not allow. Try different wording.',
    RECITATION: 'Blocked because the result was too close to an existing copyrighted image. Try again or change the request.',
    IMAGE_RECITATION: 'Blocked because the result was too close to an existing copyrighted image. Try again or change the request.',
    NO_IMAGE: 'The model answered without making an image. Just try again.',
    STOP: 'The model replied with text instead of an image. Try again, or reword the request.',
  }[reason];
  const parts = [why || (reason ? `No image returned (${reason}). Try again.` : 'No image returned. Try again.')];
  if (text) parts.push(`The model said: "${text.trim().slice(0, 300)}"`);
  return new Error(parts.join('\n'));
}

const Gemini = {
  // Turns an image file into the base64 text the API wants.
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]); // drop "data:image/png;base64,"
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },

  // parts:   the mix of text and images to send, e.g. [{ text }, { blob }, ...]
  // options: only the settings you changed; anything left on "default" isn't sent,
  //          so the model uses its own default.
  async generate({ apiKey, model, parts, options = {} }) {
    const apiParts = [];
    for (const p of parts) {
      if (p.text) apiParts.push({ text: p.text });
      else apiParts.push({ inline_data: { mime_type: p.blob.type || 'image/png', data: await this.blobToBase64(p.blob) } });
    }

    const generationConfig = {
      responseModalities: options.imageOnly ? ['IMAGE'] : ['TEXT', 'IMAGE'],
    };
    const imageConfig = {};
    if (options.aspectRatio) imageConfig.aspectRatio = options.aspectRatio;
    if (options.imageSize) imageConfig.imageSize = options.imageSize;
    if (Object.keys(imageConfig).length) generationConfig.imageConfig = imageConfig;
    if (options.thinkingLevel) generationConfig.thinkingConfig = { thinkingLevel: options.thinkingLevel };
    for (const k of ['temperature', 'topP', 'topK', 'seed']) {
      if (options[k] !== undefined && options[k] !== '') generationConfig[k] = Number(options[k]);
    }

    const body = { contents: [{ parts: apiParts }], generationConfig };
    if (options.googleSearch) body.tools = [{ google_search: {} }];
    // Adjustable safety filter level from Settings ('' = let Google decide).
    if (options.safety) body.safetySettings = SAFETY_CATEGORIES.map((category) => ({ category, threshold: options.safety }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw explainApiError(res.status, data, model);

    const images = [];
    let text = '';
    for (const part of data.candidates?.[0]?.content?.parts || []) {
      if (part.thought) continue; // skip the model's draft "thinking" images
      const img = part.inlineData || part.inline_data;
      if (img) images.push(`data:${img.mimeType || img.mime_type};base64,${img.data}`);
      else if (part.text) text += part.text;
    }
    if (!images.length) throw explainNoImage(data, text);
    return images;
  },

  // Asks a regular Gemini TEXT model to describe pictures (used for "Describe the room with AI").
  // Tries the newest Flash model first, then a fixed name in case the alias isn't available.
  async describe({ apiKey, images, prompt }) {
    const parts = [];
    for (const blob of images) parts.push({ inline_data: { mime_type: blob.type || 'image/jpeg', data: await this.blobToBase64(blob) } });
    parts.push({ text: prompt });
    let lastError;
    for (const model of ['gemini-flash-latest', 'gemini-2.5-flash']) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ contents: [{ parts }] }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) { lastError = explainApiError(res.status, data, model); continue; }
      if (!res.ok) throw explainApiError(res.status, data, model);
      const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
      if (!text) throw new Error('The AI did not return a description. Try again.');
      return text;
    }
    throw lastError;
  },
};
