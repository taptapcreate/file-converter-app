import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FREE_LIMITS } from '../constants/limits';

const ProContext = createContext(undefined);

const USAGE_STORAGE_KEY = '@pdf_converter_usage';
const PRO_STORAGE_KEY = '@pdf_converter_pro';

const getDefaultUsage = () => ({
    imagesToPdf: 0,
    pdfToImages: 0,
    mergePdfs: 0,
    splitPdf: 0,
    lastResetDate: new Date().toDateString(),
});

const featureToUsageKey = {
    IMAGES_TO_PDF: 'imagesToPdf',
    PDF_TO_IMAGES: 'pdfToImages',
    MERGE_PDFS: 'mergePdfs',
    SPLIT_PDF_PAGES: 'splitPdf',
};

export const ProProvider = ({ children }) => {
    const [isPro, setIsPro] = useState(false);
    const [usage, setUsage] = useState(getDefaultUsage());
    const [isLoaded, setIsLoaded] = useState(false);

    // Load saved data
    useEffect(() => {
        const loadData = async () => {
            try {
                const [savedUsage, savedPro] = await Promise.all([
                    AsyncStorage.getItem(USAGE_STORAGE_KEY),
                    AsyncStorage.getItem(PRO_STORAGE_KEY),
                ]);

                if (savedPro) {
                    setIsPro(JSON.parse(savedPro));
                }

                if (savedUsage) {
                    const parsedUsage = JSON.parse(savedUsage);
                    // Reset usage if it's a new day
                    if (parsedUsage.lastResetDate !== new Date().toDateString()) {
                        const newUsage = getDefaultUsage();
                        await AsyncStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(newUsage));
                        setUsage(newUsage);
                    } else {
                        setUsage(parsedUsage);
                    }
                }
            } catch (error) {
                console.log('Error loading pro data:', error);
            } finally {
                setIsLoaded(true);
            }
        };
        loadData();
    }, []);

    // Check if a feature is within free limits
    const checkLimit = (feature) => {
        if (isPro) return true;
        const usageKey = featureToUsageKey[feature];
        return usage[usageKey] < FREE_LIMITS[feature];
    };

    // Get remaining count for a feature
    const getRemainingCount = (feature) => {
        if (isPro) return -1; // Unlimited
        const usageKey = featureToUsageKey[feature];
        return Math.max(0, FREE_LIMITS[feature] - usage[usageKey]);
    };

    // Increment usage for a feature
    const incrementUsage = async (feature) => {
        if (isPro) return;

        const usageKey = featureToUsageKey[feature];
        const newUsage = {
            ...usage,
            [usageKey]: usage[usageKey] + 1,
        };

        try {
            await AsyncStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(newUsage));
            setUsage(newUsage);
        } catch (error) {
            console.log('Error saving usage:', error);
        }
    };

    // Set pro status
    const setPro = async (value) => {
        try {
            await AsyncStorage.setItem(PRO_STORAGE_KEY, JSON.stringify(value));
            setIsPro(value);
        } catch (error) {
            console.log('Error saving pro status:', error);
        }
    };

    if (!isLoaded) {
        return null;
    }

    return (
        <ProContext.Provider value={{ isPro, usage, checkLimit, incrementUsage, setPro, getRemainingCount }}>
            {children}
        </ProContext.Provider>
    );
};

export const usePro = () => {
    const context = useContext(ProContext);
    if (context === undefined) {
        throw new Error('usePro must be used within a ProProvider');
    }
    return context;
};
