import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import AnimatedModal from '../ui/AnimatedModal';
import { purchaseWorklogAddon } from '../../services/subscriptionService';

const { width } = Dimensions.get('window');

export default function WorklogAccessModal({ visible, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);

    const handleUnlock = async () => {
        setLoading(true);
        try {
            // In a real app, this would trigger a payment gateway
            await purchaseWorklogAddon({ type: 'worklog' });
            Alert.alert('Success', 'Worklog access unlocked successfully!');
            onSuccess();
        } catch (error) {
            console.error('Error unlocking worklogs:', error);
            Alert.alert('Error', 'Failed to unlock worklogs. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatedModal visible={visible} onClose={onClose}>
            <View style={styles.container}>
                <View style={styles.iconContainer}>
                    <Ionicons name="lock-closed" size={60} color={COLORS.primary} />
                </View>

                <Text style={styles.title}>Unlock Work Logs</Text>

                <Text style={styles.description}>
                    Get real-time tracking, attendance verification, and detailed daily work logs for your hired workers.
                </Text>

                <View style={styles.featuresContainer}>
                    <View style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
                        <Text style={styles.featureText}>Live Attendance (Start/End OTPs)</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
                        <Text style={styles.featureText}>Photo Verification at Site</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
                        <Text style={styles.featureText}>Historical Work Log Records</Text>
                    </View>
                </View>

                <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>One-time Addon Fee</Text>
                    <Text style={styles.price}>₹2,499</Text>
                    <Text style={styles.pricePeriod}>per month</Text>
                </View>

                <TouchableOpacity
                    style={styles.unlockButton}
                    onPress={handleUnlock}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={COLORS.white} />
                    ) : (
                        <Text style={styles.unlockButtonText}>Unlock Now</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                    <Text style={styles.cancelButtonText}>Maybe Later</Text>
                </TouchableOpacity>

                <Text style={styles.note}>
                    Already included in the <Text style={styles.bold}>Premium Plan</Text>.
                </Text>
            </View>
        </AnimatedModal>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 24,
        alignItems: 'center',
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F1F7FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    featuresContainer: {
        width: '100%',
        marginBottom: 30,
        backgroundColor: '#F8F9FA',
        padding: 16,
        borderRadius: 12,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    featureText: {
        fontSize: 14,
        color: COLORS.text,
        marginLeft: 10,
    },
    priceContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    priceLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    price: {
        fontSize: 36,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginVertical: 4,
    },
    pricePeriod: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    unlockButton: {
        width: '100%',
        height: 54,
        backgroundColor: COLORS.secondary,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: COLORS.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    unlockButtonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
    cancelButton: {
        padding: 10,
    },
    cancelButtonText: {
        color: COLORS.textSecondary,
        fontSize: 16,
    },
    note: {
        marginTop: 20,
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    bold: {
        fontWeight: 'bold',
        color: COLORS.primary,
    },
});
