PDF to Image native integration

Overview

This project includes a JS fallback UI but requires a native module to perform reliable PDF→image conversion. Mobile platforms need native PDF rendering libraries (iOS: PDFKit, Android: PdfRenderer or MuPDF).

Recommended approach

1. Add or implement a native module that exposes a single method:

   - `convert(String filePathOrUri) -> String[] | String`
     - Accepts a file path or URI to a PDF and returns an array of file paths (or a JSON stringified array) pointing to generated image files (PNG/JPG).
     - The module should write images to the app cache or files directory and return absolute paths.

2. Example module name / interface

   - Module name: `PdfToImage`
   - Method signature (Android / iOS): `convert(String uri) -> Promise<Array<String>>`

3. Installation

   - This guide focuses on on-device native implementations (Android/iOS) that perform PDF→image conversion entirely offline. You do not need an external API or network service to convert PDFs — native rendering (Android PdfRenderer, iOS PDFKit) is sufficient.
   - If you choose to use a third-party native package, follow that package's README; however, all sample snippets here show how to implement the feature without depending on external services.

4. Expo-managed apps

   - Because this feature depends on native code, you must prebuild and produce a native build. Use EAS Build or convert the app to the bare workflow.

```bash
# Prebuild (creates android/ios folders)
npx expo prebuild
# Then build with EAS
eas build --platform android
eas build --platform ios
```

User interactions (saving & sharing)

   - After conversion the app displays thumbnails of extracted pages. Tap a thumbnail to open options:
     - **Save to Gallery** — saves the image to the user's photo library (the app requests media permissions when needed).
     - **Share** — uses the system share sheet to share the image file with other apps.
   - If `Save to Gallery` fails, check permissions (see `docs/PDF_TO_IMAGE_PERMISSIONS.md`) and confirm the native module created files in the app cache. The app now attempts to copy files to the app cache before saving/sharing to maximize compatibility with different URI schemes (file://, content://, etc.).

5. Notes for implementers

   - Return absolute file paths. The app will normalize to `file://` URIs for display.
   - Android: Document pickers often return `content://` URIs. The Android sample includes a `copyUriToTempFile` helper that attempts to take persistable read permission and copies content to a temp file in the app cache.
   - Output scaling: Native snippets (Android/iOS) now scale generated images down to a default maximum side length of **1200px** to reduce memory usage and avoid OOMs. Adjust the helper or native implementation if you need larger images.
   - Permissions: If a file is on external storage (not in app cache), ensure the app has read permissions. On Android 13+ that's `READ_MEDIA_IMAGES`; on older Android versions use `READ_EXTERNAL_STORAGE`. For Expo apps use `PermissionsAndroid` (bare RN) or `MediaLibrary.requestPermissionsAsync()` (Expo) to request permissions before calling `PdfToImage.convert`.

6. Debugging

   - On Android use `adb shell ls` to inspect generated files.
   - On iOS, log file URLs returned by the native module.

7. Example native snippets

   - This repository includes example native implementations under `docs/native-snippets` to help you get started:
     - `docs/native-snippets/android/PdfToImageModule.kt` — example Kotlin implementation using `PdfRenderer`.
     - `docs/native-snippets/ios/PdfToImageModule.swift` — example Swift implementation using `PDFKit`.

   - These are sample snippets to help bootstrap your native module. The Android example now includes a `copyUriToTempFile` helper to support `content://` URIs returned by pickers — no external APIs required. After adding native code, run `npx expo prebuild` and build via EAS on Expo-managed projects.

8. Security


If you want, I can scaffold a small native module interface (JS wrapper) and provide example Android/iOS snippets for `PdfToImage.convert`. Let me know if you'd like that.

---

## JS wrapper and usage

This repository includes a minimal JS wrapper at `src/native/PdfToImage.js` which delegates to the native `PdfToImage` module and normalizes returned URIs.

Usage example (already wired in the app):

```js
import PdfToImage from '../native/PdfToImage';

// You can optionally pass `{ maxDim: <pixels> }` to request a maximum output size
const images = await PdfToImage.convert(selectedPdf.uri, { maxDim: 1200 });
// `images` will be an array of `file://` URIs usable by <Image source={{uri}} />
```

If the wrapper throws an error saying the native module is not installed, follow the steps above to implement or enable the native module and run `npx expo prebuild` / build with EAS to include native code. The JS wrapper falls back to a dev mock when running in development so you can test UI flows without native builds.
