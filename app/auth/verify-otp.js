import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import OtpInput from '../../components/OtpInput';
import { COLORS } from '../../constants/config';
import { verifyOtp, completeRegistration, requestOtp } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

export default function VerifyOtpScreen() {
    const { mobile, isLogin } = useLocalSearchParams();
    const { login } = useAuth();
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(30);
    const [canResend, setCanResend] = useState(false);

    useEffect(() => {
        let interval;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        } else {
            setCanResend(true);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const handleVerifyOtp = async () => {
        if (otp.length !== 6) {
            Alert.alert('Error', 'Please enter the complete 6-digit OTP');
            return;
        }

        setLoading(true);

        try {
            let userData;

            if (isLogin === 'true') {
                // Login flow
                userData = await verifyOtp(mobile, otp);
            } else {
                // Registration flow
                userData = await completeRegistration(mobile, otp);
            }

            // Save auth data and navigate
            await login(userData);

            // Navigate based on role
            if (userData.role === 'worker') {
                router.replace('/(worker)/dashboard');
            } else if (userData.role === 'employer') {
                router.replace('/(employer)/dashboard');
            }
        } catch (err) {
            Alert.alert(
                'Verification Failed',
                err.response?.data?.message || 'Invalid OTP. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (!canResend) return;

        try {
            await requestOtp(mobile);
            setResendTimer(30);
            setCanResend(false);
            Alert.alert('Success', 'OTP sent successfully!');
        } catch (err) {
            Alert.alert('Error', 'Failed to resend OTP. Please try again.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>

                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="mail-open" size={50} color={COLORS.primary} />
                    </View>
                    <Text style={styles.title}>Verify OTP</Text>
                    <Text style={styles.subtitle}>
                        Enter the 6-digit code sent to{'\n'}
                        <Text style={styles.mobileText}>+91 {mobile}</Text>
                    </Text>
                </View>

                <View style={styles.otpContainer}>
                    <OtpInput value={otp} onChange={setOtp} length={6} />
                </View>

                <View style={styles.resendContainer}>
                    {canResend ? (
                        <TouchableOpacity onPress={handleResendOtp}>
                            <Text style={styles.resendButton}>Resend OTP</Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.resendTimer}>
                            Resend OTP in <Text style={styles.timerText}>{resendTimer}s</Text>
                        </Text>
                    )}
                </View>

                <Button
                    title="Verify & Continue"
                    onPress={handleVerifyOtp}
                    loading={loading}
                    disabled={otp.length !== 6 || loading}
                    style={styles.verifyButton}
                />

                <Text style={styles.hint}>
                    💡 In development mode, check the backend console for the OTP
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
        padding: 24,
    },
    backButton: {
        marginBottom: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FFF3E0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    mobileText: {
        fontWeight: '600',
        color: COLORS.text,
    },
    otpContainer: {
        marginBottom: 24,
    },
    resendContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    resendTimer: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    timerText: {
        fontWeight: '600',
        color: COLORS.primary,
    },
    resendButton: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
    },
    verifyButton: {
        marginBottom: 24,
    },
    hint: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
});
