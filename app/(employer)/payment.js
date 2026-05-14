import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { COLORS } from '../../constants/config';
import { API_URL, WEB_URL } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import axios from 'axios';

export default function PaymentScreen() {
    const { user, token } = useAuth();
    const { t, language } = useLanguage();
    const params = useLocalSearchParams();
    const [loading, setLoading] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(true);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [pricing, setPricing] = useState(null);

    // Initial values from params
    const initialAmount = params.amount || '0';
    const planId = params.planId;
    const planName = params.planName || planId || t('subscription_plan');

    useEffect(() => {
        const fetchPreview = async () => {
            setPreviewLoading(true);
            try {
                const response = await axios.get(
                    `${API_URL}/payments/preview?planId=${planId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setPricing(response.data);
            } catch (error) {
                console.error('Preview Error:', error);
                // Fallback to initial amount if preview fails
                setPricing({
                    basePrice: parseFloat(initialAmount),
                    taxAmount: 0,
                    totalAmount: parseFloat(initialAmount),
                    upgradeCredit: 0
                });
            } finally {
                setPreviewLoading(false);
            }
        };

        if (planId) {
            fetchPreview();
        }
    }, [planId]);

    const handlePayment = async () => {
        setLoading(true);
        try {
            const finalAmount = pricing?.totalAmount || parseFloat(initialAmount);

            if (finalAmount <= 0) {
                Alert.alert(t('error'), t('invalid_amount'));
                setLoading(false);
                return;
            }

            // 1. Initiate Payment on Backend
            const returnUrl = Linking.createURL('payment-status');
            const initiateResponse = await axios.post(
                `${API_URL}/payments/paytm/initiate`,
                {
                    amount: finalAmount,
                    // Format: SS-MOB-XXXXXXXX-YYYYYY 
                    orderId: `SS-MOB-${String(new Date().getTime()).slice(-8)}-${String(user._id).slice(-6)}`,
                    customerId: user._id,
                    email: user.email,
                    phone: user.mobile,
                    planId: planId,
                    platform: 'mobile',
                    returnUrl: returnUrl
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (initiateResponse.data.success) {
                const { txnToken, orderId, mid } = initiateResponse.data;

                // Open the backend payment handoff page in WebView
                const paymentPageUrl = `${API_URL}/payments/paytm/pay?txnToken=${txnToken}&orderId=${orderId}&mid=${mid}`;

                await WebBrowser.openBrowserAsync(paymentPageUrl);

                // --- FALLBACK POLLING FIREWALL for UPI APPS ---
                // UPI Apps completely destroy the Custom Tab and return the user instantly.
                // We keep the spinner spinning and quietly ask the backend every 3 seconds if the webhook arrived.
                let attempts = 0;
                let finalStatus = 'pending';
                let finalTxnId = null;

                while (attempts < 5 && finalStatus === 'pending') { // Poll for 15 seconds (5 attempts * 3 seconds)
                    try {
                        const statusRes = await axios.get(`${API_URL}/payments/paytm/status/${orderId}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        
                        if (statusRes.data && statusRes.data.success) {
                            finalStatus = statusRes.data.status;
                            finalTxnId = statusRes.data.txnId;
                        }
                    } catch (err) {
                        console.log("Manual polling check failed or pending", err);
                    }

                    if (finalStatus === 'pending') {
                        attempts++;
                        await new Promise(resolve => setTimeout(resolve, 3000)); // wait 3 seconds before trying again
                    }
                }

                if (finalStatus === 'success' || finalStatus === 'failure' || finalStatus === 'failed') {
                    router.replace({
                        pathname: '/(employer)/payment-status',
                        params: { status: (finalStatus === 'success' ? 'success' : 'failed'), orderId, txnId: finalTxnId }
                    });
                    return; // Stop execution here to prevent loading flicker
                } else {
                    Alert.alert(
                        t('payment_pending_title') || "Payment Processing",
                        t('payment_pending_desc') || "Your payment is still being verified by the bank. Please check your billing dashboard in a few minutes."
                    );
                }

                setLoading(false);
            } else {
                Alert.alert(t('error'), t('initiate_error'));
                setLoading(false);
            }

        } catch (error) {
            console.error('Payment Error:', error);
            Alert.alert(t('error'), error.response?.data?.message || t('payment_init_failed'));
            setLoading(false);
        }
    };

    if (previewLoading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{t('payment_summary')}</Text>

            <View style={styles.card}>
                <Text style={styles.planName}>{planName}</Text>
                
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{t('subtotal')}</Text>
                        <Text style={styles.summaryValue}>₹ {pricing?.basePrice?.toFixed(2)}</Text>
                    </View>

                    {pricing?.upgradeCredit > 0 && (
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>{t('upgrade_credit')}</Text>
                            <Text style={[styles.summaryValue, { color: COLORS.success }]}>- ₹ {pricing?.upgradeCredit?.toFixed(2)}</Text>
                        </View>
                    )}

                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{t('gst_label')}</Text>
                        <Text style={styles.summaryValue}>₹ {pricing?.taxAmount?.toFixed(2)}</Text>
                    </View>

                    <View style={[styles.divider, { marginVertical: 12 }]} />

                    <View style={styles.summaryRow}>
                        <Text style={styles.totalLabel}>{t('total_payable')}</Text>
                        <Text style={styles.totalValue}>₹ {pricing?.totalAmount?.toFixed(2)}</Text>
                    </View>
                </View>

                {/* Terms Agreement */}
                <TouchableOpacity
                    style={styles.termsContainer}
                    onPress={() => setAgreedToTerms(!agreedToTerms)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                        {agreedToTerms && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
                    </View>
                    <Text style={styles.termsText}>
                        {t('agree_to')} <Text style={styles.termsLink} onPress={() => Linking.openURL(`${WEB_URL}/${language || 'en'}/terms`)}>{t('terms_and_conditions')}</Text>, <Text style={styles.termsLink} onPress={() => Linking.openURL(`${WEB_URL}/${language || 'en'}/privacy-policy`)}>{t('privacy_policy')}</Text>, {t('and')} <Text style={styles.termsLink} onPress={() => Linking.openURL(`${WEB_URL}/${language || 'en'}/refund-policy`)}>{t('refund_policy')}</Text>.
                    </Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={[styles.payButton, (loading || !agreedToTerms) && styles.disabledButton]}
                onPress={handlePayment}
                disabled={loading || !agreedToTerms}
            >
                {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                ) : (
                    <Text style={styles.payButtonText}>{t('pay_paytm')}</Text>
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        marginBottom: 40,
    },
    summaryContainer: {
        width: '100%',
        marginTop: 10,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 4,
    },
    summaryLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    totalValue: {
        fontSize: 22,
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
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 15,
        textTransform: 'uppercase',
    },
    description: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 20,
        paddingHorizontal: 8,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: COLORS.primary,
        marginRight: 10,
        marginTop: 2, // Align with first line of text
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary,
    },
    termsText: {
        flex: 1,
        fontSize: 12,
        color: COLORS.textSecondary,
        lineHeight: 18,
    },
    termsLink: {
        color: COLORS.primary,
        fontWeight: '600',
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
