// Talks to Google's Gemini API (Nano Banana 2) to generate images.
// Docs: https://ai.google.dev/gemini-api/docs/image-generation

const Gemini = {
  // Turns a File from an <input type="file"> into the base64 text the API wants.
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]); // drop "data:image/png;base64,"
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // Sends the prompt + reference images, returns a list of generated images as data URLs.
  async generate({ apiKey, model, prompt, files, aspectRatio, imageSize }) {
    const parts = [{ text: prompt }];
    for (const file of files) {
      parts.push({
        inline_data: { mime_type: file.type || 'image/png', data: await this.fileToBase64(file) },
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: { aspectRatio, imageSize },
        },
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error?.message || `Request failed (HTTP ${res.status})`);
    }

    const images = [];
    let text = '';
    for (const part of data.candidates?.[0]?.content?.parts || []) {
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
