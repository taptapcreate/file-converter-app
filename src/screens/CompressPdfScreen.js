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
import { PDFDocument } from 'pdf-lib';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { reportError } from '../utils/LogCollector';
import { usePro } from '../context/ProContext';
import { Colors, GlassStyles } from '../constants/colors';
import { FREE_LIMITS } from '../constants/limits';

export const CompressPdfScreen = () => {
    const { isDark, colors } = useTheme();
    const { isPro, checkLimit, incrementUsage } = usePro();
    const [selectedPdf, setSelectedPdf] = useState(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [compressionResult, setCompressionResult] = useState(null);
    const glassStyle = isDark ? GlassStyles.dark : GlassStyles.light;

    const pickPdf = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (result && result.assets && result.assets[0]) {
                const asset = result.assets[0];
                const fileInfo = await FileSystem.getInfoAsync(asset.uri);
                setSelectedPdf({
                    uri: asset.uri,
                    name: asset.name,
                    size: fileInfo.size || asset.size || 0,
                });
                setCompressionResult(null);
            } else if (result && result.type === 'success') {
                const fileInfo = await FileSystem.getInfoAsync(result.uri);
                setSelectedPdf({
                    uri: result.uri,
                    name: result.name,
                    size: fileInfo.size || 0,
                });
                setCompressionResult(null);
            }
        } catch (error) {
            console.error('Pick PDF error:', error);
            Alert.alert('Error', 'Failed to pick PDF');
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

    const compressPdf = async () => {
        if (!selectedPdf) {
            Alert.alert('No PDF Selected', 'Please select a PDF to compress');
            return;
        }

        if (!checkLimit('COMPRESS_PDF')) {
            Alert.alert('Daily Limit Reached', 'Upgrade to Pro for unlimited compressions!');
            return;
        }

        setIsCompressing(true);
        setCompressionResult(null);

        try {
            // Read the PDF
            const pdfBase64 = await FileSystem.readAsStringAsync(selectedPdf.uri, { encoding: 'base64' });
            const pdfDoc = await PDFDocument.load(`data:application/pdf;base64,${pdfBase64}`);

            // Save with compression options
            const compressedBytes = await pdfDoc.save({
                useObjectStreams: true,
                addDefaultPage: false,
            });

            const base64Compressed = uint8ArrayToBase64(compressedBytes);

            // Save compressed PDF
            const compressedPath = `${FileSystem.cacheDirectory}compressed_${Date.now()}.pdf`;
            await FileSystem.writeAsStringAsync(compressedPath, base64Compressed, {
                encoding: 'base64',
            });

            // Get compressed file size
            const compressedInfo = await FileSystem.getInfoAsync(compressedPath);
            const originalSize = selectedPdf.size;
            const compressedSize = compressedInfo.size || compressedBytes.length;
            const savedBytes = originalSize - compressedSize;
            const savedPercent = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;

            setCompressionResult({
                path: compressedPath,
                originalSize,
                compressedSize,
                savedBytes,
                savedPercent,
            });

            incrementUsage('COMPRESS_PDF');

        } catch (error) {
            console.error('Compress PDF error:', error);
            try {
                const { id } = await reportError(error, { screen: 'CompressPdf' });
                const shortMsg = "Something went wrong while compressing PDF.";
                const ref = id ? ` Ref: ${id}` : '';
                Alert.alert('Error', shortMsg + ref);
            } catch (reportErr) {
                Alert.alert('Error', 'Failed to compress PDF. Please try again.');
            }
        } finally {
            setIsCompressing(false);
        }
    };

    const shareCompressed = async () => {
        if (compressionResult && compressionResult.path) {
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(compressionResult.path, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Save or Share Compressed PDF',
                });
            }
        }
    };

    const reset = () => {
        setSelectedPdf(null);
        setCompressionResult(null);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header Info */}
                <View style={[styles.infoCard, { backgroundColor: glassStyle.backgroundColor, borderColor: glassStyle.borderColor }]}>
                    <MaterialCommunityIcons name="file-clock" size={32} color={colors.text} style={styles.infoIcon} />
                    <View style={styles.infoText}>
                        <Text style={[styles.infoTitle, { color: colors.text }]}>Compress PDF</Text>
                        <Text style={[styles.infoDesc, { color: colors.textSecondary }]}>
                            {isPro
                                ? 'Unlimited compressions'
                                : `${FREE_LIMITS.COMPRESS_PDF} compressions per day (Free)`}
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
                {selectedPdf && !compressionResult && (
                    <View style={[styles.pdfCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.pdfInfo}>
                            <MaterialCommunityIcons name="file-pdf-box" size={40} color={Colors.error} />
                            <View style={styles.pdfDetails}>
                                <Text style={[styles.pdfName, { color: colors.text }]} numberOfLines={1}>
                                    {selectedPdf.name}
                                </Text>
                                <Text style={[styles.pdfSize, { color: colors.textSecondary }]}>
                                    Size: {formatFileSize(selectedPdf.size)}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={reset} style={styles.removeButton}>
                                <MaterialCommunityIcons name="close" size={20} color={Colors.error} />
                            </TouchableOpacity>
                        </View>

                        {/* Compress Button */}
                        <TouchableOpacity
                            onPress={compressPdf}
                            disabled={isCompressing}
                            activeOpacity={0.8}
                            style={{ marginTop: 16 }}
                        >
                            <LinearGradient
                                colors={[Colors.success, '#059669']}
                                style={[styles.compressButton, isCompressing && styles.buttonDisabled]}
                            >
                                {isCompressing ? (
                                    <>
                                        <ActivityIndicator color="#FFF" />
                                        <Text style={styles.buttonText}>Compressing...</Text>
                                    </>
                                ) : (
                                    <>
                                        <MaterialCommunityIcons name="arrow-collapse-all" size={20} color="#FFF" />
                                        <Text style={styles.buttonText}>Compress PDF</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Compression Result */}
                {compressionResult && (
                    <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <MaterialCommunityIcons name="check-circle" size={48} color={Colors.success} style={{ marginBottom: 16 }} />
                        <Text style={[styles.resultTitle, { color: colors.text }]}>Compression Complete!</Text>

                        <View style={styles.sizeComparison}>
                            <View style={styles.sizeItem}>
                                <Text style={[styles.sizeLabel, { color: colors.textSecondary }]}>Original</Text>
                                <Text style={[styles.sizeValue, { color: colors.text }]}>
                                    {formatFileSize(compressionResult.originalSize)}
                                </Text>
                            </View>
                            <MaterialCommunityIcons name="arrow-right" size={24} color={colors.textSecondary} />
                            <View style={styles.sizeItem}>
                                <Text style={[styles.sizeLabel, { color: colors.textSecondary }]}>Compressed</Text>
                                <Text style={[styles.sizeValue, { color: Colors.success }]}>
                                    {formatFileSize(compressionResult.compressedSize)}
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.savingsCard, { backgroundColor: Colors.success + '20' }]}>
                            <Text style={[styles.savingsText, { color: Colors.success }]}>
                                {compressionResult.savedPercent > 0
                                    ? `Saved ${compressionResult.savedPercent}% (${formatFileSize(compressionResult.savedBytes)})`
                                    : 'PDF is already optimized'}
                            </Text>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity onPress={shareCompressed} activeOpacity={0.8} style={{ flex: 1 }}>
                                <LinearGradient
                                    colors={[Colors.primary.start, Colors.primary.end]}
                                    style={styles.actionButton}
                                >
                                    <MaterialCommunityIcons name="share-variant" size={20} color="#FFF" />
                                    <Text style={styles.buttonText}>Share</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={reset}
                                style={[styles.actionButtonOutline, { borderColor: colors.border }]}
                            >
                                <MaterialCommunityIcons name="refresh" size={20} color={colors.text} />
                                <Text style={[styles.outlineButtonText, { color: colors.text }]}>New</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Empty State */}
                {!selectedPdf && !compressionResult && (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="file-clock" size={64} color={colors.textSecondary} style={{ marginBottom: 16 }} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>
                            Reduce PDF File Size
                        </Text>
                        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                            Select a PDF to compress and reduce its file size for easier sharing
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
    compressButton: {
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
    resultCard: {
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
    },
    resultTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 20,
    },
    sizeComparison: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 16,
    },
    sizeItem: {
        alignItems: 'center',
    },
    sizeLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    sizeValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    savingsCard: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginBottom: 20,
    },
    savingsText: {
        fontSize: 14,
        fontWeight: '600',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        gap: 8,
    },
    actionButtonOutline: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
        flex: 1,
    },
    outlineButtonText: {
        fontSize: 16,
        fontWeight: '600',
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
