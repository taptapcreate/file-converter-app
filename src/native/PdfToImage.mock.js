import * as FileSystem from 'expo-file-system/legacy';

// Small placeholder PNG (1x1 white pixel) base64
const PIXEL_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

async function writeMockImage(index) {
  const filename = `mock_pdf_page_${index}_${Date.now()}.png`;
  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, PIXEL_PNG_BASE64, { encoding: FileSystem.EncodingType.Base64 });
  return `file://${path}`;
}

export default {
  async convert(uri, options = {}) {
    // Simulate some pages for local testing
    const pages = 3;
    const out = [];
    for (let i = 0; i < pages; i++) {
      // write tiny placeholder images
      const p = await writeMockImage(i + 1);
      out.push(p);
    }
    // small artificial delay
    await new Promise((res) => setTimeout(res, 300));
    return out;
  },
};
