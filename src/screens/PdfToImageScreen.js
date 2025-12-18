import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    SafeAreaView,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import PdfToImage from '../native/PdfToImage';
import { usePro } from '../context/ProContext';
import { Colors, GlassStyles } from '../constants/colors';
import { FREE_LIMITS } from '../constants/limits';

export const PdfToImageScreen = () => {
    const { isDark, colors } = useTheme();
    const { isPro, checkLimit, incrementUsage } = usePro();
    const [selectedPdf, setSelectedPdf] = useState(null);
    const [isConverting, setIsConverting] = useState(false);
    const [convertedImages, setConvertedImages] = useState([]);
    const glassStyle = isDark ? GlassStyles.dark : GlassStyles.light;

    const pickPdf = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            // Handle multiple result shapes returned across SDKs/versions
            const getDoc = (res) => {
                if (!res) return null;
                // Modern expo-document-picker: { type: 'success', uri, name }
                if (res.type === 'success' && res.uri) return { uri: res.uri, name: res.name };
                // ImagePicker-like shape: { canceled: false, assets: [{ uri, name }] }
                if (res.canceled === false && Array.isArray(res.assets) && res.assets[0]) return { uri: res.assets[0].uri, name: res.assets[0].name };
                // Legacy or other fields
                if (res.uri) return { uri: res.uri, name: res.name };
                if (res.fileUri) return { uri: res.fileUri, name: res.name };
                if (res.file) return { uri: res.file, name: res.name };
                return null;
            };

            const doc = getDoc(result);
            if (doc && doc.uri) {
                setSelectedPdf({
                    uri: doc.uri,
                    name: doc.name || 'document.pdf',
                });
                setConvertedImages([]);
                // Give quick feedback to the user that the file was selected
                Alert.alert('Selected', `Selected ${doc.name || 'document.pdf'}`);
                return;
            }

            // If we reached here, no URI was found
            console.warn('DocumentPicker returned unexpected shape:', result);
            Alert.alert('Selection Error', 'Could not read the selected file. Please try a different file or location.');
        } catch (error) {
            console.error('pickPdf error', error);
            Alert.alert('Error', 'Failed to pick PDF');
        }
    };

    const convertToImages = async () => {
        if (!selectedPdf) {
            Alert.alert('No PDF', 'Please select a PDF first');
            return;
        }

        if (!checkLimit('PDF_TO_IMAGES')) {
            Alert.alert('Daily Limit Reached', 'Upgrade to Pro for unlimited conversions!');
            return;
        }

        setIsConverting(true);

        try {
            // Use JS wrapper which delegates to native implementation
            // Pass an optional maxDim so the native layer can scale images (0 => default)
            const images = await PdfToImage.convert(selectedPdf.uri, { maxDim: 1200 });

            if (Array.isArray(images) && images.length > 0) {                console.log('Conversion result images:', images);                setConvertedImages(images);
                incrementUsage('PDF_TO_IMAGES');
            } else {
                Alert.alert('No Images', 'No images were returned from the converter.');
            }
        } catch (error) {
            console.error('PDF->Image error', error);

            if (error && error.message && error.message.includes('not installed')) {
                Alert.alert(
                    'Native Module Required',
                    'PDF→Image conversion requires a native module. See the integration guide in the repository (docs/PDF_TO_IMAGE_INTEGRATION.md) and run an EAS/prebuild to enable this feature.'
                );
            } else {
                Alert.alert('Error', 'Failed to convert PDF to images');
            }
        } finally {
            setIsConverting(false);
        }
    };

    const shareImage = async (imageUri) => {
        try {
            const available = await Sharing.isAvailableAsync();
            if (!available) {
                Alert.alert('Sharing not available', 'Sharing is not available on this device');
                return;
            }

            // Ensure the image is a file:// URI that Sharing can access
            let uri = imageUri;
            if (!uri.startsWith('file://')) {
                const dest = `${FileSystem.cacheDirectory}shared_${Date.now()}.png`;
                try {
                    await FileSystem.copyAsync({ from: uri, to: dest });
                    uri = dest;
                } catch (copyErr) {
                    console.warn('shareImage: copyAsync failed, trying read/write fallback', copyErr);
                    try {
                        const data = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
                        await FileSystem.writeAsStringAsync(dest, data, { encoding: FileSystem.EncodingType.Base64 });
                        uri = dest;
                    } catch (rwErr) {
                        console.error('shareImage fallback failed', rwErr);
                        Alert.alert('Error', 'Unable to access image to share');
                        return;
                    }
                }
            }

            await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Image' });
        } catch (error) {
            console.error('shareImage error', error);
            Alert.alert('Error', `Failed to share image: ${error?.message || error}`, [
                { text: 'Copy Diagnostics', onPress: () => copyDiagnosticsToClipboard(imageUri, error) },
                { text: 'OK', style: 'cancel' },
            ]);
        }
    };

    const showImageOptions = (imageUri) => {
        Alert.alert('Image', 'Choose action', [
            { text: 'Save to Gallery', onPress: () => saveToGallery(imageUri) },
            { text: 'Share', onPress: () => shareImage(imageUri) },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const copyDiagnosticsToClipboard = async (imageUri, error) => {
        try {
            const info = await FileSystem.getInfoAsync(imageUri, { size: true });
            const diag = {
                selectedPdf: selectedPdf || null,
                imageUri,
                imageInfo: info,
                convertedImages,
                error: (error && (error.message || String(error))) || null,
            };
            const text = JSON.stringify(diag, null, 2);

            if (Clipboard && typeof Clipboard.setStringAsync === 'function') {
                await Clipboard.setStringAsync(text);
                console.log('Diagnostics copied:', text);
                Alert.alert('Diagnostics', 'Diagnostic info copied to clipboard. Paste it into the chat.');
                return;
            }

            // Fallback: clipboard module not available. Log and show a brief alert.
            console.warn('expo-clipboard not available; cannot copy diagnostics.');
            console.log('Diagnostics:', text);
            Alert.alert('Diagnostics', 'Clipboard not available. Diagnostics logged to console.');
        } catch (e) {
            console.error('copyDiagnosticsToClipboard failed', e);
            Alert.alert('Error', 'Failed to collect diagnostics');
        }
    };

    const saveToGallery = async (imageUri) => {
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please grant access to save images');
                return;
            }

            // Ensure we have a file:// URI. If imageUri is not file://, try to copy it to cache
            let uri = imageUri;
            if (!uri.startsWith('file://')) {
                const out = `${FileSystem.cacheDirectory}saved_${Date.now()}.png`;
                try {
                    // Try copy (works for many URI types on Android/iOS)
                    await FileSystem.copyAsync({ from: uri, to: out });
                    uri = out;
                } catch (copyErr) {
                    console.warn('saveToGallery: copyAsync failed, trying read/write fallback', copyErr);
                    try {
                        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
                        await FileSystem.writeAsStringAsync(out, base64, { encoding: FileSystem.EncodingType.Base64 });
                        uri = out;
                    } catch (rwErr) {
                        console.error('saveToGallery: could not copy or read source URI', rwErr);
                        Alert.alert('Error', 'Could not access the image file to save. Try sharing instead.');
                        return;
                    }
                }
            }

            try {
                const asset = await MediaLibrary.createAssetAsync(uri);
                try {
                    await MediaLibrary.createAlbumAsync('File Converter', asset, false);
                } catch (e) {
                    // ignore existing album errors
                }

                Alert.alert('Saved!', 'Image saved to your gallery');
            } catch (assetErr) {
                console.error('createAssetAsync failed', assetErr);

                // Fallback: try saveToLibraryAsync if createAssetAsync fails
                try {
                    await MediaLibrary.saveToLibraryAsync(uri);
                    Alert.alert('Saved!', 'Image saved to your gallery');
                    return;
                } catch (saveErr) {
                    console.error('saveToLibraryAsync failed', saveErr);
                    Alert.alert('Error', `Failed to save image: ${assetErr?.message || assetErr}`, [
                        { text: 'Copy Diagnostics', onPress: () => copyDiagnosticsToClipboard(uri, assetErr) },
                        { text: 'OK', style: 'cancel' },
                    ]);
                }
            }
        } catch (error) {
            console.error('saveToGallery error', error);
            Alert.alert('Error', `Failed to save image: ${error?.message || error}`, [
                { text: 'Copy Diagnostics', onPress: () => copyDiagnosticsToClipboard(imageUri, error) },
                { text: 'OK', style: 'cancel' },
            ]);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header Info */}
                <View style={[styles.infoCard, { backgroundColor: glassStyle.backgroundColor, borderColor: glassStyle.borderColor }]}>
                    <MaterialCommunityIcons name="file-image" size={32} color={colors.text} style={styles.infoIcon} />
                    <View style={styles.infoText}>
                        <Text style={[styles.infoTitle, { color: colors.text }]}>PDF to Image</Text>
                        <Text style={[styles.infoDesc, { color: colors.textSecondary }]}>
                            {isPro
                                ? 'Convert all pages'
                                : `Convert up to ${FREE_LIMITS.PDF_TO_IMAGES} pages (Free)`}
                        </Text>
                    </View>
                </View>

                {/* Pick PDF Button */}
                <TouchableOpacity onPress={pickPdf} activeOpacity={0.8}>
                    <LinearGradient
                        colors={[Colors.primary.start, Colors.primary.end]}
                        style={styles.pickButton}
                    >
                        <MaterialCommunityIcons name="folder-open" size={20} color="#FFF" />
                        <Text style={styles.pickButtonText}>Select PDF</Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Selected PDF */}
                {selectedPdf && (
                    <View style={[styles.selectedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.pdfIcon}>
                            <MaterialCommunityIcons name="file-pdf-box" size={24} color={Colors.error} />
                        </View>
                        <View style={styles.pdfInfo}>
                            <Text style={[styles.pdfName, { color: colors.text }]} numberOfLines={1}>
                                {selectedPdf.name}
                            </Text>
                            <Text style={[styles.pdfStatus, { color: colors.textSecondary }]}>
                                Ready to convert
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setSelectedPdf(null)} style={{ padding: 8 }}>
                            <MaterialCommunityIcons name="close" size={18} color={Colors.error} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Convert Button */}
                {selectedPdf && (
                    <TouchableOpacity
                        onPress={convertToImages}
                        disabled={isConverting}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[Colors.success, '#059669']}
                            style={[styles.convertButton, isConverting && styles.convertButtonDisabled]}
                        >
                            {isConverting ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="image-multiple-outline" size={20} color="#FFF" />
                                    <Text style={styles.convertText}>Convert to Images</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {/* Converted Images */}
                {convertedImages.length > 0 && (
                    <View style={styles.resultsSection}>
                        <Text style={[styles.resultsTitle, { color: colors.text }]}>
                            Converted Images ({convertedImages.length})
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {convertedImages.map((uri, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.resultItem}
                                    onPress={() => showImageOptions(uri)}
                                >
                                    <Image source={{ uri }} style={styles.resultImage} />
                                    <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                                        Page {index + 1}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Empty State */}
                {!selectedPdf && (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="file-document-outline" size={64} color={colors.textSecondary} style={{ marginBottom: 16 }} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>
                            No PDF selected
                        </Text>
                        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                            Tap "Select PDF" to choose a file
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    resultPlaceholder: {
        width: 80,
        height: 100,
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: 'rgba(0,0,0,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    container: {
        flex: 1,
    },
    content: {
        padding: 16,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    infoIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    infoText: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    infoDesc: {
        fontSize: 13,
    },
    pickButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 8,
    },
    pickButtonIcon: {
        fontSize: 18,
    },
    pickButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    selectedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 16,
    },
    pdfIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: Colors.error + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    pdfIconText: {
        fontSize: 24,
    },
    pdfInfo: {
        flex: 1,
    },
    pdfName: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    pdfStatus: {
        fontSize: 12,
    },
    removeText: {
        fontSize: 18,
        color: Colors.error,
        padding: 8,
    },
    convertButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 16,
        gap: 8,
        marginTop: 16,
    },
    convertButtonDisabled: {
        opacity: 0.7,
    },
    convertIcon: {
        fontSize: 20,
    },
    convertText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
    resultsSection: {
        marginTop: 24,
    },
    resultsTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    resultItem: {
        marginRight: 12,
        alignItems: 'center',
    },
    resultImage: {
        width: 80,
        height: 100,
        borderRadius: 8,
        marginBottom: 8,
    },
    resultLabel: {
        fontSize: 11,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptyDesc: {
        fontSize: 14,
        textAlign: 'center',
    },
});
