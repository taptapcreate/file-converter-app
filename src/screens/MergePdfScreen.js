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
// Use legacy FileSystem API to keep readAsStringAsync behavior (avoid deprecation/runtime errors)
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { PDFDocument } from 'pdf-lib';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { reportError } from '../utils/LogCollector';
import { usePro } from '../context/ProContext';
import { Colors, GlassStyles } from '../constants/colors';
import { FREE_LIMITS } from '../constants/limits';

export const MergePdfScreen = () => {
    const { isDark, colors } = useTheme();
    const { isPro, checkLimit, incrementUsage } = usePro();
    const [pdfs, setPdfs] = useState([]);
    const [isMerging, setIsMerging] = useState(false);
    const glassStyle = isDark ? GlassStyles.dark : GlassStyles.light;

    const maxPdfs = isPro ? 999 : FREE_LIMITS.MERGE_PDFS;

    const pickPdf = async () => {
        if (pdfs.length >= maxPdfs) {
            Alert.alert(
                'Limit Reached',
                isPro
                    ? 'Maximum PDFs reached'
                    : `Free users can only merge ${FREE_LIMITS.MERGE_PDFS} PDFs. Upgrade to Pro!`
            );
            return;
        }

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            // Support both shapes: DocumentPicker returns { type: 'success', uri, name } or older shapes with assets
            if (result && (result.type === 'success' || result.type === 'success')) {
                const uri = result.uri || (result.assets && result.assets[0] && result.assets[0].uri);
                const name = result.name || (result.assets && result.assets[0] && result.assets[0].name) || 'picked.pdf';
                if (uri) {
                    setPdfs(prev => [...prev, { uri, name }]);
                }
            } else if (result && result.assets && result.assets[0]) {
                setPdfs(prev => [...prev, {
                    uri: result.assets[0].uri,
                    name: result.assets[0].name,
                }]);
            }
        } catch (error) {
            console.error('Pick PDF error:', error);
            Alert.alert('Error', 'Failed to pick PDF');
        }
    };

    const removePdf = (index) => {
        setPdfs(prev => prev.filter((_, i) => i !== index));
    };

    const movePdf = (index, direction) => {
        const newPdfs = [...pdfs];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= pdfs.length) return;

        [newPdfs[index], newPdfs[newIndex]] = [newPdfs[newIndex], newPdfs[index]];
        setPdfs(newPdfs);
    };

    const mergePdfs = async () => {
        if (pdfs.length < 2) {
            Alert.alert('Need More PDFs', 'Please add at least 2 PDFs to merge');
            return;
        }

        if (!checkLimit('MERGE_PDFS')) {
            Alert.alert('Daily Limit Reached', 'Upgrade to Pro for unlimited merges!');
            return;
        }

        setIsMerging(true);

        try {
            const mergedPdf = await PDFDocument.create();

            for (const pdf of pdfs) {
                let pdfDoc;
                try {
                    // Try local file read for file:// URIs
                    if (pdf.uri && pdf.uri.startsWith('file://')) {
                        const pdfBase64 = await FileSystem.readAsStringAsync(pdf.uri, { encoding: 'base64' });
                        pdfDoc = await PDFDocument.load(`data:application/pdf;base64,${pdfBase64}`);
                    } else {
                        // Fallback: fetch the URI and load ArrayBuffer
                        const res = await fetch(pdf.uri);
                        if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.status}`);
                        const arrayBuffer = await res.arrayBuffer();
                        pdfDoc = await PDFDocument.load(arrayBuffer);
                    }
                } catch (readErr) {
                    console.error('Failed reading PDF:', pdf.uri, readErr);
                    throw readErr;
                }

                const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));
            }

            const mergedBytes = await mergedPdf.save();
            const base64Merged = uint8ArrayToBase64(mergedBytes);

            const mergedPath = `${FileSystem.cacheDirectory}merged_${Date.now()}.pdf`;
            await FileSystem.writeAsStringAsync(mergedPath, base64Merged, {
                encoding: 'base64',
            });

            incrementUsage('MERGE_PDFS');

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(mergedPath, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Save or Share Merged PDF',
                });
            }

            setPdfs([]);
            Alert.alert('Success!', 'PDFs merged successfully');
        } catch (error) {
            console.error('Merge->PDF error:', error);
            try {
                const { id } = await reportError(error, { screen: 'MergePdf', pdfCount: pdfs.length });
                const shortMsg = "Something went wrong while merging PDFs. We've logged the error for review.";
                const ref = id ? ` Ref: ${id}` : '';
                Alert.alert('Error', shortMsg + ref);
            } catch (reportErr) {
                console.error('Error reporting failed', reportErr);
                Alert.alert('Error', 'Failed to merge PDFs. Please try again.');
            }
        } finally {
            setIsMerging(false);
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
                    <MaterialCommunityIcons name="file-document-multiple" size={32} color={colors.text} style={styles.infoIcon} />
                    <View style={styles.infoText}>
                        <Text style={[styles.infoTitle, { color: colors.text }]}>Merge PDFs</Text>
                        <Text style={[styles.infoDesc, { color: colors.textSecondary }]}>
                            {isPro
                                ? 'Merge unlimited PDFs'
                                : `Merge up to ${FREE_LIMITS.MERGE_PDFS} PDFs (Free)`}
                        </Text>
                    </View>
                </View>

                {/* Add PDF Button */}
                <TouchableOpacity onPress={pickPdf} activeOpacity={0.8}>
                    <LinearGradient
                        colors={[Colors.primary.start, Colors.primary.end]}
                        style={styles.addButton}
                    >
                        <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
                        <Text style={styles.addButtonText}>Add PDF</Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* PDF List */}
                {pdfs.length > 0 && (
                    <View style={styles.pdfList}>
                        <Text style={[styles.listTitle, { color: colors.text }]}>
                            PDFs to Merge ({pdfs.length})
                        </Text>
                        {pdfs.map((pdf, index) => (
                            <View
                                key={index}
                                style={[styles.pdfItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            >
                                <View style={styles.pdfNumber}>
                                    <Text style={styles.pdfNumberText}>{index + 1}</Text>
                                </View>
                                <View style={styles.pdfInfo}>
                                    <Text style={[styles.pdfName, { color: colors.text }]} numberOfLines={1}>
                                        {pdf.name}
                                    </Text>
                                </View>
                                <View style={styles.pdfActions}>
                                    <TouchableOpacity
                                        onPress={() => movePdf(index, 'up')}
                                        disabled={index === 0}
                                        style={[styles.moveButton, index === 0 && styles.moveButtonDisabled]}
                                    >
                                        <MaterialCommunityIcons name="arrow-up" size={16} color={Colors.primary.solid} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => movePdf(index, 'down')}
                                        disabled={index === pdfs.length - 1}
                                        style={[styles.moveButton, index === pdfs.length - 1 && styles.moveButtonDisabled]}
                                    >
                                        <MaterialCommunityIcons name="arrow-down" size={16} color={Colors.primary.solid} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => removePdf(index)} style={styles.removeButton}>
                                        <MaterialCommunityIcons name="close" size={16} color={Colors.error} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Merge Button */}
                {pdfs.length >= 2 && (
                    <TouchableOpacity
                        onPress={mergePdfs}
                        disabled={isMerging}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[Colors.success, '#059669']}
                            style={[styles.mergeButton, isMerging && styles.mergeButtonDisabled]}
                        >
                            {isMerging ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="link-variant" size={20} color="#FFF" />
                                    <Text style={styles.mergeText}>Merge PDFs</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {/* Empty State */}
                {pdfs.length === 0 && (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="file-multiple" size={64} color={colors.textSecondary} style={{ marginBottom: 16 }} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>
                            No PDFs added yet
                        </Text>
                        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                            Add at least 2 PDFs to merge them
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
    pdfList: {
        marginTop: 24,
    },
    listTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    pdfItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
    pdfNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.primary.solid,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    pdfNumberText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },
    pdfInfo: {
        flex: 1,
    },
    pdfName: {
        fontSize: 14,
        fontWeight: '500',
    },
    pdfActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    moveButton: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: Colors.primary.solid + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    moveButtonDisabled: {
        opacity: 0.3,
    },
    moveText: {
        color: Colors.primary.solid,
        fontSize: 14,
        fontWeight: '700',
    },
    removeButton: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: Colors.error + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeText: {
        color: Colors.error,
        fontSize: 14,
        fontWeight: '700',
    },
    mergeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 16,
        gap: 8,
        marginTop: 16,
    },
    mergeButtonDisabled: {
        opacity: 0.7,
    },
    mergeIcon: {
        fontSize: 20,
    },
    mergeText: {
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
