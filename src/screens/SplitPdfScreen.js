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
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { PDFDocument } from 'pdf-lib';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { usePro } from '../context/ProContext';
import { Colors, GlassStyles } from '../constants/colors';
import { FREE_LIMITS } from '../constants/limits';

export const SplitPdfScreen = () => {
    const { isDark, colors } = useTheme();
    const { isPro, checkLimit, incrementUsage } = usePro();
    const [selectedPdf, setSelectedPdf] = useState(null);
    const [selectedPages, setSelectedPages] = useState([]);
    const [isSplitting, setIsSplitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const glassStyle = isDark ? GlassStyles.dark : GlassStyles.light;

    const pickPdf = async () => {
        setIsLoading(true);
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets[0]) {
                const uri = result.assets[0].uri;
                const name = result.assets[0].name;

                // Read PDF to get page count
                const pdfBytes = await FileSystem.readAsStringAsync(uri, {
                    encoding: 'base64',
                });

                const pdfDoc = await PDFDocument.load(`data:application/pdf;base64,${pdfBytes}`);
                const pageCount = pdfDoc.getPageCount();

                setSelectedPdf({ uri, name, pageCount });
                setSelectedPages([]);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick PDF');
        } finally {
            setIsLoading(false);
        }
    };

    const togglePage = (pageNumber) => {
        if (!isPro && pageNumber > FREE_LIMITS.SPLIT_PDF_PAGES) {
            Alert.alert('Pro Feature', `Free users can only split first ${FREE_LIMITS.SPLIT_PDF_PAGES} pages. Upgrade to Pro!`);
            return;
        }

        setSelectedPages(prev => {
            if (prev.includes(pageNumber)) {
                return prev.filter(p => p !== pageNumber);
            } else {
                return [...prev, pageNumber].sort((a, b) => a - b);
            }
        });
    };

    const selectAll = () => {
        if (!selectedPdf) return;
        const max = isPro ? selectedPdf.pageCount : Math.min(selectedPdf.pageCount, FREE_LIMITS.SPLIT_PDF_PAGES);
        setSelectedPages(Array.from({ length: max }, (_, i) => i + 1));
    };

    const deselectAll = () => {
        setSelectedPages([]);
    };

    const splitPdf = async () => {
        if (!selectedPdf || selectedPages.length === 0) {
            Alert.alert('No Pages', 'Please select pages to extract');
            return;
        }

        if (!checkLimit('SPLIT_PDF_PAGES')) {
            Alert.alert('Daily Limit Reached', 'Upgrade to Pro for unlimited splits!');
            return;
        }

        setIsSplitting(true);

        try {
            const pdfBytes = await FileSystem.readAsStringAsync(selectedPdf.uri, {
                encoding: 'base64',
            });

            const sourcePdf = await PDFDocument.load(`data:application/pdf;base64,${pdfBytes}`);
            const newPdf = await PDFDocument.create();

            // Copy selected pages (convert to 0-indexed)
            const pageIndices = selectedPages.map(p => p - 1);
            const pages = await newPdf.copyPages(sourcePdf, pageIndices);
            pages.forEach(page => newPdf.addPage(page));

            const newPdfBytes = await newPdf.save();
            const base64New = uint8ArrayToBase64(newPdfBytes);

            const splitPath = `${FileSystem.cacheDirectory}split_${Date.now()}.pdf`;
            await FileSystem.writeAsStringAsync(splitPath, base64New, {
                encoding: 'base64',
            });

            incrementUsage('SPLIT_PDF_PAGES');

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(splitPath, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Save or Share Split PDF',
                });
            }

            Alert.alert('Success!', `Extracted ${selectedPages.length} page(s) successfully`);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to split PDF. Please try again.');
        } finally {
            setIsSplitting(false);
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
                    <MaterialCommunityIcons name="scissors-cutting" size={32} color={colors.text} style={styles.infoIcon} />
                    <View style={styles.infoText}>
                        <Text style={[styles.infoTitle, { color: colors.text }]}>Split PDF</Text>
                        <Text style={[styles.infoDesc, { color: colors.textSecondary }]}>
                            {isPro
                                ? 'Extract any pages'
                                : `Extract up to ${FREE_LIMITS.SPLIT_PDF_PAGES} pages (Free)`}
                        </Text>
                    </View>
                </View>

                {/* Pick PDF Button */}
                <TouchableOpacity onPress={pickPdf} activeOpacity={0.8} disabled={isLoading}>
                    <LinearGradient
                        colors={[Colors.primary.start, Colors.primary.end]}
                        style={styles.pickButton}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="folder-open" size={20} color="#FFF" />
                                <Text style={styles.pickButtonText}>Select PDF</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                {/* Page Selection */}
                {selectedPdf && (
                    <View style={styles.pageSection}>
                        <View style={styles.pageSectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                Select Pages ({selectedPdf.pageCount} total)
                            </Text>
                            <View style={styles.selectActions}>
                                <TouchableOpacity onPress={selectAll}>
                                    <Text style={[styles.actionText, { color: Colors.primary.solid }]}>Select All</Text>
                                </TouchableOpacity>
                                <Text style={{ color: colors.textSecondary }}> | </Text>
                                <TouchableOpacity onPress={deselectAll}>
                                    <Text style={[styles.actionText, { color: Colors.error }]}>Clear</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.pagesGrid}>
                            {Array.from({ length: selectedPdf.pageCount }, (_, i) => i + 1).map(pageNum => {
                                const isSelected = selectedPages.includes(pageNum);
                                const isLocked = !isPro && pageNum > FREE_LIMITS.SPLIT_PDF_PAGES;

                                return (
                                    <TouchableOpacity
                                        key={pageNum}
                                        onPress={() => togglePage(pageNum)}
                                        style={[
                                            styles.pageButton,
                                            isSelected && styles.pageButtonSelected,
                                            isLocked && styles.pageButtonLocked,
                                            { borderColor: isSelected ? Colors.primary.solid : colors.border },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.pageNumber,
                                                { color: isSelected ? '#FFF' : (isLocked ? colors.textSecondary : colors.text) }
                                            ]}
                                        >
                                            {pageNum}
                                        </Text>
                                        {isLocked && <MaterialCommunityIcons name="lock" size={12} color={colors.textSecondary} style={{ position: 'absolute', bottom: 2, right: 2 }} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Selected Count */}
                        {selectedPages.length > 0 && (
                            <Text style={[styles.selectedCount, { color: colors.textSecondary }]}>
                                {selectedPages.length} page{selectedPages.length > 1 ? 's' : ''} selected
                            </Text>
                        )}
                    </View>
                )}

                {/* Split Button */}
                {selectedPdf && selectedPages.length > 0 && (
                    <TouchableOpacity
                        onPress={splitPdf}
                        disabled={isSplitting}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[Colors.success, '#059669']}
                            style={[styles.splitButton, isSplitting && styles.splitButtonDisabled]}
                        >
                            {isSplitting ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="scissors-cutting" size={20} color="#FFF" />
                                    <Text style={styles.splitText}>Extract Selected Pages</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {/* Empty State */}
                {!selectedPdf && !isLoading && (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="file-pdf-box" size={64} color={colors.textSecondary} style={{ marginBottom: 16 }} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>
                            No PDF selected
                        </Text>
                        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                            Select a PDF to split into pages
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
    pageSection: {
        marginTop: 24,
    },
    pageSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    selectActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionText: {
        fontSize: 13,
        fontWeight: '600',
    },
    pagesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    pageButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pageButtonSelected: {
        backgroundColor: Colors.primary.solid,
    },
    pageButtonLocked: {
        opacity: 0.5,
    },
    pageNumber: {
        fontSize: 14,
        fontWeight: '600',
    },
    lockIcon: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        fontSize: 10,
    },
    selectedCount: {
        marginTop: 16,
        textAlign: 'center',
        fontSize: 14,
    },
    splitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 16,
        gap: 8,
        marginTop: 24,
    },
    splitButtonDisabled: {
        opacity: 0.7,
    },
    splitIcon: {
        fontSize: 20,
    },
    splitText: {
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
