import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { WebView } from 'react-native-webview';
import { COLORS } from '../../constants/config';
import { API_URL, WEB_URL } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSocket } from '../../context/SocketContext';
import axios from 'axios';

export default function PaymentScreen() {
    const { user, token } = useAuth();
    const { t, language } = useLanguage();
    const { socket } = useSocket();
    const params = useLocalSearchParams();
    const [loading, setLoading] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(true);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [pricing, setPricing] = useState(null);
    const [showWebView, setShowWebView] = useState(false);
    const [paymentUrl, setPaymentUrl] = useState('');

    const activeOrderIdRef = useRef(null);

    // Initial values from params
    const initialAmount = params.amount || '0';
    const planId = params.planId;
    const planName = params.planName || planId || t('subscription_plan');

    // 🔌 Socket event listener for real-time payment status updates
    useEffect(() => {
        if (socket) {
            console.log('🔌 Registering payment status socket listener...');
            socket.on('payment:status', (data) => {
                console.log('🔌 WebSocket payment:status received:', data);
                if (data.orderId === activeOrderIdRef.current) {
                    router.replace({
                        pathname: '/(employer)/payment-status',
                        params: { 
                            status: data.status === 'success' ? 'success' : 'failed', 
                            orderId: data.orderId, 
                            txnId: data.txnId 
                        }
                    });
                }
            });
        }
        return () => {
            if (socket) {
                socket.off('payment:status');
            }
        };
    }, [socket]);

    // Check payment status helper
    const checkPaymentStatus = async (orderId) => {
        try {
            const statusRes = await axios.get(`${API_URL}/payments/paytm/status/${orderId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (statusRes.data && statusRes.data.success) {
                const finalStatus = statusRes.data.status;
                const finalTxnId = statusRes.data.txnId;
                if (finalStatus === 'success' || finalStatus === 'failure' || finalStatus === 'failed') {
                    router.replace({
                        pathname: '/(employer)/payment-status',
                        params: { status: (finalStatus === 'success' ? 'success' : 'failed'), orderId, txnId: finalTxnId }
                    });
                    return true;
                }
            }
        } catch (err) {
            console.log("On-demand payment status check pending or failed", err);
        }
        return false;
    };

    // 📱 AppState foreground resumption listener to capture UPI callbacks immediately
    useEffect(() => {
        const handleAppStateChange = async (nextAppState) => {
            if (nextAppState === 'active' && activeOrderIdRef.current) {
                console.log("📱 App returned to foreground, checking status immediately for:", activeOrderIdRef.current);
                await checkPaymentStatus(activeOrderIdRef.current);
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            subscription.remove();
        };
    }, []);

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
                
                // Track active order id in ref
                activeOrderIdRef.current = orderId;

                // Open the backend payment handoff page in WebView
                const paymentPageUrl = `${API_URL}/payments/paytm/pay?txnToken=${txnToken}&orderId=${orderId}&mid=${mid}`;

                setPaymentUrl(paymentPageUrl);
                setShowWebView(true);
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

    const handleNavigationStateChange = async (navState) => {
        const { url } = navState;
        console.log("🌐 WebView Navigated to:", url);

        if (url.includes('payment-status') || url.includes('/subscriptions/status')) {
            setShowWebView(false);
            setLoading(true);

            const queryParams = {};
            const urlParts = url.split('?');
            if (urlParts.length > 1) {
                const pairs = urlParts[1].split('&');
                for (const pair of pairs) {
                    const [key, value] = pair.split('=');
                    queryParams[decodeURIComponent(key)] = decodeURIComponent(value || '');
                }
            }

            const status = queryParams.status === 'success' ? 'success' : 'failed';
            const orderId = queryParams.orderId || activeOrderIdRef.current;
            const txnId = queryParams.txnId || '';

            router.replace({
                pathname: '/(employer)/payment-status',
                params: { status, orderId, txnId }
            });
        }
    };

    const handleShouldStartLoadWithRequest = (request) => {
        const { url } = request;
        
        // Allow standard web URLs to load in the WebView
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return true;
        }

        // Intercept custom schemes (like upi:// or paytmmp://) and open them in external native apps
        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                console.log("No installed app found to handle URI: " + url);
            }
        }).catch(err => console.error('Error opening URL natively:', err));
        
        return false; // Prevent the WebView from attempting to load custom schemes
    };

    if (showWebView) {
        return (
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
                <View style={{ height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingTop: 10 }}>
                    <TouchableOpacity onPress={() => setShowWebView(false)}>
                        <Ionicons name="close" size={28} color="#000" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{t('secure_payment')}</Text>
                    <View style={{ width: 28 }} />
                </View>
                
                <WebView 
                    source={{ uri: paymentUrl }}
                    onNavigationStateChange={handleNavigationStateChange}
                    onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
                    originWhitelist={['*']}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    userAgent="Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36"
                    renderLoading={() => <ActivityIndicator size="large" color="#002E6E" style={{ position: 'absolute', top: '50%', left: '50%', transform: [{translateX: -25}, {translateY: -25}] }} />}
                />
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
