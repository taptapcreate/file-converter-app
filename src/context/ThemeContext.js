import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/colors';

const ThemeContext = createContext(undefined);

const THEME_STORAGE_KEY = '@pdf_converter_theme';

export const ThemeProvider = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [theme, setThemeState] = useState('system');
    const [isLoaded, setIsLoaded] = useState(false);

    // Load saved theme preference
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (savedTheme) {
                    setThemeState(savedTheme);
                }
            } catch (error) {
                console.log('Error loading theme:', error);
            } finally {
                setIsLoaded(true);
            }
        };
        loadTheme();
    }, []);

    // Save theme preference
    const setTheme = async (newTheme) => {
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
            setThemeState(newTheme);
        } catch (error) {
            console.log('Error saving theme:', error);
        }
    };

    // Determine if dark mode should be active
    const isDark = theme === 'system'
        ? systemColorScheme === 'dark'
        : theme === 'dark';

    // Get the appropriate color set
    const colors = isDark ? Colors.dark : Colors.light;

    if (!isLoaded) {
        return null;
    }

    return (
        <ThemeContext.Provider value={{ theme, isDark, colors, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
