import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { usePro } from '../context/ProContext';
import { Colors, GlassStyles } from '../constants/colors';
import { FREE_LIMITS } from '../constants/limits';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export const FeatureCard = ({
    title,
    description,
    icon,
    limitKey,
    onPress,
    isPremium = false,
}) => {
    const { isDark, colors } = useTheme();
    const { isPro, getRemainingCount } = usePro();

    const remaining = limitKey ? getRemainingCount(limitKey) : -1;
    const glassStyle = isDark ? GlassStyles.dark : GlassStyles.light;

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.cardWrapper}>
            <View
                style={[
                    styles.card,
                    {
                        backgroundColor: glassStyle.backgroundColor,
                        borderColor: glassStyle.borderColor,
                    },
                ]}
            >
                {/* Icon */}
                <View style={styles.iconContainer}>
                    <LinearGradient
                        colors={[Colors.primary.start, Colors.primary.end]}
                        style={styles.iconGradient}
                    >
                        <MaterialCommunityIcons name={icon} size={32} color="#FFF" />
                    </LinearGradient>
                </View>

                {/* Title */}
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

                {/* Description */}
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    {description}
                </Text>

                {/* Limit indicator for free users */}
                {!isPro && limitKey && remaining >= 0 && (
                    <View style={[styles.limitBadge, { backgroundColor: colors.surfaceSecondary }]}>
                        <Text style={[styles.limitText, { color: colors.textSecondary }]}>
                            {remaining} left today
                        </Text>
                    </View>
                )}

                {/* Pro badge */}
                {isPremium && !isPro && (
                    <LinearGradient
                        colors={[Colors.pro.start, Colors.pro.end]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.proBadge}
                    >
                        <Text style={styles.proText}>PRO</Text>
                    </LinearGradient>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    cardWrapper: {
        width: CARD_WIDTH,
        marginBottom: 16,
    },
    card: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        minHeight: 160,
    },
    iconContainer: {
        marginBottom: 12,
    },
    iconGradient: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        fontSize: 24,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
    },
    description: {
        fontSize: 12,
        lineHeight: 18,
    },
    limitBadge: {
        marginTop: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    limitText: {
        fontSize: 10,
        fontWeight: '600',
    },
    proBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    proText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
    },
});
