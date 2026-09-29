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
      : 'The model rejected one of the settings. Open Model options and set them back to Default.',
    RESOURCE_EXHAUSTED:
      'You hit your usage limit. Wait a minute and try again. Image models may need billing turned on for your key in AI Studio.',
    NOT_FOUND: `The model "${model}" isn't available to your key. Tap Refresh model list in Settings and pick another.`,
  };
  const tip = tips[reason] || (status === 403 ? tips.PERMISSION_DENIED : '');
  return new Error(tip ? `${msg}\n→ ${tip}` : msg);
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
    if (!images.length) {
      const reason = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason;
      throw new Error(text || (reason ? `No image returned (${reason})` : 'No image returned'));
    }
    return images;
  },
};
