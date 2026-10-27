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
import { generateEndOtp, verifyEndOtp, uploadWorkPhoto, getWorkLogByJob } from '../../services/worklogService';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import PhotoCapture from './PhotoCapture';
import LoadingSpinner from '../ui/LoadingSpinner';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const EndWorkModal = ({ visible, onClose, jobId, jobData: propJobData, onSuccess }) => {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { showToast } = useToast();
    const { t } = useLanguage();
    const { socket, connected } = useSocket();

    const [loading, setLoading] = useState(true);
    const [job, setJob] = useState(propJobData || null);
    const [workLog, setWorkLog] = useState(null);
    const [otp, setOtp] = useState('');
    const [otpRequested, setOtpRequested] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [currentStep, setCurrentStep] = useState(
        propJobData && !propJobData.otpVerificationRequired ? 3 : 1
    );

    useEffect(() => {
        if (visible) {
            setLoading(true);
            if (propJobData) {
                setJob(propJobData);
                if (!propJobData.otpVerificationRequired) {
                    setOtpVerified(true);
                    setCurrentStep(3);
                } else {
                    setCurrentStep(1);
                }
            }
            fetchWorkLog();
        } else {
            // Reset state when modal closes
            setOtp('');
            setOtpRequested(false);
            setOtpVerified(false);
            setCurrentStep(1);
            setWorkLog(null);
            setJob(null);
            setLoading(true);
        }
    }, [visible, propJobData]);

    const fetchWorkLog = async () => {
        setLoading(true);
        try {
            let jobData = propJobData;
            if (!jobData && jobId) {
                const { getJobById } = require('../../services/jobService');
                jobData = await getJobById(jobId);
                setJob(jobData);
            }

            const data = await getWorkLogByJob(jobId);
            setWorkLog(data);

            // If OTP is required, ensure start OTP was verified BEFORE checking photo
            if (jobData?.otpVerificationRequired && !data.startOtpVerified) {
                Alert.alert(t('work_not_started') || 'Work Not Started', t('start_work_required') || 'You need to start work before you can end it.');
                onClose();
                return;
            }

            // Regardless of OTP, a start photo MUST exist
            if (!data.startPhoto) {
                Alert.alert(t('work_not_started') || 'Work Not Started', t('start_work_required') || 'You need to start work before you can end it.');
                onClose();
                return;
            }

            if (data.endPhoto) {
                console.log('End photo already uploaded');
                Alert.alert(t('success'), t('work_already_ended') || 'Work already ended for today.');
                onClose();
                return;
            }

            // Auto bypass end OTP if the job doesn't require it
            if (jobData && !jobData.otpVerificationRequired) {
                console.log('OTP not required, bypassing');
                setOtpVerified(true);
                setCurrentStep(3);
                return;
            }

            if (data.endOtpVerified) {
                console.log('End OTP already verified');
                setOtpVerified(true);
                setCurrentStep(3);
            } else if (data.endOtp) {
                console.log('End OTP already generated');
                setOtpRequested(true);
                setCurrentStep(2);
            }
        } catch (error) {
            Alert.alert(t('error_title'), t('failed_to_load_work_info') || 'Failed to load work information.');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleRequestOtp = async () => {
        setLoading(true);
        try {
            await generateEndOtp(jobId, user._id);
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
            console.error('Error requesting end OTP:', error);
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
            await verifyEndOtp(jobId, user._id, otp);
            setOtpVerified(true);
            setCurrentStep(3);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            console.error('Error verifying end OTP:', error);
            const errorMessage = error?.response?.data?.message || error?.message || t('invalid_otp') || 'Invalid OTP';
            Alert.alert(t('error_title'), errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUploaded = async ({ photoUrl, location }) => {
        setLoading(true);
        try {
            await uploadWorkPhoto(jobId, user._id, 'end', photoUrl, location);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast({
                type: 'success',
                title: t('work_completed') || 'Work Completed',
                message: t('work_session_completed') || 'Your work session has been completed. Payment will be processed shortly.'
            });
            setTimeout(() => {
                onSuccess && onSuccess();
                onClose();
            }, 1000);
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            console.error('Error uploading end photo:', error);
            const errorMessage = error?.response?.data?.message || error?.message || t('failed_to_upload_photo') || 'Failed to upload photo';
            Alert.alert(t('error_title'), errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const calculateDuration = () => {
        if (!workLog?.startTime) return t('any') || 'N/A';
        const start = new Date(workLog.startTime);
        const now = new Date();
        const diff = now - start;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 16) + 12 }]}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>{t('end_work')}</Text>
                    <View style={{ width: 40 }} />
                </View>

                {loading && !workLog ? (
                    <LoadingSpinner fullScreen message={t('loading') || "Loading..."} />
                ) : (
                    <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                        {workLog && (
                            <View style={styles.summaryCard}>
                                <View style={styles.summaryHeader}>
                                    <Ionicons name="time" size={24} color={COLORS.primary} />
                                    <Text style={styles.summaryTitle}>{t('work_summary')}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>{t('started_at')}</Text>
                                    <Text style={styles.summaryValue}>
                                        {new Date(workLog.startTime).toLocaleTimeString()}
                                    </Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>{t('duration')}</Text>
                                    <Text style={styles.summaryValue}>{calculateDuration()}</Text>
                                </View>
                            </View>
                        )}

                        {currentStep === 1 && (
                            <View style={styles.stepContent}>
                                <View style={styles.infoCard}>
                                    <Ionicons name="information-circle" size={48} color={COLORS.primary} />
                                    <Text style={styles.infoTitle}>{t('ready_to_end_work')}</Text>
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
                                    <Ionicons
                                        name={job?.otpVerificationRequired ? "checkmark-circle" : "camera"}
                                        size={48}
                                        color={COLORS.success}
                                    />
                                    <Text style={styles.successTitle}>
                                        {job?.otpVerificationRequired
                                            ? (t('otp_verified_success') || 'OTP Verified Successfully')
                                            : (t('ready_to_end') || 'Ready to Complete Work')}
                                    </Text>
                                    <Text style={styles.successText}>
                                        {job?.otpVerificationRequired
                                            ? (t('capture_photo_end') || 'Please take a photo at the work location to complete work.')
                                            : (t('capture_photo_end_direct') || 'Please take a photo at your work location to end today\'s work.')}
                                    </Text>
                                </View>
                                <PhotoCapture type="end" onPhotoUploaded={handlePhotoUploaded} />
                            </View>
                        )}
                    </ScrollView>
                )}
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
    summaryCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginLeft: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    stepContent: {
        marginTop: 8,
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

export default EndWorkModal;
