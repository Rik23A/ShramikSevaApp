import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, WORKER_TYPES } from '../constants/config';

const JobCard = ({ job, onPress }) => {
    const formatSalary = (salary) => {
        return `₹${salary.toLocaleString('en-IN')}`;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-IN');
    };

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
            <View style={styles.header}>
                <Text style={styles.title} numberOfLines={2}>{job.title}</Text>
                <View style={[styles.statusBadge,
                job.status === 'open' && styles.statusOpen,
                job.status === 'closed' && styles.statusClosed,
                job.status === 'in-progress' && styles.statusProgress,
                ]}>
                    <Text style={styles.statusText}>{job.status}</Text>
                </View>
            </View>

            {job.employer?.companyName && (
                <View style={styles.row}>
                    <Ionicons name="business-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.company}>{job.employer.companyName}</Text>
                </View>
            )}

            <View style={styles.row}>
                <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.location} numberOfLines={1}>
                    {job.address || job.location?.address || 'Location not specified'}
                </Text>
            </View>

            <View style={styles.footer}>
                <View style={styles.salaryContainer}>
                    <Text style={styles.salary}>{formatSalary(job.salary)}</Text>
                    <Text style={styles.salaryLabel}>/ day</Text>
                </View>

                <View style={styles.meta}>
                    <View style={[styles.typeBadge,
                    job.workType === 'permanent' && styles.permanentBadge
                    ]}>
                        <Text style={styles.typeText}>{job.workType}</Text>
                    </View>
                    <Text style={styles.date}>{formatDate(job.createdAt)}</Text>
                </View>
            </View>

            {job.skills && job.skills.length > 0 && (
                <View style={styles.skillsContainer}>
                    {job.skills.slice(0, 3).map((skill, index) => (
                        <View key={index} style={styles.skillBadge}>
                            <Text style={styles.skillText}>{skill}</Text>
                        </View>
                    ))}
                    {job.skills.length > 3 && (
                        <Text style={styles.moreSkills}>+{job.skills.length - 3}</Text>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        flex: 1,
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        backgroundColor: COLORS.textSecondary,
    },
    statusOpen: {
        backgroundColor: COLORS.success,
    },
    statusClosed: {
        backgroundColor: COLORS.danger,
    },
    statusProgress: {
        backgroundColor: COLORS.warning,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.white,
        textTransform: 'uppercase',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    company: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginLeft: 6,
    },
    location: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginLeft: 6,
        flex: 1,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    salaryContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    salary: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.primary,
    },
    salaryLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginLeft: 2,
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    typeBadge: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginRight: 8,
    },
    permanentBadge: {
        backgroundColor: '#E8F5E9',
    },
    typeText: {
        fontSize: 10,
        fontWeight: '500',
        color: COLORS.secondary,
        textTransform: 'capitalize',
    },
    date: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 10,
    },
    skillBadge: {
        backgroundColor: COLORS.background,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginRight: 6,
        marginBottom: 4,
    },
    skillText: {
        fontSize: 11,
        color: COLORS.text,
    },
    moreSkills: {
        fontSize: 11,
        color: COLORS.textSecondary,
        alignSelf: 'center',
    },
});

export default JobCard;
