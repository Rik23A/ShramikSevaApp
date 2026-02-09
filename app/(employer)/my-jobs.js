import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    Alert,
    ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import { getMyJobs, closeJob } from '../../services/jobService';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function MyJobsScreen() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all');

    const fetchJobs = async () => {
        try {
            const data = await getMyJobs();
            setJobs(data?.jobs || data || []);
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchJobs();
        }, [])
    );

    const filteredJobs = jobs.filter(job => {
        if (filter === 'all') return true;
        return job.status === filter;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'open': return COLORS.success;
            case 'in-progress': return COLORS.warning;
            case 'closed': return COLORS.danger;
            default: return COLORS.textSecondary;
        }
    };

    const handleCloseJob = (jobId) => {
        Alert.alert(
            'Close Job',
            'Are you sure you want to close this job? You can only have 1 active job on the Basic plan.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Close Job',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await closeJob(jobId);
                            await fetchJobs(); // Refresh list
                            Alert.alert('Success', 'Job closed successfully');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to close job');
                            console.error(error);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return <LoadingSpinner fullScreen message="Loading jobs..." />;
    }

    return (
        <View style={styles.container}>
            {/* Filters */}
            <View style={styles.filterWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterContainer}
                >
                    {['all', 'open', 'in-progress', 'closed'].map(f => (
                        <TouchableOpacity
                            key={f}
                            style={[styles.filterButton, filter === f && styles.filterActive]}
                            onPress={() => setFilter(f)}
                        >
                            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                                {f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <FlatList
                data={filteredJobs}
                keyExtractor={(item) => item._id}
                renderItem={({ item, index }) => (
                    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
                        <TouchableOpacity
                            onPress={() => router.push(`/job-details/${item._id}`)}
                            activeOpacity={0.9}
                        >
                            <Card style={styles.jobCard}>
                                <View style={styles.jobContent}>
                                    <View style={styles.jobHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.jobTitle} numberOfLines={2}>{item.title}</Text>
                                            <Text style={styles.companyName}>
                                                {item.companyName || 'Your Company'}
                                            </Text>
                                        </View>
                                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                                            <Text style={styles.statusText}>{item.status}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.divider} />

                                    <View style={styles.jobMeta}>
                                        <View style={styles.metaItem}>
                                            <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                                            <Text style={styles.metaText} numberOfLines={1}>
                                                {item.location?.address || 'Location N/A'}
                                            </Text>
                                        </View>
                                        <View style={styles.metaItem}>
                                            <Ionicons name="cash-outline" size={16} color={COLORS.textSecondary} />
                                            <Text style={styles.metaText}>₹{item.salary}/day</Text>
                                        </View>
                                    </View>

                                    <View style={styles.footer}>
                                        <View style={styles.applicantInfo}>
                                            <View style={styles.applicantBadge}>
                                                <Ionicons name="people" size={14} color={COLORS.secondary} />
                                                <Text style={styles.applicantCount}>
                                                    {item.applicants?.length || 0}
                                                </Text>
                                            </View>
                                            <Text style={styles.applicantLabel}>Applicants</Text>
                                        </View>

                                        <View style={styles.actionButtons}>
                                            {item.applicants && item.applicants.length > 0 && (
                                                <TouchableOpacity
                                                    style={styles.viewButton}
                                                    onPress={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/job/${item._id}/applicants`);
                                                    }}
                                                >
                                                    <Text style={styles.viewButtonText}>View</Text>
                                                </TouchableOpacity>
                                            )}
                                            {item.status !== 'closed' && (
                                                <TouchableOpacity
                                                    style={styles.closeButton}
                                                    onPress={(e) => {
                                                        e.stopPropagation();
                                                        handleCloseJob(item._id);
                                                    }}
                                                >
                                                    <Ionicons name="close-circle-outline" size={20} color={COLORS.danger} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </Card>
                        </TouchableOpacity>
                    </Animated.View>
                )}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconBg}>
                            <Ionicons name="briefcase" size={40} color={COLORS.secondary} />
                        </View>
                        <Text style={styles.emptyTitle}>No Jobs Found</Text>
                        <Text style={styles.emptySubtitle}>
                            {filter === 'all'
                                ? "You haven't posted any jobs yet."
                                : `No ${filter} jobs found.`}
                        </Text>
                        <TouchableOpacity
                            style={styles.postButton}
                            onPress={() => router.push('/(employer)/post-job')}
                        >
                            <Ionicons name="add" size={20} color={COLORS.white} />
                            <Text style={styles.postButtonText}>Post New Job</Text>
                        </TouchableOpacity>
                    </View>
                }
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchJobs(); }}
                        colors={[COLORS.secondary]}
                    />
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    filterWrapper: {
        backgroundColor: COLORS.background,
        paddingVertical: 12,
    },
    filterContainer: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: 8,
    },
    filterActive: {
        backgroundColor: COLORS.secondary,
        borderColor: COLORS.secondary,
    },
    filterText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    filterTextActive: {
        color: COLORS.white,
    },
    listContent: {
        padding: 16,
        paddingTop: 4,
        paddingBottom: 40,
        flexGrow: 1,
    },
    jobCard: {
        marginBottom: 16,
        borderRadius: 16,
        padding: 0, // Reset padding as we use inner views
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 3,
        shadowOpacity: 0.08,
    },
    jobContent: {
        padding: 16,
    },
    jobHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    jobTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    companyName: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.white,
        textTransform: 'uppercase',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 12,
    },
    jobMeta: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    metaText: {
        fontSize: 13,
        color: COLORS.text,
        marginLeft: 6,
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    applicantInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    applicantBadge: {
        backgroundColor: '#E3F2FD',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    },
    applicantCount: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.secondary,
        marginLeft: 4,
    },
    applicantLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    viewButton: {
        backgroundColor: COLORS.secondary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    viewButtonText: {
        fontSize: 12,
        color: COLORS.white,
        fontWeight: '600',
    },
    closeButton: {
        padding: 4,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 24,
        textAlign: 'center',
    },
    postButton: {
        backgroundColor: COLORS.secondary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        elevation: 2,
    },
    postButtonText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 14,
    },
});
