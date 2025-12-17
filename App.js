import React from 'react';
import { ThemeProvider } from './src/context/ThemeContext';
import { ProProvider } from './src/context/ProContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
    return (
        <ThemeProvider>
            <ProProvider>
                <AppNavigator />
            </ProProvider>
        </ThemeProvider>
    );
}
