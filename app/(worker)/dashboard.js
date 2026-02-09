import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    StatusBar,
    Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getWorkerDashboard } from '../../services/userService';
import JobCard from '../../components/JobCard';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function WorkerDashboard() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchDashboard = async () => {
        try {
            const data = await getWorkerDashboard();
            setDashboardData(data);
        } catch (error) {
            console.error('Failed to fetch dashboard:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchDashboard();
    }, []);

    if (loading) {
        return <LoadingSpinner fullScreen message={t('loading')} />;
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
            }
        >
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

            {/* Extended Blue Header */}
            <View style={styles.headerBackground}>
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.welcomeSubtitle}>{t('welcome')},</Text>
                        <Text style={styles.userName}>{user?.name || 'Worker'}! 👋</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/(worker)/profile')}>
                        <View style={styles.headerAvatar}>
                            {user?.profilePicture ? (
                                <Image source={{ uri: user.profilePicture }} style={styles.avatarImage} />
                            ) : (
                                <Ionicons name="person" size={20} color={COLORS.primary} />
                            )}
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Quick Stats Grid Overlapping Header */}
                <View style={styles.statsGrid}>
                    <TouchableOpacity style={styles.statItem} onPress={() => router.push({ pathname: '/(worker)/my-work', params: { tab: 'applications' } })}>
                        <View style={[styles.statIcon, { backgroundColor: '#E3F2FD' }]}>
                            <Ionicons name="document-text" size={22} color={COLORS.secondary} />
                        </View>
                        <Text style={styles.statNumber}>{dashboardData?.activeApplications || 0}</Text>
                        <Text style={styles.statLabel}>{t('active_applications')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.statItem} onPress={() => router.push({ pathname: '/(worker)/my-work', params: { tab: 'assigned' } })}>
                        <View style={[styles.statIcon, { backgroundColor: '#E8F5E9' }]}>
                            <Ionicons name="briefcase" size={22} color={COLORS.success} />
                        </View>
                        <Text style={styles.statNumber}>{dashboardData?.assignedJobs || 0}</Text>
                        <Text style={styles.statLabel}>{t('assigned_jobs')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.statItem} onPress={() => router.push({ pathname: '/(worker)/my-work', params: { tab: 'requests' } })}>
                        <View style={[styles.statIcon, { backgroundColor: '#FFF3E0' }]}>
                            <Ionicons name="notifications" size={22} color={COLORS.primary} />
                        </View>
                        <Text style={styles.statNumber}>{dashboardData?.hiringRequests || 0}</Text>
                        <Text style={styles.statLabel}>{t('hiring_requests')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{ marginTop: 60 }}>
                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>{t('quick_actions')}</Text>
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push('/(worker)/jobs')}
                    >
                        <View style={styles.actionIconBg}>
                            <Ionicons name="search" size={24} color={COLORS.white} />
                        </View>
                        <View style={styles.actionTextContainer}>
                            <Text style={styles.actionTitle}>{t('find_jobs')}</Text>
                            <Text style={styles.actionSubtitle}>{t('search_jobs_placeholder')}</Text>
                        </View>
                        <Ionicons name="arrow-forward" size={20} color={COLORS.white} style={{ opacity: 0.8 }} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.actionSecondary]}
                        onPress={() => router.push('/(worker)/my-work')}
                    >
                        <View style={[styles.actionIconBg, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <Ionicons name="clipboard-outline" size={24} color={COLORS.white} />
                        </View>
                        <View style={styles.actionTextContainer}>
                            <Text style={styles.actionTitle}>{t('my_work')}</Text>
                            <Text style={styles.actionSubtitle}>Track Status</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Recommended Jobs */}
                {dashboardData?.recommendedJobs && dashboardData.recommendedJobs.length > 0 && (
                    <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>{t('recommended_jobs')}</Text>
                            <TouchableOpacity onPress={() => router.push('/(worker)/jobs')}>
                                <Text style={styles.viewAllText}>{t('view_all')}</Text>
                            </TouchableOpacity>
                        </View>

                        {dashboardData.recommendedJobs.slice(0, 3).map((job) => (
                            <JobCard
                                key={job._id}
                                job={job}
                                onPress={() => router.push(`/job-details/${job._id}`)}
                            />
                        ))}
                    </Animated.View>
                )}

                {/* Recent Applications */}
                {dashboardData?.recentApplications && dashboardData.recentApplications.length > 0 && (
                    <Animated.View entering={FadeInDown.delay(300).duration(500)} style={{ marginBottom: 20 }}>
                        <Text style={styles.sectionTitle}>{t('recent_applications')}</Text>
                        {dashboardData.recentApplications.slice(0, 3).map((job) => (
                            <TouchableOpacity
                                key={job._id}
                                onPress={() => router.push(`/job-details/${job.job?._id || job._id}`)}
                            >
                                <Card style={styles.applicationCard}>
                                    <View style={styles.applicationHeader}>
                                        <View>
                                            <Text style={styles.applicationTitle} numberOfLines={1}>{job.title}</Text>
                                            <Text style={styles.applicationCompany}>{job.employer?.companyName || 'Company'}</Text>
                                        </View>
                                        <View style={[styles.statusBadge,
                                        job.status === 'open' && styles.statusOpen,
                                        job.status === 'hired' && styles.statusHired,
                                        job.status === 'rejected' && styles.statusRejected,
                                        ]}>
                                            <Text style={styles.statusText}>{job.applicationStatus || job.status}</Text>
                                        </View>
                                    </View>
                                </Card>
                            </TouchableOpacity>
                        ))}
                    </Animated.View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    contentContainer: {
        paddingBottom: 20,
    },
    headerBackground: {
        backgroundColor: COLORS.primary,
        paddingTop: 50,
        paddingBottom: 80, // Space for overlap
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        marginBottom: -50, // Negative margin for overlap
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    welcomeSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 2,
    },
    userName: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.white,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    statsGrid: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 16,
        marginHorizontal: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        justifyContent: 'space-between',
        position: 'absolute',
        bottom: -40,
        left: 0,
        right: 0,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    statLabel: {
        fontSize: 10,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 2,
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 16,
        marginHorizontal: 20,
        marginTop: 24,
    },
    actionsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        backgroundColor: COLORS.primary,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 100,
    },
    actionSecondary: {
        backgroundColor: COLORS.secondary,
    },
    actionIconBg: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    actionTextContainer: {
        flex: 1,
    },
    actionTitle: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    actionSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 11,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 20,
        marginTop: 24,
        marginBottom: 12,
    },
    viewAllText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
    },
    applicationCard: {
        marginBottom: 12,
        marginHorizontal: 20,
        padding: 16,
        borderRadius: 16,
    },
    applicationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    applicationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        maxWidth: 180,
    },
    applicationCompany: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: COLORS.textSecondary,
    },
    statusOpen: {
        backgroundColor: COLORS.warning,
    },
    statusHired: {
        backgroundColor: COLORS.success,
    },
    statusRejected: {
        backgroundColor: COLORS.danger,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.white,
        textTransform: 'uppercase',
    },
});
