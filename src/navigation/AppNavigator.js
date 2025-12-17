import React from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/colors';

// Screens
import { HomeScreen } from '../screens/HomeScreen';
import { ImageToPdfScreen } from '../screens/ImageToPdfScreen';
import { PdfToImageScreen } from '../screens/PdfToImageScreen';
import { MergePdfScreen } from '../screens/MergePdfScreen';
import { SplitPdfScreen } from '../screens/SplitPdfScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

// Main Stack Navigator
const AppNavigator = () => {
    const { isDark, colors } = useTheme();

    const customTheme = isDark
        ? {
            ...DarkTheme,
            colors: {
                ...DarkTheme.colors,
                background: colors.background,
                card: colors.surface,
                text: colors.text,
                border: colors.border,
                primary: Colors.primary.solid,
            },
        }
        : {
            ...DefaultTheme,
            colors: {
                ...DefaultTheme.colors,
                background: colors.background,
                card: colors.surface,
                text: colors.text,
                border: colors.border,
                primary: Colors.primary.solid,
            },
        };

    return (
        <NavigationContainer theme={customTheme}>
            <Stack.Navigator
                screenOptions={{
                    headerStyle: {
                        backgroundColor: colors.background,
                    },
                    headerTintColor: colors.text,
                    headerTitleStyle: {
                        fontWeight: '600',
                    },
                    headerShadowVisible: false,
                }}
            >
                <Stack.Screen
                    name="Home"
                    component={HomeScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Settings"
                    component={SettingsScreen}
                    options={{ title: 'Settings' }}
                />
                <Stack.Screen
                    name="ImageToPdf"
                    component={ImageToPdfScreen}
                    options={{ title: 'Image to PDF' }}
                />
                <Stack.Screen
                    name="PdfToImage"
                    component={PdfToImageScreen}
                    options={{ title: 'PDF to Image' }}
                />
                <Stack.Screen
                    name="MergePdf"
                    component={MergePdfScreen}
                    options={{ title: 'Merge PDFs' }}
                />
                <Stack.Screen
                    name="SplitPdf"
                    component={SplitPdfScreen}
                    options={{ title: 'Split PDF' }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
