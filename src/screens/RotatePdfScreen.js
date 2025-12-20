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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { PDFDocument, degrees } from 'pdf-lib';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { reportError } from '../utils/LogCollector';
import { usePro } from '../context/ProContext';
import { Colors, GlassStyles } from '../constants/colors';
import { FREE_LIMITS } from '../constants/limits';

export const RotatePdfScreen = () => {
    const { isDark, colors } = useTheme();
    const { isPro, checkLimit, incrementUsage } = usePro();
    const [selectedPdf, setSelectedPdf] = useState(null);
    const [pageCount, setPageCount] = useState(0);
    const [rotationAngle, setRotationAngle] = useState(90);
    const [isRotating, setIsRotating] = useState(false);
    const glassStyle = isDark ? GlassStyles.dark : GlassStyles.light;

    const rotationOptions = [
        { angle: 90, label: '90°', icon: 'rotate-right' },
        { angle: 180, label: '180°', icon: 'rotate-right' },
        { angle: 270, label: '270°', icon: 'rotate-left' },
    ];

    const pickPdf = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (result && result.assets && result.assets[0]) {
                const asset = result.assets[0];
                await loadPdfInfo(asset.uri, asset.name);
            } else if (result && result.type === 'success') {
                await loadPdfInfo(result.uri, result.name);
            }
        } catch (error) {
            console.error('Pick PDF error:', error);
            Alert.alert('Error', 'Failed to pick PDF');
        }
    };

    const loadPdfInfo = async (uri, name) => {
        try {
            const pdfBase64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
            const pdfDoc = await PDFDocument.load(`data:application/pdf;base64,${pdfBase64}`);
            const pages = pdfDoc.getPageCount();

            setSelectedPdf({ uri, name });
            setPageCount(pages);
        } catch (error) {
            console.error('Load PDF error:', error);
            Alert.alert('Error', 'Failed to load PDF');
        }
    };

    // Helper function to convert Uint8Array to base64
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

    const rotatePdf = async () => {
        if (!selectedPdf) {
            Alert.alert('No PDF Selected', 'Please select a PDF to rotate');
            return;
        }

        if (!checkLimit('ROTATE_PDF')) {
            Alert.alert('Daily Limit Reached', 'Upgrade to Pro for unlimited rotations!');
            return;
        }

        setIsRotating(true);

        try {
            const pdfBase64 = await FileSystem.readAsStringAsync(selectedPdf.uri, { encoding: 'base64' });
            const pdfDoc = await PDFDocument.load(`data:application/pdf;base64,${pdfBase64}`);

            // Rotate all pages
            const pages = pdfDoc.getPages();
            pages.forEach(page => {
                const currentRotation = page.getRotation().angle;
                page.setRotation(degrees(currentRotation + rotationAngle));
            });

            const rotatedBytes = await pdfDoc.save();
            const base64Rotated = uint8ArrayToBase64(rotatedBytes);

            const rotatedPath = `${FileSystem.cacheDirectory}rotated_${Date.now()}.pdf`;
            await FileSystem.writeAsStringAsync(rotatedPath, base64Rotated, {
                encoding: 'base64',
            });

            incrementUsage('ROTATE_PDF');

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(rotatedPath, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Save or Share Rotated PDF',
                });
            }

            Alert.alert('Success!', `PDF rotated ${rotationAngle}° successfully`);

        } catch (error) {
            console.error('Rotate PDF error:', error);
            try {
                const { id } = await reportError(error, { screen: 'RotatePdf' });
                const shortMsg = "Something went wrong while rotating PDF.";
                const ref = id ? ` Ref: ${id}` : '';
                Alert.alert('Error', shortMsg + ref);
            } catch (reportErr) {
                Alert.alert('Error', 'Failed to rotate PDF. Please try again.');
            }
        } finally {
            setIsRotating(false);
        }
    };

    const reset = () => {
        setSelectedPdf(null);
        setPageCount(0);
        setRotationAngle(90);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header Info */}
                <View style={[styles.infoCard, { backgroundColor: glassStyle.backgroundColor, borderColor: glassStyle.borderColor }]}>
                    <MaterialCommunityIcons name="rotate-right" size={32} color={colors.text} style={styles.infoIcon} />
                    <View style={styles.infoText}>
                        <Text style={[styles.infoTitle, { color: colors.text }]}>Rotate PDF</Text>
                        <Text style={[styles.infoDesc, { color: colors.textSecondary }]}>
                            {isPro
                                ? 'Unlimited rotations'
                                : `${FREE_LIMITS.ROTATE_PDF} rotations per day (Free)`}
                        </Text>
                    </View>
                </View>

                {/* Select PDF Button */}
                {!selectedPdf && (
                    <TouchableOpacity onPress={pickPdf} activeOpacity={0.8}>
                        <LinearGradient
                            colors={[Colors.primary.start, Colors.primary.end]}
                            style={styles.selectButton}
                        >
                            <MaterialCommunityIcons name="file-pdf-box" size={24} color="#FFF" />
                            <Text style={styles.selectButtonText}>Select PDF</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {/* Selected PDF Card */}
                {selectedPdf && (
                    <View style={[styles.pdfCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.pdfInfo}>
                            <MaterialCommunityIcons name="file-pdf-box" size={40} color={Colors.error} />
                            <View style={styles.pdfDetails}>
                                <Text style={[styles.pdfName, { color: colors.text }]} numberOfLines={1}>
                                    {selectedPdf.name}
                                </Text>
                                <Text style={[styles.pdfSize, { color: colors.textSecondary }]}>
                                    {pageCount} page{pageCount !== 1 ? 's' : ''}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={reset} style={styles.removeButton}>
                                <MaterialCommunityIcons name="close" size={20} color={Colors.error} />
                            </TouchableOpacity>
                        </View>

                        {/* Rotation Options */}
                        <Text style={[styles.sectionLabel, { color: colors.text }]}>Rotation Angle</Text>
                        <View style={styles.rotationOptions}>
                            {rotationOptions.map((option) => (
                                <TouchableOpacity
                                    key={option.angle}
                                    onPress={() => setRotationAngle(option.angle)}
                                    style={[
                                        styles.rotationOption,
                                        {
                                            borderColor: rotationAngle === option.angle ? Colors.primary.solid : colors.border,
                                            backgroundColor: rotationAngle === option.angle ? Colors.primary.solid + '20' : 'transparent',
                                        },
                                    ]}
                                >
                                    <MaterialCommunityIcons
                                        name={option.icon}
                                        size={24}
                                        color={rotationAngle === option.angle ? Colors.primary.solid : colors.text}
                                    />
                                    <Text
                                        style={[
                                            styles.rotationLabel,
                                            { color: rotationAngle === option.angle ? Colors.primary.solid : colors.text }
                                        ]}
                                    >
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Rotate Button */}
                        <TouchableOpacity
                            onPress={rotatePdf}
                            disabled={isRotating}
                            activeOpacity={0.8}
                            style={{ marginTop: 16 }}
                        >
                            <LinearGradient
                                colors={[Colors.success, '#059669']}
                                style={[styles.rotateButton, isRotating && styles.buttonDisabled]}
                            >
                                {isRotating ? (
                                    <>
                                        <ActivityIndicator color="#FFF" />
                                        <Text style={styles.buttonText}>Rotating...</Text>
                                    </>
                                ) : (
                                    <>
                                        <MaterialCommunityIcons name="rotate-right" size={20} color="#FFF" />
                                        <Text style={styles.buttonText}>Rotate PDF</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Empty State */}
                {!selectedPdf && (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="rotate-right" size={64} color={colors.textSecondary} style={{ marginBottom: 16 }} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>
                            Rotate PDF Pages
                        </Text>
                        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                            Select a PDF and choose the rotation angle to rotate all pages
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
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 16,
        gap: 10,
    },
    selectButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    pdfCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    pdfInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pdfDetails: {
        flex: 1,
        marginLeft: 12,
    },
    pdfName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    pdfSize: {
        fontSize: 13,
    },
    removeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.error + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 20,
        marginBottom: 12,
    },
    rotationOptions: {
        flexDirection: 'row',
        gap: 12,
    },
    rotationOption: {
        flex: 1,
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
    },
    rotationLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 8,
    },
    rotateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptyDesc: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 32,
    },
});
