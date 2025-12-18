Android permission examples to request read access (JS)

Bare React Native (PermissionsAndroid):

```js
import { PermissionsAndroid, Alert } from 'react-native';

export async function requestReadPermission() {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      {
        title: 'Read files permission',
        message: 'App needs access to read files to convert PDFs to images',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn(err);
    return false;
  }
}
```

Expo-managed (recommended for Expo):

```js
import * as MediaLibrary from 'expo-media-library';

export async function requestExpoReadPermission() {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === 'granted';
}
```

Usage pattern in UI (before calling conversion):

```js
const ok = await requestExpoReadPermission();
if (!ok) {
  Alert.alert('Permission needed', 'Please grant read permission to convert PDFs');
  return;
}
await PdfToImage.convert(selectedPdf.uri);
```
