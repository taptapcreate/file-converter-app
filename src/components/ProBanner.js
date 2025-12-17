import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { usePro } from '../context/ProContext';
import { PRO_FEATURES } from '../constants/limits';

export const ProBanner = ({ onUpgrade }) => {
    const { isPro } = usePro();

    if (isPro) return null;

    return (
        <TouchableOpacity onPress={onUpgrade} activeOpacity={0.9}>
            <LinearGradient
                colors={[Colors.pro.start, Colors.pro.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.container}
            >
                <View style={styles.content}>
                    <View style={styles.textContainer}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <MaterialCommunityIcons name="star" size={18} color="#FFF" />
                            <Text style={styles.title}>Upgrade to Pro</Text>
                        </View>
                        <Text style={styles.description}>
                            Unlimited conversions & premium features
                        </Text>
                    </View>
                    <View style={styles.button}>
                        <Text style={styles.buttonText}>Upgrade</Text>
                    </View>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
};

export const ProModal = ({ visible, onClose }) => {
    const { setPro } = usePro();

    if (!visible) return null;

    const handlePurchase = () => {
        // TODO: Implement actual IAP
        setPro(true);
        onClose();
    };

    return (
        <View style={styles.modalOverlay}>
            <View style={styles.modal}>
                <LinearGradient
                    colors={[Colors.pro.start, Colors.pro.end]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalHeader}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <MaterialCommunityIcons name="star" size={24} color="#FFF" />
                        <Text style={styles.modalTitle}>PDF Converter Pro</Text>
                    </View>
                </LinearGradient>

                <View style={styles.featureList}>
                    {PRO_FEATURES.map((feature, index) => (
                        <View key={index} style={styles.featureItem}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={Colors.success} />
                            <Text style={styles.featureText}>{feature}</Text>
                        </View>
                    ))}
                </View>

                <TouchableOpacity onPress={handlePurchase} style={styles.purchaseButton}>
                    <LinearGradient
                        colors={[Colors.primary.start, Colors.primary.end]}
                        style={styles.purchaseGradient}
                    >
                        <Text style={styles.purchaseText}>Get Pro - $4.99</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text style={styles.closeText}>Maybe Later</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 16,
        overflow: 'hidden',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    description: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
    },
    button: {
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    buttonText: {
        color: Colors.pro.end,
        fontWeight: '700',
        fontSize: 12,
    },
    // Modal styles
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modal: {
        backgroundColor: '#1A1A2E',
        borderRadius: 24,
        width: '100%',
        maxWidth: 340,
        overflow: 'hidden',
    },
    modalHeader: {
        padding: 20,
        alignItems: 'center',
    },
    modalTitle: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: '800',
    },
    featureList: {
        padding: 20,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    checkmark: {
        // Removed as we use vector icons now
    },
    featureText: {
        color: '#FFF',
        fontSize: 14,
    },
    purchaseButton: {
        marginHorizontal: 20,
        borderRadius: 14,
        overflow: 'hidden',
    },
    purchaseGradient: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    purchaseText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    closeButton: {
        padding: 16,
        alignItems: 'center',
    },
    closeText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
    },
});


