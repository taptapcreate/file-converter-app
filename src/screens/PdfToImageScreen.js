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
// Using legacy FileSystem API to avoid deprecated readAsStringAsync warnings
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
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

            if (!result.canceled && result.assets[0]) {
                setSelectedPdf({
                    uri: result.assets[0].uri,
                    name: result.assets[0].name,
                });
                setConvertedImages([]);
            }
        } catch (error) {
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
            // Note: Full PDF to image conversion requires native modules
            // For this demo, we'll show a placeholder message

            Alert.alert(
                'Coming Soon',
                'PDF to Image conversion requires native PDF rendering. This feature will be available in the next update!',
                [{ text: 'OK' }]
            );

            incrementUsage('PDF_TO_IMAGES');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to convert PDF');
        } finally {
            setIsConverting(false);
        }
    };

    const saveToGallery = async (imageUri) => {
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please grant access to save images');
                return;
            }

            await MediaLibrary.saveToLibraryAsync(imageUri);
            Alert.alert('Saved!', 'Image saved to your gallery');
        } catch (error) {
            Alert.alert('Error', 'Failed to save image');
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
                                    onPress={() => saveToGallery(uri)}
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
