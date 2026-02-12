import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import * as Haptics from 'expo-haptics';

/**
 * OTP Display Component
 * Shows a large, readable OTP with copy functionality and countdown timer
 */
const OtpDisplay = ({ otp, expiresAt, verified = false, onExpired }) => {
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
        if (!expiresAt) return;

        const updateTimer = () => {
            const now = new Date();
            const expiry = new Date(expiresAt);
            const diff = expiry - now;

            if (diff <= 0) {
                setTimeLeft(0);
                onExpired && onExpired();
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft({ hours, minutes, seconds });
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [expiresAt, onExpired]);

    const handleCopy = async () => {
        await Clipboard.setStringAsync(otp);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Copied!', 'OTP copied to clipboard');
    };

    const formatOtp = (otp) => {
        // Format as XXX XXX for better readability
        return otp.match(/.{1,3}/g)?.join(' ') || otp;
    };

    return (
        <View style={styles.container}>
            <View style={styles.otpCard}>
                {verified ? (
                    <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                        <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                ) : (
                    <View style={styles.pendingBadge}>
                        <Ionicons name="time" size={20} color={COLORS.warning} />
                        <Text style={styles.pendingText}>Waiting for verification</Text>
                    </View>
                )}

                <Text style={styles.label}>Work OTP</Text>

                <View style={styles.otpContainer}>
                    <Text style={styles.otpText}>{formatOtp(otp)}</Text>
                    <TouchableOpacity
                        style={styles.copyButton}
                        onPress={handleCopy}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="copy-outline" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                {timeLeft !== null && timeLeft !== 0 && (
                    <View style={styles.timerContainer}>
                        <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.timerText}>
                            Expires in: {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
                        </Text>
                    </View>
                )}

                {timeLeft === 0 && (
                    <View style={styles.expiredContainer}>
                        <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
                        <Text style={styles.expiredText}>OTP Expired</Text>
                    </View>
                )}

                <View style={styles.instructionContainer}>
                    <Ionicons name="information-circle-outline" size={18} color={COLORS.info} />
                    <Text style={styles.instructionText}>
                        Share this OTP with your employer to verify work
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 16,
    },
    otpCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.successLight,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 16,
    },
    verifiedText: {
        color: COLORS.success,
        fontWeight: '600',
        marginLeft: 8,
        fontSize: 14,
    },
    pendingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.warningLight,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 16,
    },
    pendingText: {
        color: COLORS.warning,
        fontWeight: '600',
        marginLeft: 8,
        fontSize: 14,
    },
    label: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 12,
        fontWeight: '500',
    },
    otpContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        paddingHorizontal: 24,
        paddingVertical: 16,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    otpText: {
        fontSize: 36,
        fontWeight: '700',
        color: COLORS.primary,
        letterSpacing: 4,
        fontFamily: 'monospace',
    },
    copyButton: {
        marginLeft: 16,
        padding: 8,
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    timerText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginLeft: 6,
    },
    expiredContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.dangerLight,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginBottom: 12,
    },
    expiredText: {
        fontSize: 14,
        color: COLORS.danger,
        fontWeight: '600',
        marginLeft: 6,
    },
    instructionContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: COLORS.infoLight,
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    instructionText: {
        fontSize: 13,
        color: COLORS.info,
        marginLeft: 8,
        flex: 1,
        lineHeight: 18,
    },
});

export default OtpDisplay;
