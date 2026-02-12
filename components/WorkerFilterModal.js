import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, WORKER_TYPES, AVAILABILITY } from '../constants/config';

const WorkerFilterModal = ({ visible, onClose, onApply, initialFilters, jobs = [] }) => {
    const [filters, setFilters] = useState({
        jobId: '',
        workerType: '',
        location: '',
        availability: '',
    });

    useEffect(() => {
        if (visible) {
            setFilters(initialFilters || {
                jobId: '',
                workerType: '',
                location: '',
                availability: '',
            });
        }
    }, [visible, initialFilters]);

    const handleApply = () => {
        onApply(filters);
        onClose();
    };

    const handleReset = () => {
        const resetFilters = {
            jobId: '',
            workerType: '',
            location: '',
            availability: '',
        };
        setFilters(resetFilters);
    };

    const handleJobSelect = (jobId) => {
        // If selecting a job, clear other filters to avoid conflicts, 
        // or keep them if you want refined search within a job match.
        // For now, let's keep it simple: selecting a job sets the jobId.
        // You might want to auto-fill other filters based on the job, but the backend handles that logic mostly.
        setFilters(prev => ({
            ...prev,
            jobId: prev.jobId === jobId ? '' : jobId,
            // Optional: Reset manual filters when switching to smart recommendations
            // workerType: '', 
            // location: '' 
        }));
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Filter Workers</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>

                        {/* Job Match / Smart Recommendations */}
                        {jobs.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Smart Recommendations (Select Job)</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                                    <TouchableOpacity
                                        style={[
                                            styles.jobChip,
                                            !filters.jobId && styles.activeChip
                                        ]}
                                        onPress={() => setFilters(prev => ({ ...prev, jobId: '' }))}
                                    >
                                        <Text style={[styles.jobChipText, !filters.jobId && styles.activeChipText]}>None</Text>
                                    </TouchableOpacity>
                                    {jobs.map(job => (
                                        <TouchableOpacity
                                            key={job._id}
                                            style={[
                                                styles.jobChip,
                                                filters.jobId === job._id && styles.activeChip
                                            ]}
                                            onPress={() => handleJobSelect(job._id)}
                                        >
                                            <Text style={[styles.jobChipText, filters.jobId === job._id && styles.activeChipText]} numberOfLines={1}>
                                                {job.title}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* Worker Type */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Worker Type</Text>
                            <View style={styles.wrapContainer}>
                                {WORKER_TYPES.map((type, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.chip,
                                            filters.workerType === type && styles.activeChip
                                        ]}
                                        onPress={() => setFilters(prev => ({
                                            ...prev,
                                            workerType: prev.workerType === type ? '' : type
                                        }))}
                                    >
                                        <Text style={[styles.chipText, filters.workerType === type && styles.activeChipText]}>
                                            {type}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Location */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Location</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="location-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter city or area"
                                    value={filters.location}
                                    onChangeText={(text) => setFilters(prev => ({ ...prev, location: text }))}
                                    placeholderTextColor={COLORS.textSecondary}
                                />
                            </View>
                        </View>

                        {/* Availability */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Availability</Text>
                            <View style={styles.segmentContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.segmentButton,
                                        filters.availability === '' && styles.activeSegment
                                    ]}
                                    onPress={() => setFilters(prev => ({ ...prev, availability: '' }))}
                                >
                                    <Text style={[styles.segmentText, filters.availability === '' && styles.activeSegmentText]}>Any</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.segmentButton,
                                        filters.availability === 'available' && styles.activeSegment
                                    ]}
                                    onPress={() => setFilters(prev => ({ ...prev, availability: 'available' }))}
                                >
                                    <Text style={[styles.segmentText, filters.availability === 'available' && styles.activeSegmentText]}>Available</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.segmentButton,
                                        filters.availability === 'unavailable' && styles.activeSegment
                                    ]}
                                    onPress={() => setFilters(prev => ({ ...prev, availability: 'unavailable' }))}
                                >
                                    <Text style={[styles.segmentText, filters.availability === 'unavailable' && styles.activeSegmentText]}>Unavailable</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                            <Text style={styles.resetButtonText}>Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                            <Text style={styles.applyButtonText}>Apply Filters</Text>
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
        paddingTop: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
    },
    closeButton: {
        padding: 4,
    },
    scrollContent: {
        flex: 1,
        paddingHorizontal: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 12,
    },
    horizontalScroll: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    jobChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: 8,
        maxWidth: 200,
    },
    jobChipText: {
        fontSize: 14,
        color: COLORS.text,
    },
    wrapContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    activeChip: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    chipText: {
        fontSize: 14,
        color: COLORS.text,
    },
    activeChipText: {
        color: COLORS.white,
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        height: '100%',
        color: COLORS.text,
        fontSize: 15,
    },
    segmentContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeSegment: {
        backgroundColor: COLORS.primary,
    },
    segmentText: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
    activeSegmentText: {
        color: COLORS.white,
    },
    footer: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: COLORS.card,
        gap: 12,
    },
    resetButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resetButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    applyButton: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    applyButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
    },
});

export default WorkerFilterModal;
