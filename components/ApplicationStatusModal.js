import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/config';
import { router } from 'expo-router';
import { useLanguage } from '../context/LanguageContext';

const ApplicationStatusModal = ({ isOpen, onClose, application }) => {
    const { t } = useLanguage();

    if (!application) return null;

    const { job, status, appliedDate } = application;
    const isHireRequest = ['offered', 'offerAccepted', 'offerRejected'].includes(status);

    // Helper to get status label (mocking translations for now if keys missing)
    const getStatusLabel = (key) => {
        // In a real app, use t(key)
        return t(key) || key.split('.').pop().replace(/([A-Z])/g, ' $1').trim();
    };

    const steps = [
        {
            id: 'initiation',
            label: isHireRequest ? 'Offer Received' : 'Applied',
            date: new Date(appliedDate).toLocaleDateString(),
            icon: isHireRequest ? 'briefcase' : 'document-text',
            active: true,
            completed: true,
            color: COLORS.primary
        },
        {
            id: 'review',
            label: isHireRequest ? 'You Accepted' : 'In Review',
            date: isHireRequest ? (status === 'offerAccepted' ? 'Offer Accepted' : 'Pending Action') : (status !== 'pending' ? 'Viewed by Employer' : 'Pending'),
            icon: isHireRequest ? 'checkmark-circle' : 'time',
            active: isHireRequest ? status === 'offerAccepted' : status !== 'pending',
            completed: isHireRequest ? status === 'offerAccepted' : status !== 'pending',
            color: (isHireRequest ? status === 'offerAccepted' : status !== 'pending') ? COLORS.primary : COLORS.textSecondary
        },
        {
            id: 'decision',
            label: status === 'hired' || status === 'offerAccepted' ? 'Hired' :
                status === 'offered' ? 'Response Needed' :
                    status === 'rejected' || status === 'offerRejected' ? 'Not Selected' : 'Decision',
            date: status === 'pending' || status === 'offered' ? 'In Progress' :
                (status === 'approved' ? 'Shortlisted' :
                    status === 'hired' || status === 'offerAccepted' ? 'Congratulations!' : 'Closed'),
            icon: status === 'hired' || status === 'offerAccepted' ? 'checkmark-circle' :
                status === 'rejected' || status === 'offerRejected' ? 'close-circle' :
                    status === 'offered' ? 'briefcase' : 'ellipse-outline',
            active: ['hired', 'rejected', 'offerAccepted', 'offerRejected'].includes(status),
            completed: ['hired', 'rejected', 'offerAccepted', 'offerRejected'].includes(status),
            color: status === 'hired' || status === 'offerAccepted' ? COLORS.success :
                status === 'rejected' || status === 'offerRejected' ? COLORS.danger :
                    status === 'offered' ? COLORS.info : COLORS.textSecondary
        }
    ];

    const handleMessage = () => {
        // Navigate to chat
        // Assuming we have a way to navigate to specific chat or messages list
        // For now, just go to messages tab or similar
        router.push('/(worker)/messages');
        onClose();
    };

    const handleViewJob = () => {
        if (status === 'offered') {
            // hiring requests page
            // router.push('/dashboard/worker/hiring-requests'); // Adjust route as needed
            router.push(`/job-details/${job._id}`);
        } else {
            router.push(`/job-details/${job._id}`);
        }
        onClose();
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isOpen}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                            <Text style={styles.companyName}>
                                {job.employer?.companyName || job.employer?.name}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        <View style={styles.timeline}>
                            {/* Line connecting steps */}
                            <View style={styles.timelineLine} />

                            {steps.map((step, index) => (
                                <View key={step.id} style={styles.stepContainer}>
                                    <View style={[styles.stepIconContainer, { borderColor: step.active ? step.color : COLORS.border, backgroundColor: COLORS.card }]}>
                                        <Ionicons
                                            name={step.icon}
                                            size={16}
                                            color={step.active ? step.color : COLORS.textLight}
                                        />
                                    </View>
                                    <View style={styles.stepContent}>
                                        <Text style={[styles.stepLabel, { color: step.active ? COLORS.text : COLORS.textSecondary }]}>
                                            {step.label}
                                        </Text>
                                        <Text style={styles.stepDate}>{step.date}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.actionButtonOutline}
                            onPress={handleMessage}
                        >
                            <Ionicons name="chatbubble-ellipses-outline" size={18} color={COLORS.primary} />
                            <Text style={styles.actionButtonTextOutline}>Chat</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButtonPrimary}
                            onPress={handleViewJob}
                        >
                            <Ionicons name={status === 'offered' ? 'briefcase-outline' : 'document-text-outline'} size={18} color={COLORS.white} />
                            <Text style={styles.actionButtonTextPrimary}>
                                {status === 'offered' ? 'View Offer' : 'View Job'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
        minHeight: '50%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTextContainer: {
        flex: 1,
        marginRight: 10,
    },
    jobTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    companyName: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    closeButton: {
        padding: 4,
    },
    modalBody: {
        padding: 24,
    },
    timeline: {
        position: 'relative',
        paddingLeft: 10,
    },
    timelineLine: {
        position: 'absolute',
        left: 20, // Center of icon (20/2 + padding)
        top: 10,
        bottom: 30, // Adjust based on last item
        width: 2,
        backgroundColor: COLORS.border,
        zIndex: -1,
    },
    stepContainer: {
        flexDirection: 'row',
        marginBottom: 32,
        alignItems: 'flex-start',
    },
    stepIconContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        zIndex: 1,
    },
    stepContent: {
        flex: 1,
        paddingTop: 2,
    },
    stepLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    stepDate: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        gap: 12,
    },
    actionButtonOutline: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.primary,
        backgroundColor: COLORS.card,
        gap: 8,
    },
    actionButtonTextOutline: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 16,
    },
    actionButtonPrimary: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        gap: 8,
    },
    actionButtonTextPrimary: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 16,
    },
});

export default ApplicationStatusModal;
