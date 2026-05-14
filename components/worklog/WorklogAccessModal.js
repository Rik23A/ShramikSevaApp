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
import { router } from 'expo-router';
import { useLanguage } from '../../context/LanguageContext';

export default function WorklogAccessModal({ visible, onClose, onSuccess }) {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);

    const handleUnlock = async () => {
        onClose(); // Close the modal before navigating
        router.push({
            pathname: '/(employer)/payment',
            params: {
                planId: 'worklog_access',
                planName: t('worklog_access_addon'),
                amount: 2499
            }
        });
    };

    return (
        <AnimatedModal
            visible={visible}
            onClose={onClose}
            title={t('unlock_work_logs')}
            message={t('worklog_unlock_description')}
        >
            <View style={styles.container}>
                <View style={styles.featuresContainer}>
                    <View style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
                        <Text style={styles.featureText}>{t('live_attendance')}</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
                        <Text style={styles.featureText}>{t('photo_verification')}</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
                        <Text style={styles.featureText}>{t('historical_work_logs')}</Text>
                    </View>
                </View>

                <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>{t('one_time_addon_fee')}</Text>
                    <Text style={styles.price}>₹2,499</Text>
                    <Text style={styles.pricePeriod}>{t('per_month')}</Text>
                </View>

                <TouchableOpacity
                    style={styles.unlockButton}
                    onPress={handleUnlock}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={COLORS.white} />
                    ) : (
                        <Text style={styles.unlockButtonText}>{t('unlock_now')}</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                    <Text style={styles.cancelButtonText}>{t('maybe_later')}</Text>
                </TouchableOpacity>

                <Text style={styles.note}>
                    {t('premium_plan_include')}
                </Text>
            </View>
        </AnimatedModal>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
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
        marginBottom: 20,
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
