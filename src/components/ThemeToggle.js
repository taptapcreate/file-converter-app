import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/colors';

export const ThemeToggle = () => {
    const { theme, setTheme, colors } = useTheme();

    const options = [
        { value: 'light', label: 'Light', icon: 'white-balance-sunny' },
        { value: 'system', label: 'Auto', icon: 'theme-light-dark' },
        { value: 'dark', label: 'Dark', icon: 'moon-waning-crescent' },
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.surfaceSecondary }]}>
            {options.map((option) => (
                <TouchableOpacity
                    key={option.value}
                    onPress={() => setTheme(option.value)}
                    style={styles.optionWrapper}
                >
                    {theme === option.value ? (
                        <LinearGradient
                            colors={[Colors.primary.start, Colors.primary.end]}
                            style={styles.selectedOption}
                        >
                            <MaterialCommunityIcons name={option.icon} size={16} color="#FFF" />
                            <Text style={[styles.optionLabel, { color: '#FFF' }]}>{option.label}</Text>
                        </LinearGradient>
                    ) : (
                        <View style={styles.option}>
                            <MaterialCommunityIcons name={option.icon} size={16} color={colors.textSecondary} />
                            <Text style={[styles.optionLabel, { color: colors.textSecondary }]}>
                                {option.label}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 4,
    },
    optionWrapper: {
        flex: 1,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        gap: 6,
    },
    selectedOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        gap: 6,
    },
    optionIcon: {
        fontSize: 16,
    },
    optionLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
});
