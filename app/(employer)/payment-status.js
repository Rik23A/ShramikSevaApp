import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import { useLanguage } from '../../context/LanguageContext';

export default function PaymentStatusScreen() {
    const { t } = useLanguage();
    const params = useLocalSearchParams();
    const { status, orderId, txnId } = params;
    const isSuccess = status === 'success';

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={[styles.iconContainer, isSuccess ? styles.successIcon : styles.failureIcon]}>
                    <Ionicons
                        name={isSuccess ? "checkmark" : "close"}
                        size={50}
                        color={COLORS.white}
                    />
                </View>

                <Text style={styles.title}>
                    {isSuccess ? t('payment_successful') : t('payment_failed')}
                </Text>

                <Text style={styles.message}>
                    {isSuccess
                        ? 'Your subscription has been upgraded successfully.'
                        : 'There was an issue processing your payment. Please try again.'}
                </Text>

                {orderId && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Order ID:</Text>
                        <Text style={styles.detailValue}>{orderId}</Text>
                    </View>
                )}

                {txnId && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Transaction ID:</Text>
                        <Text style={styles.detailValue}>{txnId}</Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.button, isSuccess ? styles.successButton : styles.failureButton]}
                    onPress={() => router.replace('/(employer)/dashboard')}
                >
                    <Text style={styles.buttonText}>
                        {t('back_to_dashboard')}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        padding: 20,
    },
    content: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    successIcon: {
        backgroundColor: COLORS.success,
    },
    failureIcon: {
        backgroundColor: COLORS.danger,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 10,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 22,
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 8,
        width: '100%',
        justifyContent: 'center',
        gap: 8,
    },
    detailLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    detailValue: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '600',
    },
    button: {
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 25,
        marginTop: 20,
        width: '100%',
        alignItems: 'center',
    },
    successButton: {
        backgroundColor: COLORS.primary,
    },
    failureButton: {
        backgroundColor: COLORS.textSecondary,
    },
    buttonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
    },
});
