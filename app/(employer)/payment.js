import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { COLORS } from '../../constants/config';
import { API_URL } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import axios from 'axios';

export default function PaymentScreen() {
    const { user, token } = useAuth();
    const { t } = useLanguage();
    const params = useLocalSearchParams();
    const [loading, setLoading] = useState(false);

    // Amount and plan info passed from subscription selection
    const amount = params.amount || '0';
    const planId = params.planId;
    const planName = params.planName || planId || 'Subscription Plan';

    const handlePayment = async () => {
        setLoading(true);
        try {
            if (!amount || parseFloat(amount) <= 0) {
                Alert.alert('Error', 'Invalid payment amount');
                setLoading(false);
                return;
            }

            // 1. Initiate Payment on Backend
            const initiateResponse = await axios.post(
                `${API_URL}/payments/paytm/initiate`,
                {
                    amount: amount,
                    orderId: `ORDER_${new Date().getTime()}_${user._id}`,
                    customerId: user._id,
                    email: user.email,
                    phone: user.mobile,
                    planId: planId,
                    platform: 'mobile'
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (initiateResponse.data.success) {
                const { txnToken, orderId, mid } = initiateResponse.data;

                // Open the backend payment handoff page in WebView
                // This page will auto-submit the POST form to Paytm
                const paymentPageUrl = `${API_URL}/payments/paytm/pay?txnToken=${txnToken}&orderId=${orderId}&mid=${mid}`;

                // Note: Do NOT setLoading(false) here — keep spinner active until deep link returns
                await WebBrowser.openBrowserAsync(paymentPageUrl);

                // WebBrowser.openBrowserAsync resolves when the browser is dismissed
                // (happens on iOS dismiss or Android back). Deep link handler also handles success.
                setLoading(false);
            } else {
                Alert.alert('Error', 'Failed to initiate payment');
                setLoading(false);
            }

        } catch (error) {
            console.error('Payment Error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Payment initialization failed');
            setLoading(false);
        }
    };

    // Deep Linking Listener — handles redirect from Paytm callback
    useEffect(() => {
        const handleDeepLink = (event) => {
            const data = Linking.parse(event.url);
            // Check if this is our payment callback
            if (data.path && data.path.includes('payment-status')) {
                // Close browser if still open
                WebBrowser.dismissBrowser();
                setLoading(false);

                const status = data.queryParams?.status;
                const orderId = data.queryParams?.orderId;
                const txnId = data.queryParams?.txnId;

                if (status === 'success') {
                    router.replace({
                        pathname: '/(employer)/payment-status',
                        params: { status: 'success', orderId, txnId }
                    });
                } else {
                    router.replace({
                        pathname: '/(employer)/payment-status',
                        params: { status: 'failed', orderId, txnId }
                    });
                }
            }
        };

        const subscription = Linking.addEventListener('url', handleDeepLink);
        return () => subscription.remove();
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{t('payment_summary')}</Text>

            <View style={styles.card}>
                <Text style={styles.label}>{t('amount_to_pay')}</Text>
                <Text style={styles.amount}>₹ {amount}</Text>

                <View style={styles.divider} />

                <Text style={styles.planName}>{planName}</Text>
                <Text style={styles.description}>
                    You will be charged ₹{amount} for the {planName}. Your subscription will activate immediately after payment.
                </Text>
            </View>

            <TouchableOpacity
                style={[styles.payButton, loading && styles.disabledButton]}
                onPress={handlePayment}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                ) : (
                    <Text style={styles.payButtonText}>Pay with Paytm</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        padding: 20,
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 30,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        marginBottom: 40,
    },
    label: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginBottom: 8,
    },
    amount: {
        fontSize: 40,
        fontWeight: '800',
        color: COLORS.primary,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        width: '100%',
        marginVertical: 20,
    },
    planName: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    payButton: {
        backgroundColor: '#002E6E', // Paytm Blue
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        shadowColor: '#002E6E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    disabledButton: {
        opacity: 0.7,
    },
    payButtonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: '700',
    },
});
