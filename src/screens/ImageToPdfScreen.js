import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { PDFDocument } from 'pdf-lib';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { usePro } from '../context/ProContext';
import { Colors, GlassStyles } from '../constants/colors';
import { FREE_LIMITS } from '../constants/limits';

export const ImageToPdfScreen = () => {
    const { isDark, colors } = useTheme();
    const { isPro, checkLimit, incrementUsage } = usePro();
    const [images, setImages] = useState([]);
    const [isConverting, setIsConverting] = useState(false);
    const glassStyle = isDark ? GlassStyles.dark : GlassStyles.light;

    const maxImages = isPro ? 999 : FREE_LIMITS.IMAGES_TO_PDF;

    const pickImages = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Permission needed', 'Please grant access to your photos');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 0.8,
                selectionLimit: maxImages - images.length,
            });

            if (!result.canceled) {
                const newImages = result.assets.map(asset => asset.uri);
                const totalImages = [...images, ...newImages];

                if (!isPro && totalImages.length > FREE_LIMITS.IMAGES_TO_PDF) {
                    Alert.alert(
                        'Limit Reached',
                        `Free users can only add up to ${FREE_LIMITS.IMAGES_TO_PDF} images. Upgrade to Pro for unlimited!`
                    );
                    setImages(totalImages.slice(0, FREE_LIMITS.IMAGES_TO_PDF));
                } else {
                    setImages(totalImages);
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick images');
        }
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const convertToPdf = async () => {
        if (images.length === 0) {
            Alert.alert('No Images', 'Please add images first');
            return;
        }

        if (!checkLimit('IMAGES_TO_PDF')) {
            Alert.alert('Daily Limit Reached', 'Upgrade to Pro for unlimited conversions!');
            return;
        }

        setIsConverting(true);

        try {
            const pdfDoc = await PDFDocument.create();

            for (const imageUri of images) {
                // Read image as base64
                const base64 = await FileSystem.readAsStringAsync(imageUri, {
                    encoding: 'base64',
                });

                // Determine image type and embed
                let image;
                const lowerUri = imageUri.toLowerCase();
                if (lowerUri.includes('.png') || lowerUri.includes('png')) {
                    image = await pdfDoc.embedPng(`data:image/png;base64,${base64}`);
                } else {
                    image = await pdfDoc.embedJpg(`data:image/jpeg;base64,${base64}`);
                }

                // Add page with image dimensions
                const page = pdfDoc.addPage([image.width, image.height]);
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: image.width,
                    height: image.height,
                });
            }

            const pdfBytes = await pdfDoc.save();

            // Convert Uint8Array to base64 properly
            const base64Pdf = uint8ArrayToBase64(pdfBytes);

            const pdfPath = `${FileSystem.cacheDirectory}converted_${Date.now()}.pdf`;
            await FileSystem.writeAsStringAsync(pdfPath, base64Pdf, {
                encoding: 'base64',
            });

            incrementUsage('IMAGES_TO_PDF');

            // Share the file
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(pdfPath, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Save or Share PDF',
                });
            }

            setImages([]);
            Alert.alert('Success!', 'PDF created successfully');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to create PDF. Please try again.');
        } finally {
            setIsConverting(false);
        }
    };

    // Helper function to convert Uint8Array to base64 (React Native compatible)
    const uint8ArrayToBase64 = (bytes) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let result = '';
        const len = bytes.length;

        for (let i = 0; i < len; i += 3) {
            const a = bytes[i];
            const b = bytes[i + 1] || 0;
            const c = bytes[i + 2] || 0;

            const triplet = (a << 16) | (b << 8) | c;

            result += chars[(triplet >> 18) & 0x3f];
            result += chars[(triplet >> 12) & 0x3f];
            result += i + 1 < len ? chars[(triplet >> 6) & 0x3f] : '=';
            result += i + 2 < len ? chars[triplet & 0x3f] : '=';
        }

        return result;
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header Info */}
                <View style={[styles.infoCard, { backgroundColor: glassStyle.backgroundColor, borderColor: glassStyle.borderColor }]}>
                    <MaterialCommunityIcons name="image-multiple" size={32} color={colors.text} style={styles.infoIcon} />
                    <View style={styles.infoText}>
                        <Text style={[styles.infoTitle, { color: colors.text }]}>Image to PDF</Text>
                        <Text style={[styles.infoDesc, { color: colors.textSecondary }]}>
                            {isPro
                                ? 'Add unlimited images'
                                : `Add up to ${FREE_LIMITS.IMAGES_TO_PDF} images (Free)`}
                        </Text>
                    </View>
                </View>

                {/* Add Images Button */}
                <TouchableOpacity onPress={pickImages} activeOpacity={0.8}>
                    <LinearGradient
                        colors={[Colors.primary.start, Colors.primary.end]}
                        style={styles.addButton}
                    >
                        <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
                        <Text style={styles.addButtonText}>Add Images</Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Images Preview */}
                {images.length > 0 && (
                    <View style={styles.previewSection}>
                        <Text style={[styles.previewTitle, { color: colors.text }]}>
                            {images.length} Image{images.length > 1 ? 's' : ''} Selected
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.previewScroll}
                        >
                            {images.map((uri, index) => (
                                <View key={index} style={styles.previewItem}>
                                    <Image source={{ uri }} style={styles.previewImage} />
                                    <TouchableOpacity
                                        style={styles.removeButton}
                                        onPress={() => removeImage(index)}
                                    >
                                        <MaterialCommunityIcons name="close" size={14} color="#FFF" />
                                    </TouchableOpacity>
                                    <View style={styles.imageNumber}>
                                        <Text style={styles.imageNumberText}>{index + 1}</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Convert Button */}
                {images.length > 0 && (
                    <TouchableOpacity
                        onPress={convertToPdf}
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
                                    <MaterialCommunityIcons name="file-pdf-box" size={24} color="#FFF" />
                                    <Text style={styles.convertText}>Convert to PDF</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {/* Empty State */}
                {images.length === 0 && (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="camera-plus" size={64} color={colors.textSecondary} style={{ marginBottom: 16 }} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>
                            No images added yet
                        </Text>
                        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                            Tap "Add Images" to get started
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
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
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 8,
    },
    addButtonIcon: {
        fontSize: 18,
    },
    addButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    previewSection: {
        marginTop: 24,
    },
    previewTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    previewScroll: {
        marginHorizontal: -8,
    },
    previewItem: {
        marginHorizontal: 8,
        position: 'relative',
    },
    previewImage: {
        width: 100,
        height: 100,
        borderRadius: 12,
    },
    removeButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.error,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeButtonText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },
    imageNumber: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageNumberText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
    },
    convertButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 16,
        gap: 8,
        marginTop: 24,
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
