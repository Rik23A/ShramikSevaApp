import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import { getMyJobs, hireWorker } from '../../services/jobService';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import * as Haptics from 'expo-haptics';

export default function DirectHireModal({ visible, onClose, workerId, workerName }) {
    const { showToast } = useToast();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [jobs, setJobs] = useState([]);
    const [fetchingJobs, setFetchingJobs] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);

    useEffect(() => {
        if (visible) {
            fetchJobs();
            setSelectedJob(null);
        }
    }, [visible]);

    const fetchJobs = async () => {
        setFetchingJobs(true);
        try {
            const myJobs = await getMyJobs();
            // Filter only open jobs
            const openJobs = myJobs.filter(job => job.status === 'open');
            setJobs(openJobs);
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
            Alert.alert(t('error'), t('failed_load_jobs'));
        } finally {
            setFetchingJobs(false);
        }
    };

    const handleHire = async () => {
        if (!selectedJob) return;

        setLoading(true);
        try {
            await hireWorker(selectedJob, workerId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast('success', t('job_offer_sent'), t('job_offer_success_msg', { name: workerName }));
            onClose(true); // pass true to indicate success
        } catch (error) {
            console.error('Hire error:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const message = error.response?.data?.message || t('failed_send_offer');
            Alert.alert(t('error'), message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => onClose(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>{t('hire_worker_title', { name: workerName })}</Text>
                        <TouchableOpacity onPress={() => onClose(false)}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>{t('select_job_offer_msg')}</Text>

                    {fetchingJobs ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        </View>
                    ) : jobs.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="briefcase-outline" size={48} color={COLORS.textSecondary} />
                            <Text style={styles.emptyText}>{t('no_open_jobs')}</Text>
                            <Text style={styles.emptySubText}>{t('create_job_before_hire')}</Text>
                        </View>
                    ) : (
                        <ScrollView style={styles.jobList} showsVerticalScrollIndicator={false}>
                            {jobs.map(job => (
                                <TouchableOpacity
                                    key={job._id}
                                    style={[
                                        styles.jobCard,
                                        selectedJob === job._id && styles.selectedJobCard
                                    ]}
                                    onPress={() => setSelectedJob(job._id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.jobInfo}>
                                        <Text style={styles.jobTitle}>{job.title}</Text>
                                        <Text style={styles.jobSalary}>
                                            ₹{job.salary} {job.workType === 'temporary' ? t('per_day') : t('per_month')}
                                        </Text>
                                    </View>
                                    <View style={[
                                        styles.radioOuter,
                                        selectedJob === job._id && styles.radioOuterSelected
                                    ]}>
                                        {selectedJob === job._id && <View style={styles.radioInner} />}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => onClose(false)}
                        >
                            <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.hireButton,
                                (!selectedJob || loading || jobs.length === 0) && styles.hireButtonDisabled
                            ]}
                            onPress={handleHire}
                            disabled={!selectedJob || loading || jobs.length === 0}
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.white} size="small" />
                            ) : (
                                <Text style={styles.hireButtonText}>{t('send_offer')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginBottom: 16,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginTop: 12,
    },
    emptySubText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 4,
        textAlign: 'center',
    },
    jobList: {
        maxHeight: 300,
    },
    jobCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 12,
        backgroundColor: COLORS.backgroundLight,
    },
    selectedJobCard: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryLight + '20', // Add slight transparency
    },
    jobInfo: {
        flex: 1,
    },
    jobTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    jobSalary: {
        fontSize: 14,
        color: COLORS.success,
        fontWeight: '500',
    },
    radioOuter: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioOuterSelected: {
        borderColor: COLORS.primary,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.primary,
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    hireButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hireButtonDisabled: {
        opacity: 0.5,
    },
    hireButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
    },
});
