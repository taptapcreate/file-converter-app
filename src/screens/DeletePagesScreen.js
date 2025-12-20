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

export const DeletePagesScreen = () => {
    const { isDark, colors } = useTheme();
    const { isPro, checkLimit, incrementUsage } = usePro();
    const [selectedPdf, setSelectedPdf] = useState(null);
    const [pageCount, setPageCount] = useState(0);
    const [selectedPages, setSelectedPages] = useState(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const glassStyle = isDark ? GlassStyles.dark : GlassStyles.light;

    const maxPages = isPro ? 999 : FREE_LIMITS.DELETE_PAGES;

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
            setSelectedPages(new Set());
        } catch (error) {
            console.error('Load PDF error:', error);
            Alert.alert('Error', 'Failed to load PDF');
        }
    };

    const togglePage = (pageIndex) => {
        const newSelected = new Set(selectedPages);
        if (newSelected.has(pageIndex)) {
            newSelected.delete(pageIndex);
        } else {
            if (!isPro && newSelected.size >= maxPages) {
                Alert.alert(
                    'Limit Reached',
                    `Free users can only delete ${maxPages} pages at a time. Upgrade to Pro!`
                );
                return;
            }
            newSelected.add(pageIndex);
        }
        setSelectedPages(newSelected);
    };

    const selectAll = () => {
        if (selectedPages.size === pageCount) {
            setSelectedPages(new Set());
        } else {
            if (!isPro && pageCount > maxPages) {
                Alert.alert(
                    'Limit Reached',
                    `Free users can only delete ${maxPages} pages at a time. Upgrade to Pro!`
                );
                const limited = new Set();
                for (let i = 0; i < maxPages && i < pageCount; i++) {
                    limited.add(i);
                }
                setSelectedPages(limited);
            } else {
                const all = new Set();
                for (let i = 0; i < pageCount; i++) {
                    all.add(i);
                }
                setSelectedPages(all);
            }
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

    const deletePages = async () => {
        if (!selectedPdf) {
            Alert.alert('No PDF Selected', 'Please select a PDF first');
            return;
        }

        if (selectedPages.size === 0) {
            Alert.alert('No Pages Selected', 'Please select at least one page to delete');
            return;
        }

        if (selectedPages.size === pageCount) {
            Alert.alert('Cannot Delete All', 'You cannot delete all pages. At least one page must remain.');
            return;
        }

        if (!checkLimit('DELETE_PAGES')) {
            Alert.alert('Daily Limit Reached', 'Upgrade to Pro for unlimited operations!');
            return;
        }

        setIsProcessing(true);

        try {
            const pdfBase64 = await FileSystem.readAsStringAsync(selectedPdf.uri, { encoding: 'base64' });
            const pdfDoc = await PDFDocument.load(`data:application/pdf;base64,${pdfBase64}`);
            const newPdf = await PDFDocument.create();

            // Copy only pages that are NOT selected for deletion
            const pagesToKeep = [];
            for (let i = 0; i < pageCount; i++) {
                if (!selectedPages.has(i)) {
                    pagesToKeep.push(i);
                }
            }

            const copiedPages = await newPdf.copyPages(pdfDoc, pagesToKeep);
            copiedPages.forEach(page => newPdf.addPage(page));

            const newBytes = await newPdf.save();
            const base64New = uint8ArrayToBase64(newBytes);

            const newPath = `${FileSystem.cacheDirectory}edited_${Date.now()}.pdf`;
            await FileSystem.writeAsStringAsync(newPath, base64New, {
                encoding: 'base64',
            });

            incrementUsage('DELETE_PAGES');

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(newPath, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Save or Share Edited PDF',
                });
            }

            Alert.alert('Success!', `Deleted ${selectedPages.size} page(s). New PDF has ${pagesToKeep.length} pages.`);

        } catch (error) {
            console.error('Delete Pages error:', error);
            try {
                const { id } = await reportError(error, { screen: 'DeletePages' });
                const shortMsg = "Something went wrong while editing PDF.";
                const ref = id ? ` Ref: ${id}` : '';
                Alert.alert('Error', shortMsg + ref);
            } catch (reportErr) {
                Alert.alert('Error', 'Failed to edit PDF. Please try again.');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const reset = () => {
        setSelectedPdf(null);
        setPageCount(0);
        setSelectedPages(new Set());
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header Info */}
                <View style={[styles.infoCard, { backgroundColor: glassStyle.backgroundColor, borderColor: glassStyle.borderColor }]}>
                    <MaterialCommunityIcons name="file-remove" size={32} color={colors.text} style={styles.infoIcon} />
                    <View style={styles.infoText}>
                        <Text style={[styles.infoTitle, { color: colors.text }]}>Delete Pages</Text>
                        <Text style={[styles.infoDesc, { color: colors.textSecondary }]}>
                            {isPro
                                ? 'Delete unlimited pages'
                                : `Delete up to ${FREE_LIMITS.DELETE_PAGES} pages (Free)`}
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
                                    {pageCount} page{pageCount !== 1 ? 's' : ''} • {selectedPages.size} selected
                                </Text>
                            </View>
                            <TouchableOpacity onPress={reset} style={styles.removeButton}>
                                <MaterialCommunityIcons name="close" size={20} color={Colors.error} />
                            </TouchableOpacity>
                        </View>

                        {/* Select All */}
                        <View style={styles.selectAllRow}>
                            <Text style={[styles.sectionLabel, { color: colors.text }]}>Select Pages to Delete</Text>
                            <TouchableOpacity onPress={selectAll} style={styles.selectAllButton}>
                                <Text style={[styles.selectAllText, { color: Colors.primary.solid }]}>
                                    {selectedPages.size === pageCount ? 'Deselect All' : 'Select All'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Page Grid */}
                        <View style={styles.pageGrid}>
                            {Array.from({ length: pageCount }, (_, i) => (
                                <TouchableOpacity
                                    key={i}
                                    onPress={() => togglePage(i)}
                                    style={[
                                        styles.pageItem,
                                        {
                                            borderColor: selectedPages.has(i) ? Colors.error : colors.border,
                                            backgroundColor: selectedPages.has(i) ? Colors.error + '20' : colors.surface,
                                        },
                                    ]}
                                >
                                    <Text style={[
                                        styles.pageNumber,
                                        { color: selectedPages.has(i) ? Colors.error : colors.text }
                                    ]}>
                                        {i + 1}
                                    </Text>
                                    {selectedPages.has(i) && (
                                        <MaterialCommunityIcons
                                            name="trash-can"
                                            size={14}
                                            color={Colors.error}
                                            style={styles.trashIcon}
                                        />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Delete Button */}
                        {selectedPages.size > 0 && (
                            <TouchableOpacity
                                onPress={deletePages}
                                disabled={isProcessing}
                                activeOpacity={0.8}
                                style={{ marginTop: 16 }}
                            >
                                <LinearGradient
                                    colors={[Colors.error, '#DC2626']}
                                    style={[styles.deleteButton, isProcessing && styles.buttonDisabled]}
                                >
                                    {isProcessing ? (
                                        <>
                                            <ActivityIndicator color="#FFF" />
                                            <Text style={styles.buttonText}>Processing...</Text>
                                        </>
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="trash-can" size={20} color="#FFF" />
                                            <Text style={styles.buttonText}>
                                                Delete {selectedPages.size} Page{selectedPages.size !== 1 ? 's' : ''}
                                            </Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Empty State */}
                {!selectedPdf && (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="file-remove" size={64} color={colors.textSecondary} style={{ marginBottom: 16 }} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>
                            Remove PDF Pages
                        </Text>
                        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                            Select a PDF and choose which pages to delete
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
    selectAllRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 12,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    selectAllButton: {
        padding: 8,
    },
    selectAllText: {
        fontSize: 13,
        fontWeight: '600',
    },
    pageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    pageItem: {
        width: 48,
        height: 48,
        borderRadius: 10,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pageNumber: {
        fontSize: 16,
        fontWeight: '700',
    },
    trashIcon: {
        position: 'absolute',
        bottom: 2,
        right: 2,
    },
    deleteButton: {
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
