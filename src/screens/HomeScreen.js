import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    StatusBar,
    SafeAreaView,
    TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { usePro } from '../context/ProContext';
import { FeatureCard } from '../components/FeatureCard';
import { ProBanner, ProModal } from '../components/ProBanner';
import { Colors } from '../constants/colors';

export const HomeScreen = ({ navigation }) => {
    const { isDark, colors } = useTheme();
    const { isPro } = usePro();
    const [showProModal, setShowProModal] = useState(false);

    const features = [
        {
            title: 'Image to PDF',
            description: 'Convert images to PDF document',
            icon: 'image-plus',
            screen: 'ImageToPdf',
            limitKey: 'IMAGES_TO_PDF',
        },
        {
            title: 'PDF to Image',
            description: 'Extract images from PDF',
            icon: 'file-image',
            screen: 'PdfToImage',
            limitKey: 'PDF_TO_IMAGES',
        },
        {
            title: 'Merge PDFs',
            description: 'Combine multiple PDFs',
            icon: 'file-document-multiple',
            screen: 'MergePdf',
            limitKey: 'MERGE_PDFS',
        },
        {
            title: 'Split PDF',
            description: 'Split PDF into pages',
            icon: 'scissors-cutting',
            screen: 'SplitPdf',
            limitKey: 'SPLIT_PDF_PAGES',
        },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            <View style={styles.topBar}>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Settings')}
                    style={styles.settingsButton}
                >
                    <MaterialCommunityIcons name="cog" size={28} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Header */}
                <LinearGradient
                    colors={[Colors.primary.start, Colors.primary.end]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>PDF Converter</Text>
                        <Text style={styles.headerSubtitle}>
                            {isPro ? '⭐ Pro User' : 'Free Version'}
                        </Text>
                    </View>
                    <View style={styles.headerIcon}>
                        <MaterialCommunityIcons name="file-pdf-box" size={32} color="#FFF" />
                    </View>
                </LinearGradient>

                {/* Pro Banner (for free users) */}
                {!isPro && <ProBanner onUpgrade={() => setShowProModal(true)} />}

                {/* Features Grid */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Convert & Edit
                    </Text>
                    <View style={styles.featuresGrid}>
                        {features.map((feature, index) => (
                            <FeatureCard
                                key={index}
                                title={feature.title}
                                description={feature.description}
                                icon={feature.icon}
                                limitKey={feature.limitKey}
                                onPress={() => navigation.navigate(feature.screen)}
                            />
                        ))}
                    </View>
                </View>

                {/* Quick Stats */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Quick Stats
                    </Text>
                    <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.statItem}>
                            <MaterialCommunityIcons name="chart-bar" size={24} color={colors.primary} style={styles.statIcon} />
                            <Text style={[styles.statValue, { color: colors.text }]}>0</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                                Conversions Today
                            </Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.statItem}>
                            <MaterialCommunityIcons name="folder-outline" size={24} color={colors.primary} style={styles.statIcon} />
                            <Text style={[styles.statValue, { color: colors.text }]}>0</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                                Files Created
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Pro Modal */}
            <ProModal visible={showProModal} onClose={() => setShowProModal(false)} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    topBar: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingsButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.05)', // Subtle background
    },
    scrollContent: {
        paddingBottom: 100,
    },
    header: {
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 24,
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    headerIcon: {
        width: 60,
        height: 60,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    section: {
        paddingHorizontal: 16,
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },
    featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statsCard: {
        flexDirection: 'row',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statIcon: {
        marginBottom: 8,
    },
    statValue: {
        fontSize: 28,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        marginHorizontal: 16,
    },
});
