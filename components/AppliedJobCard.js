import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/config';
import { router } from 'expo-router';

const AppliedJobCard = ({ application, onPress }) => {
    const { job, status } = application;

    if (!job) return null;

    const handlePress = () => {
        if (onPress) {
            onPress(application);
        } else {
            router.push(`/job-details/${job._id}`);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'hired': return COLORS.success;
            case 'rejected': return COLORS.danger;
            case 'pending': return COLORS.warning;
            default: return COLORS.primary;
        }
    };

    const getStatusBg = (status) => {
        switch (status) {
            case 'hired': return 'rgba(76, 175, 80, 0.1)';
            case 'rejected': return 'rgba(244, 67, 54, 0.1)';
            case 'pending': return 'rgba(255, 152, 0, 0.1)';
            default: return 'rgba(33, 150, 243, 0.1)';
        }
    };

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={handlePress}
            activeOpacity={0.8}
        >
            <View style={styles.header}>
                <Text style={styles.title} numberOfLines={1}>{job.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusBg(status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
                        {status}
                    </Text>
                </View>
            </View>

            <View style={styles.companyRow}>
                <Ionicons name="business-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.companyName} numberOfLines={1}>
                    {job.employer?.companyName || job.employer?.name || "Company"}
                </Text>
            </View>

            <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.location} numberOfLines={1}>
                    {job.location?.address ? job.location.address.split(',')[0].trim() : "Location TBA"}
                </Text>
            </View>

            <View style={styles.footer}>
                <Text style={styles.date}>Applied: {new Date(application.appliedDate).toLocaleDateString()}</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 12,
        width: 250,
        marginRight: 12,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
        flex: 1,
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    companyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    companyName: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginLeft: 4,
        flex: 1,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    location: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginLeft: 4,
        flex: 1,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 8,
    },
    date: {
        fontSize: 10,
        color: COLORS.textSecondary,
    },
});

export default AppliedJobCard;
