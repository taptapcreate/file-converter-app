import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Linking,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { usePro } from '../context/ProContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { ProModal } from '../components/ProBanner';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, GlassStyles } from '../constants/colors';
import { PRO_FEATURES } from '../constants/limits';

export const SettingsScreen = () => {
    const { isDark, colors } = useTheme();
    const { isPro, setPro } = usePro();
    const [showProModal, setShowProModal] = useState(false);
    const glassStyle = isDark ? GlassStyles.dark : GlassStyles.light;

    const handleRestorePurchase = () => {
        Alert.alert('Restore', 'Checking for previous purchases...', [
            { text: 'OK' }
        ]);
    };

    const handleRateApp = async () => {
        Alert.alert('Rate Us', 'Thank you for your support! Rating will be available when the app is published.');
    };

    const handleContact = async () => {
        const email = 'support@pdfconverter.app';
        const url = `mailto:${email}?subject=PDF Converter App Support`;
        try {
            await Linking.openURL(url);
        } catch {
            Alert.alert('Error', 'Could not open email client');
        }
    };

    const handleDevTogglePro = () => {
        setPro(!isPro);
        Alert.alert('Dev Mode', `Pro status set to: ${!isPro}`);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Pro Status Card */}
                <TouchableOpacity
                    onPress={() => !isPro && setShowProModal(true)}
                    activeOpacity={isPro ? 1 : 0.8}
                >
                    <LinearGradient
                        colors={isPro ? [Colors.success, '#059669'] : [Colors.pro.start, Colors.pro.end]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.proCard}
                    >
                        <View style={styles.proContent}>
                            <MaterialCommunityIcons name={isPro ? 'star' : 'lock-open-variant'} size={32} color="#FFF" style={{ marginRight: 16 }} />
                            <View style={styles.proText}>
                                <Text style={styles.proTitle}>
                                    {isPro ? 'Pro User' : 'Upgrade to Pro'}
                                </Text>
                                <Text style={styles.proDesc}>
                                    {isPro ? 'Enjoy unlimited conversions!' : 'Unlock all features'}
                                </Text>
                            </View>
                            {!isPro && (
                                <View style={styles.proButton}>
                                    <Text style={styles.proButtonText}>Upgrade</Text>
                                </View>
                            )}
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Theme Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
                    <View style={[styles.card, { backgroundColor: glassStyle.backgroundColor, borderColor: glassStyle.borderColor }]}>
                        <Text style={[styles.cardLabel, { color: colors.text }]}>Theme</Text>
                        <ThemeToggle />
                    </View>

                    {/* Account Section - Remove Ads */}
                    {!isPro && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Premium</Text>
                            <View style={[styles.card, { backgroundColor: glassStyle.backgroundColor, borderColor: glassStyle.borderColor }]}>
                                <TouchableOpacity
                                    style={styles.menuItem}
                                    onPress={() => setShowProModal(true)}
                                >
                                    <MaterialCommunityIcons name="block-helper" size={20} color={Colors.pro.start} style={{ marginRight: 12 }} />
                                    <Text style={[styles.menuText, { color: colors.text }]}>Remove Ads</Text>
                                    <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                {/* Pro Features Section */}
                {!isPro && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Pro Features</Text>
                        <View style={[styles.card, { backgroundColor: glassStyle.backgroundColor, borderColor: glassStyle.borderColor }]}>
                            {PRO_FEATURES.map((feature, index) => (
                                <View key={index} style={styles.featureRow}>
                                    <MaterialCommunityIcons name="check-circle" size={16} color={Colors.success} style={{ marginRight: 10 }} />
                                    <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Support Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Support</Text>
                    <View style={[styles.card, { backgroundColor: glassStyle.backgroundColor, borderColor: glassStyle.borderColor }]}>
                        <TouchableOpacity style={styles.menuItem} onPress={handleRateApp}>
                            <MaterialCommunityIcons name="star" size={20} color={Colors.primary.solid} style={{ marginRight: 12 }} />
                            <Text style={[styles.menuText, { color: colors.text }]}>Rate App</Text>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <TouchableOpacity style={styles.menuItem} onPress={handleContact}>
                            <MaterialCommunityIcons name="email" size={20} color={Colors.primary.solid} style={{ marginRight: 12 }} />
                            <Text style={[styles.menuText, { color: colors.text }]}>Contact Us</Text>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <TouchableOpacity style={styles.menuItem} onPress={handleRestorePurchase}>
                            <MaterialCommunityIcons name="restore" size={20} color={Colors.primary.solid} style={{ marginRight: 12 }} />
                            <Text style={[styles.menuText, { color: colors.text }]}>Restore Purchase</Text>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
                    <View style={[styles.card, { backgroundColor: glassStyle.backgroundColor, borderColor: glassStyle.borderColor }]}>
                        <View style={styles.aboutRow}>
                            <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>Version</Text>
                            <Text style={[styles.aboutValue, { color: colors.text }]}>1.0.0</Text>
                        </View>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        <View style={styles.aboutRow}>
                            <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>Made with</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <MaterialCommunityIcons name="heart" size={14} color={Colors.error} style={{ marginRight: 4 }} />
                                <Text style={[styles.aboutValue, { color: colors.text }]}>React Native</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Dev Toggle */}
                {__DEV__ && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Developer</Text>
                        <TouchableOpacity
                            style={[styles.card, { backgroundColor: glassStyle.backgroundColor, borderColor: glassStyle.borderColor }]}
                            onPress={handleDevTogglePro}
                        >
                            <View style={styles.menuItem}>
                                <MaterialCommunityIcons name="hammer-wrench" size={20} color={colors.text} style={{ marginRight: 12 }} />
                                <Text style={[styles.menuText, { color: colors.text }]}>Toggle Pro Status</Text>
                                <Text style={[styles.proStatus, { color: isPro ? Colors.success : Colors.error }]}>
                                    {isPro ? 'ON' : 'OFF'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            <ProModal visible={showProModal} onClose={() => setShowProModal(false)} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 100,
    },
    proCard: {
        borderRadius: 20,
        marginBottom: 16,
    },
    proContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    proIcon: {
        fontSize: 32,
        marginRight: 16,
    },
    proText: {
        flex: 1,
    },
    proTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    proDesc: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
    },
    proButton: {
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    proButtonText: {
        color: Colors.pro.end,
        fontWeight: '700',
        fontSize: 12,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    card: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
    },
    cardLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    featureCheck: {
        color: Colors.success,
        fontSize: 14,
        fontWeight: '700',
        marginRight: 10,
    },
    featureText: {
        fontSize: 14,
        flex: 1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    menuIcon: {
        fontSize: 20,
        marginRight: 12,
    },
    menuText: {
        fontSize: 16,
        flex: 1,
    },
    menuArrow: {
        fontSize: 24,
    },
    divider: {
        height: 1,
        marginVertical: 12,
    },
    aboutRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    aboutLabel: {
        fontSize: 14,
    },
    aboutValue: {
        fontSize: 14,
        fontWeight: '500',
    },
    proStatus: {
        fontSize: 12,
        fontWeight: '700',
    },
});
