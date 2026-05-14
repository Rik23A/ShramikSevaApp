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
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import PhotoCapture from './PhotoCapture';
import * as Haptics from 'expo-haptics';

const StartWorkModal = ({ visible, onClose, jobId, onSuccess }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { t } = useLanguage();
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
            // Fetch job to check OTP requirement
            const { getJobById } = require('../../services/jobService');
            const jobData = await getJobById(jobId);

            // We need to fetch the work log to see if OTP was already generated
            // Assuming getWorkLogByJob is imported or available via props/context
            const { getWorkLogByJob } = require('../../services/worklogService');
            let log;
            try {
                log = await getWorkLogByJob(jobId);
            } catch (error) {
                if (error?.response?.status === 404) {
                    console.log('No existing work log for today, starting fresh.');
                } else {
                    console.error('Error fetching work log:', error);
                }
            }

            if (log) {
                if (log.startPhoto) {
                    console.log('Start photo already uploaded');
                    Alert.alert(t('success'), t('start_work_already_completed') || 'Start work process already completed for today.');
                    onClose();
                    return;
                }
            }

            if (jobData && !jobData.otpVerificationRequired) {
                // Bypass OTP completely
                setOtpVerified(true);
                setCurrentStep(3);
                return;
            }

            if (log) {
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
            console.error('Error in checkExistingWorkLog:', error);
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
                t('otp_sent_to_employer') || 'OTP Sent to Employer',
                t('otp_sent_msg') || 'An OTP has been sent to your employer. Please ask them for the OTP to continue.',
                [{ text: t('ok') || 'OK' }]
            );
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            console.error('Error requesting OTP:', error);
            const errorMessage = error?.response?.data?.message || error?.message || t('failed_to_request_otp') || 'Failed to request OTP';
            Alert.alert(t('error_title'), errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (otp.length !== 6) {
            Alert.alert(t('invalid_otp') || 'Invalid OTP', t('enter_6_digit_otp') || 'Please enter a 6-digit OTP');
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
            const errorMessage = error?.response?.data?.message || error?.message || t('invalid_otp') || 'Invalid OTP';
            Alert.alert(t('error_title'), errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUploaded = async ({ photoUrl, location }) => {
        setLoading(true);
        try {
            await uploadWorkPhoto(jobId, user._id, 'start', photoUrl, location);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast({
                type: 'success',
                title: t('work_started') || 'Work Started',
                message: t('work_session_started') || 'Your work session has started for today.'
            });
            setTimeout(() => {
                onSuccess && onSuccess();
                onClose();
            }, 1000);
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackStyle.Error);
            console.error('Error uploading photo:', error);
            const errorMessage = error?.response?.data?.message || error?.message || t('failed_to_upload_photo') || 'Failed to upload photo';
            Alert.alert(t('error_title'), errorMessage);
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
                    <Text style={styles.modalTitle}>{t('start_work')}</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                    {currentStep === 1 && (
                        <View style={styles.stepContent}>
                            <View style={styles.infoCard}>
                                <Ionicons name="information-circle" size={48} color={COLORS.primary} />
                                <Text style={styles.infoTitle}>{t('ready_to_start_work')}</Text>
                                <Text style={styles.infoText}>
                                    {t('request_otp_employer')}
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
                                        <Text style={styles.primaryButtonText}>{t('request_otp_employer')}</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {currentStep === 2 && otpRequested && (
                        <View style={styles.stepContent}>
                            <View style={styles.otpCard}>
                                <Ionicons name="lock-closed" size={48} color={COLORS.primary} />
                                <Text style={styles.otpTitle}>{t('enter_otp')}</Text>
                                <Text style={styles.otpSubtitle}>
                                    {t('ask_employer_otp') || 'Ask your employer for the 6-digit OTP'}
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
                                            <Text style={styles.primaryButtonText}>{t('verify_otp')}</Text>
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
                                <Text style={styles.successTitle}>{t('otp_verified_success')}</Text>
                                <Text style={styles.successText}>{t('capture_photo_start')}</Text>
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
