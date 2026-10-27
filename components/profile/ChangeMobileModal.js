import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../../constants/config';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { initiateChangeMobile, verifyChangeMobile } from '../../services/userService';
import Button from '../ui/Button';

export default function ChangeMobileModal({ visible, onClose, currentMobile, onSuccess }) {
    const { t } = useLanguage();
    const { updateUser } = useAuth();
    const insets = useSafeAreaInsets();

    const [step, setStep] = useState(1); // 1: Enter Number, 2: Enter OTP
    const [newMobile, setNewMobile] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(30);
    const [canResend, setCanResend] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        if (visible) {
            setStep(1);
            setNewMobile('');
            setOtp('');
            setLoading(false);
            setTimer(30);
            setCanResend(false);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
    }, [visible]);

    useEffect(() => {
        if (step === 2) {
            setTimer(30);
            setCanResend(false);
            if (timerRef.current) clearInterval(timerRef.current);

            timerRef.current = setInterval(() => {
                setTimer((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        setCanResend(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [step]);

    const handleSendOtp = async () => {
        const clean = newMobile.trim();
        if (!clean) {
            Alert.alert(t('error_title') || 'Error', t('enter_mobile_error') || 'Please enter a valid 10-digit mobile number');
            return;
        }

        const mobileRegex = /^[6-9]\d{9}$/;
        if (!mobileRegex.test(clean)) {
            Alert.alert(t('error_title') || 'Error', t('invalid_mobile_format') || 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9');
            return;
        }

        if (clean === currentMobile) {
            Alert.alert(t('error_title') || 'Error', t('same_mobile_error') || 'New mobile number cannot be the same as your current number');
            return;
        }

        setLoading(true);
        try {
            const response = await initiateChangeMobile(clean);
            setLoading(false);
            setStep(2);
            Alert.alert(
                t('otp_sent_title') || 'OTP Sent',
                response.message || `A 6-digit verification code has been sent to ${clean}`
            );
        } catch (error) {
            setLoading(false);
            const msg = error.response?.data?.message || error.message || 'Failed to send OTP';
            Alert.alert(t('error_title') || 'Error', msg);
        }
    };

    const handleResendOtp = async () => {
        if (!canResend) return;
        setLoading(true);
        try {
            await initiateChangeMobile(newMobile.trim());
            setLoading(false);
            setTimer(30);
            setCanResend(false);

            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setTimer((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        setCanResend(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            Alert.alert(t('otp_resent') || 'OTP Resent', `A new verification code has been sent to ${newMobile}`);
        } catch (error) {
            setLoading(false);
            const msg = error.response?.data?.message || error.message || 'Failed to resend OTP';
            Alert.alert(t('error_title') || 'Error', msg);
        }
    };

    const handleVerifyOtp = async () => {
        const cleanOtp = otp.trim();
        if (!cleanOtp || cleanOtp.length !== 6) {
            Alert.alert(t('error_title') || 'Error', t('enter_valid_otp') || 'Please enter the 6-digit verification code');
            return;
        }

        setLoading(true);
        try {
            const response = await verifyChangeMobile(newMobile.trim(), cleanOtp);
            setLoading(false);

            if (response.user && updateUser) {
                updateUser(response.user);
            }

            Alert.alert(
                t('success') || 'Success',
                t('mobile_updated_success') || 'Your mobile number has been updated successfully!',
                [
                    {
                        text: t('ok') || 'OK',
                        onPress: () => {
                            if (onSuccess) onSuccess(newMobile.trim());
                            onClose();
                        },
                    },
                ]
            );
        } catch (error) {
            setLoading(false);
            const msg = error.response?.data?.message || error.message || 'Invalid or expired OTP';
            Alert.alert(t('error_title') || 'Error', msg);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
            statusBarTranslucent={true}
        >
            <View style={styles.container}>
                <StatusBar style="light" backgroundColor={COLORS.primary || '#1976D2'} translucent={true} />

                {/* Header */}
                <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.headerButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="close" size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{t('change_mobile_number') || 'Change Mobile Number'}</Text>
                        <View style={{ width: 38 }} />
                    </View>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
                    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                        {/* Step Indicator Badge */}
                        <View style={styles.stepBadgeContainer}>
                            <View style={[styles.stepDot, styles.stepActiveDot]}>
                                <Text style={styles.stepDotText}>1</Text>
                            </View>
                            <View style={[styles.stepLine, step === 2 && styles.stepLineActive]} />
                            <View style={[styles.stepDot, step === 2 && styles.stepActiveDot]}>
                                <Text style={[styles.stepDotText, step === 1 && styles.stepDotInactiveText]}>2</Text>
                            </View>
                        </View>

                        {step === 1 ? (
                            /* STEP 1: Enter New Mobile Number */
                            <View style={styles.card}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="phone-portrait-outline" size={32} color={COLORS.primary} />
                                </View>

                                <Text style={styles.title}>{t('enter_new_mobile') || 'Enter New Mobile Number'}</Text>
                                <Text style={styles.subtitle}>
                                    {t('change_mobile_desc') || 'We will send a 6-digit one-time verification code to verify your new mobile number.'}
                                </Text>

                                <View style={styles.currentMobileBox}>
                                    <Text style={styles.currentMobileLabel}>{t('current_number') || 'Current Number'}:</Text>
                                    <Text style={styles.currentMobileValue}>+91 {currentMobile || 'N/A'}</Text>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>{t('new_mobile_number') || 'New Mobile Number'} *</Text>
                                    <View style={styles.phoneInputContainer}>
                                        <View style={styles.countryCodeBadge}>
                                            <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                                        </View>
                                        <TextInput
                                            style={styles.phoneInput}
                                            value={newMobile}
                                            onChangeText={setNewMobile}
                                            placeholder="10-digit mobile number"
                                            placeholderTextColor={COLORS.textLight}
                                            keyboardType="phone-pad"
                                            maxLength={10}
                                            autoFocus={true}
                                        />
                                    </View>
                                </View>

                                <View style={styles.actionContainer}>
                                    <Button
                                        title={loading ? (t('sending_otp') || 'Sending Code...') : (t('send_otp') || 'Send Verification Code')}
                                        onPress={handleSendOtp}
                                        loading={loading}
                                        disabled={loading || newMobile.trim().length < 10}
                                    />
                                </View>
                            </View>
                        ) : (
                            /* STEP 2: Enter 6-Digit OTP */
                            <View style={styles.card}>
                                <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
                                    <Ionicons name="shield-checkmark-outline" size={32} color={COLORS.primary} />
                                </View>

                                <Text style={styles.title}>{t('verify_phone_number') || 'Verify Mobile Number'}</Text>
                                <Text style={styles.subtitle}>
                                    {t('enter_otp_sent_to') || 'Enter the 6-digit code sent to'}{' '}
                                    <Text style={{ fontWeight: '700', color: COLORS.text }}>+91 {newMobile}</Text>
                                </Text>

                                <TouchableOpacity onPress={() => setStep(1)} style={styles.changeNumberLink}>
                                    <Ionicons name="create-outline" size={14} color={COLORS.primary} />
                                    <Text style={styles.changeNumberText}>{t('change_number') || 'Change number'}</Text>
                                </TouchableOpacity>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>{t('verification_code') || '6-Digit Verification Code'}</Text>
                                    <TextInput
                                        style={styles.otpInput}
                                        value={otp}
                                        onChangeText={setOtp}
                                        placeholder="• • • • • •"
                                        placeholderTextColor={COLORS.textLight}
                                        keyboardType="number-pad"
                                        maxLength={6}
                                        autoFocus={true}
                                        textAlign="center"
                                    />
                                </View>

                                <View style={styles.timerRow}>
                                    {canResend ? (
                                        <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                                            <Text style={styles.resendActiveText}>{t('resend_otp') || 'Resend Code'}</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <Text style={styles.timerText}>
                                            {t('resend_in') || 'Resend code in'} <Text style={{ fontWeight: '700', color: COLORS.primary }}>{timer}s</Text>
                                        </Text>
                                    )}
                                </View>

                                <View style={styles.actionContainer}>
                                    <Button
                                        title={loading ? (t('verifying') || 'Verifying...') : (t('verify_and_update') || 'Verify & Update Number')}
                                        onPress={handleVerifyOtp}
                                        loading={loading}
                                        disabled={loading || otp.trim().length !== 6}
                                    />
                                </View>
                            </View>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    headerContainer: {
        backgroundColor: COLORS.primary || '#1976D2',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.08)',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
    },
    header: {
        height: 56,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    headerButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    content: {
        padding: 20,
        alignItems: 'center',
    },
    stepBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
        paddingHorizontal: 20,
    },
    stepDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepActiveDot: {
        backgroundColor: COLORS.primary || '#1976D2',
    },
    stepDotText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    stepDotInactiveText: {
        color: '#64748B',
    },
    stepLine: {
        width: 60,
        height: 3,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 8,
        borderRadius: 2,
    },
    stepLineActive: {
        backgroundColor: COLORS.primary || '#1976D2',
    },
    card: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        alignItems: 'center',
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
        paddingHorizontal: 8,
    },
    currentMobileBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        marginBottom: 20,
        width: '100%',
        justifyContent: 'space-between',
    },
    currentMobileLabel: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    currentMobileValue: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '700',
    },
    inputGroup: {
        width: '100%',
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    phoneInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
    },
    countryCodeBadge: {
        paddingHorizontal: 12,
        paddingVertical: 14,
        backgroundColor: '#F8FAFC',
        borderRightWidth: 1,
        borderRightColor: '#E2E8F0',
    },
    countryCodeText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
    },
    phoneInput: {
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        color: COLORS.text,
        letterSpacing: 1,
    },
    otpInput: {
        borderWidth: 1.5,
        borderColor: COLORS.primary || '#1976D2',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.text,
        letterSpacing: 8,
        backgroundColor: '#F8FAFC',
    },
    changeNumberLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 16,
    },
    changeNumberText: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '600',
    },
    timerRow: {
        marginBottom: 20,
    },
    timerText: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    resendActiveText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.primary,
    },
    actionContainer: {
        width: '100%',
    },
});
