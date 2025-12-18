import { NativeModules, Platform } from 'react-native';

/**
 * JS wrapper for the native PdfToImage module.
 * Exposes `convert(uri)` which returns a Promise resolving to an array of file:// URIs.
 * Falls back to a dev-only mock if the native module is absent (so UI can be tested without EAS/native builds).
 */
const Native = NativeModules.PdfToImage;
let DevMock = null;
if ((!Native || typeof Native.convert !== 'function') && __DEV__) {
    try { DevMock = require('./PdfToImage.mock').default; } catch (e) { DevMock = null; }
}

const ensureFileUri = (p) => {
    if (!p) return null;
    if (p.startsWith('file://')) return p;
    return `file://${p}`;
};

export default {
    async convert(uri, options = {}) {
        const maxDim = Number(options?.maxDim) || 0; // 0 means native default

        if (Native && typeof Native.convert === 'function') {
            let arg = uri;
            // Some Android implementations expect raw path without file://
            if (Platform.OS === 'android' && arg && arg.startsWith('file://')) {
                arg = arg.replace('file://', '');
            }

            // Try calling native convert with (uri, maxDim)
            try {
                const result = await Native.convert(arg, maxDim);

                // Normalize results: could be array, string (json), or single path
                let images = [];
                if (Array.isArray(result)) images = result;
                else if (typeof result === 'string') {
                    try { images = JSON.parse(result); } catch { images = [result]; }
                } else if (result) images = [result];

                const normalized = images.map(ensureFileUri).filter(Boolean);
                return normalized;
            } catch (err) {
                // Fallback: try calling native convert with single arg for backwards compatibility
                try {
                    const result = await Native.convert(arg);
                    let images = [];
                    if (Array.isArray(result)) images = result;
                    else if (typeof result === 'string') {
                        try { images = JSON.parse(result); } catch { images = [result]; }
                    } else if (result) images = [result];

                    const normalized = images.map(ensureFileUri).filter(Boolean);
                    return normalized;
                } catch (err2) {
                    throw err; // rethrow original
                }
            }
        }

        if (DevMock && typeof DevMock.convert === 'function') {
            console.warn('PdfToImage native module not found — using dev mock (only in dev builds).');
            const result = await DevMock.convert(uri, { maxDim });
            return result;
        }

        throw new Error('Native module PdfToImage not installed. Please follow docs/PDF_TO_IMAGE_INTEGRATION.md.');
    }
};