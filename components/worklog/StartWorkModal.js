import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { generateStartOtp, verifyStartOtp, uploadWorkPhoto } from '../../services/worklogService';
import PhotoCapture from './PhotoCapture';
import * as Haptics from 'expo-haptics';

const StartWorkModal = ({ visible, onClose, jobId, onSuccess }) => {
    const { user } = useAuth();
    const { socket, connected } = useSocket();

    const [loading, setLoading] = useState(false);
    const [otp, setOtp] = useState('');
    const [otpRequested, setOtpRequested] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);

    useEffect(() => {
        if (visible) {
            checkExistingWorkLog();
        } else {
            // Reset state when modal closes
            setOtp('');
            setOtpRequested(false);
            setOtpVerified(false);
            setCurrentStep(1);
        }
    }, [visible]);

    const checkExistingWorkLog = async () => {
        try {
            // We need to fetch the work log to see if OTP was already generated
            // Assuming getWorkLogByJob is imported or available via props/context
            const { getWorkLogByJob } = require('../../services/worklogService');
            const log = await getWorkLogByJob(jobId);

            if (log) {
                if (log.startPhoto) {
                    console.log('Start photo already uploaded');
                    Alert.alert('Success', 'Start work process already completed for today.');
                    onClose();
                    return;
                }
                if (log.startOtpVerified) {
                    console.log('OTP already verified');
                    setOtpVerified(true);
                    setCurrentStep(3);
                } else if (log.startOtp) {
                    console.log('OTP already generated:', log.startOtp);
                    setOtpRequested(true);
                    setCurrentStep(2);
                }
            }
        } catch (error) {
            if (error?.response?.status === 404) {
                console.log('No existing work log for today, starting fresh.');
            } else {
                console.error('Error fetching work log:', error);
            }
            // It's okay if no log exists, means we start from step 1
        }
    };

    const handleRequestOtp = async () => {
        setLoading(true);
        try {
            await generateStartOtp(jobId, user._id);
            setOtpRequested(true);
            setCurrentStep(2);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                'OTP Sent to Employer',
                'An OTP has been sent to your employer. Please ask them for the OTP to continue.',
                [{ text: 'OK' }]
            );
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            console.error('Error requesting OTP:', error);
            const errorMessage = error?.response?.data?.message || error?.message || 'Failed to request OTP';
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (otp.length !== 6) {
            Alert.alert('Invalid OTP', 'Please enter a 6-digit OTP');
            return;
        }

        setLoading(true);
        try {
            await verifyStartOtp(jobId, user._id, otp);
            setOtpVerified(true);
            setCurrentStep(3);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            console.error('Error verifying OTP:', error);
            const errorMessage = error?.response?.data?.message || error?.message || 'Invalid OTP';
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUploaded = async ({ photoUrl, location }) => {
        setLoading(true);
        try {
            await uploadWorkPhoto(jobId, user._id, 'start', photoUrl, location);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => {
                onSuccess && onSuccess();
                onClose();
            }, 1500);
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackStyle.Error);
            console.error('Error uploading photo:', error);
            const errorMessage = error?.response?.data?.message || error?.message || 'Failed to upload photo';
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Start Work</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                    {currentStep === 1 && (
                        <View style={styles.stepContent}>
                            <View style={styles.infoCard}>
                                <Ionicons name="information-circle" size={48} color={COLORS.primary} />
                                <Text style={styles.infoTitle}>Ready to Start Work?</Text>
                                <Text style={styles.infoText}>
                                    Request an OTP from your employer to begin work.
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                                onPress={handleRequestOtp}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color={COLORS.white} />
                                ) : (
                                    <>
                                        <Ionicons name="key" size={20} color={COLORS.white} />
                                        <Text style={styles.primaryButtonText}>Request OTP from Employer</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {currentStep === 2 && otpRequested && (
                        <View style={styles.stepContent}>
                            <View style={styles.otpCard}>
                                <Ionicons name="lock-closed" size={48} color={COLORS.primary} />
                                <Text style={styles.otpTitle}>Enter OTP</Text>
                                <Text style={styles.otpSubtitle}>
                                    Ask your employer for the 6-digit OTP
                                </Text>

                                <TextInput
                                    style={styles.otpInput}
                                    value={otp}
                                    onChangeText={setOtp}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    placeholder="000000"
                                    placeholderTextColor={COLORS.textSecondary}
                                    autoFocus
                                />

                                <TouchableOpacity
                                    style={[styles.primaryButton, (loading || otp.length !== 6) && styles.buttonDisabled]}
                                    onPress={handleVerifyOtp}
                                    disabled={loading || otp.length !== 6}
                                >
                                    {loading ? (
                                        <ActivityIndicator color={COLORS.white} />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                                            <Text style={styles.primaryButtonText}>Verify OTP</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {currentStep === 3 && otpVerified && (
                        <View style={styles.stepContent}>
                            <View style={styles.successCard}>
                                <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
                                <Text style={styles.successTitle}>OTP Verified!</Text>
                                <Text style={styles.successText}>Capture a photo to start work</Text>
                            </View>
                            <PhotoCapture type="start" onPhotoUploaded={handlePhotoUploaded} />
                        </View>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.primary,
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.white,
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    stepContent: {
        marginTop: 16,
    },
    infoCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        marginBottom: 24,
    },
    infoTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginTop: 16,
        marginBottom: 12,
    },
    infoText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    otpCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
    },
    otpTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginTop: 16,
        marginBottom: 8,
    },
    otpSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    otpInput: {
        width: '100%',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 16,
        fontSize: 32,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 8,
        color: COLORS.textPrimary,
        marginBottom: 24,
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 16,
        gap: 8,
        width: '100%',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
    },
    successCard: {
        backgroundColor: COLORS.successLight,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
    },
    successTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.success,
        marginTop: 12,
        marginBottom: 8,
    },
    successText: {
        fontSize: 14,
        color: COLORS.success,
        textAlign: 'center',
    },
});

export default StartWorkModal;
