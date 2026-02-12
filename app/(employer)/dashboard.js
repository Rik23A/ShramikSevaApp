import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { getEmployerDashboard, getEmployerAnalytics } from '../../services/userService';
import { getHiredJobs } from '../../services/jobService';
import { getWorkLogsByJob } from '../../services/worklogService';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function EmployerDashboard() {
    const { user } = useAuth();
    const { socket, connected } = useSocket();
    const [dashboardData, setDashboardData] = useState(null);
    const [analyticsData, setAnalyticsData] = useState(null);
    const [hiredJobs, setHiredJobs] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchDashboard = async () => {
        try {
            const [dashboard, analytics, hired] = await Promise.all([
                getEmployerDashboard(),
                getEmployerAnalytics(),
                getHiredJobs()
            ]);

            setDashboardData(dashboard);
            setAnalyticsData(analytics);
            setHiredJobs(hired);

            // Fetch recent activity (work logs) for hired jobs
            if (hired && hired.length > 0) {
                const activityPromises = hired.map(async (job) => {
                    try {
                        const logsResponse = await getWorkLogsByJob(job._id);
                        const logs = Array.isArray(logsResponse) ? logsResponse : (logsResponse.workLogs || logsResponse.data || []);
                        return { jobId: job._id, jobTitle: job.title, logs: logs };
                    } catch (e) {
                        return { jobId: job._id, logs: [] };
                    }
                });

                const activities = await Promise.all(activityPromises);

                // Process to find active workers (startOtp or endOtp today/recent)
                const processedActivity = [];
                activities.forEach(item => {
                    if (item.logs && Array.isArray(item.logs)) {
                        const today = new Date().toDateString();
                        // Filter for logs with OTPs or verified status for TODAY only
                        const activeLogs = item.logs.filter(l => {
                            const isToday = new Date(l.workDate || l.createdAt).toDateString() === today;
                            return isToday && (l.startOtp || l.endOtp || l.startOtpVerified || l.endOtpVerified);
                        });
                        activeLogs.forEach(log => {
                            processedActivity.push({
                                jobId: item.jobId,
                                jobTitle: item.jobTitle,
                                workerName: log.worker?.name,
                                workerMobile: log.worker?.mobile,
                                startOtp: log.startOtp,
                                endOtp: log.endOtp,
                                startOtpVerified: log.startOtpVerified,
                                endOtpVerified: log.endOtpVerified,
                                date: log.createdAt
                            });
                        });
                    }
                });

                // Sort by date desc
                processedActivity.sort((a, b) => new Date(b.date) - new Date(a.date));
                setRecentActivity(processedActivity.slice(0, 5));
            }
        } catch (error) {
            console.error('Failed to fetch dashboard:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchDashboard();
        }, [])
    );

    // Add socket listener for real-time OTP updates
    useEffect(() => {
        if (socket && connected) {
            console.log('🔌 Dashboard: Setting up workLogUpdated listener');
            socket.on('workLogUpdated', (data) => {
                console.log('⚡ Dashboard: Received workLogUpdated event:', data);
                fetchDashboard();
            });

            return () => {
                console.log('🔌 Dashboard: Cleaning up workLogUpdated listener');
                socket.off('workLogUpdated');
            };
        }
    }, [socket, connected]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchDashboard();
    }, []);

    if (loading) {
        return <LoadingSpinner fullScreen message="Loading dashboard..." />;
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.secondary]} />
            }
        >
            {/* Welcome Section - Extended Blue Header */}
            <View style={styles.headerBackground}>
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.welcomeSection}>
                    <Text style={styles.welcomeText}>Welcome back,</Text>
                    <Text style={styles.userName}>{user?.companyName || user?.name || 'Employer'}! 👋</Text>
                </Animated.View>
            </View>

            {/* Quick Stats - Overlapping */}
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.statsContainer}>
                <TouchableOpacity style={styles.statWrapper} onPress={() => router.push('/(employer)/my-jobs')}>
                    <Card style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: '#E3F2FD' }]}>
                            <Ionicons name="briefcase" size={22} color={COLORS.secondary} />
                        </View>
                        <Text style={styles.statNumber}>{dashboardData?.activeJobs || 0}</Text>
                        <Text style={styles.statLabel}>Active</Text>
                    </Card>
                </TouchableOpacity>

                <TouchableOpacity style={styles.statWrapper} onPress={() => router.push('/(employer)/my-jobs')}>
                    <Card style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: '#FFF3E0' }]}>
                            <Ionicons name="people" size={22} color={COLORS.primary} />
                        </View>
                        <Text style={styles.statNumber}>{dashboardData?.applicants || 0}</Text>
                        <Text style={styles.statLabel}>Applicants</Text>
                    </Card>
                </TouchableOpacity>

                <TouchableOpacity style={styles.statWrapper} onPress={() => router.push('/(employer)/my-jobs')}>
                    <Card style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: '#E8F5E9' }]}>
                            <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
                        </View>
                        <Text style={styles.statNumber}>{dashboardData?.hires || 0}</Text>
                        <Text style={styles.statLabel}>Hired</Text>
                    </Card>
                </TouchableOpacity>
            </Animated.View>

            {/* Expanded Stats Grid */}
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Overview</Text>
                <View style={styles.statsGrid}>
                    <Card style={styles.miniStatCard}>
                        <Text style={styles.miniStatLabel}>Open Apps</Text>
                        <Text style={styles.miniStatValue}>{dashboardData?.openApplications || 0}</Text>
                    </Card>
                    <Card style={styles.miniStatCard}>
                        <Text style={styles.miniStatLabel}>Closed Apps</Text>
                        <Text style={styles.miniStatValue}>{analyticsData?.closedApplications || 0}</Text>
                    </Card>
                    <Card style={styles.miniStatCard}>
                        <Text style={styles.miniStatLabel}>Hire Reqs</Text>
                        <Text style={styles.miniStatValue}>{analyticsData?.hireRequests || 0}</Text>
                    </Card>
                    <Card style={styles.miniStatCard}>
                        <Text style={styles.miniStatLabel}>Total Spent</Text>
                        <Text style={[styles.miniStatValue, { color: COLORS.primary }]}>₹{analyticsData?.totalSpent || 0}</Text>
                    </Card>
                </View>
            </View>

            {/* Recent Activity (OTPs) */}
            {recentActivity.length > 0 ? (
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Recent Activity (OTPs)</Text>
                    {recentActivity.map((activity, index) => (
                        <Card key={index} style={styles.activityCard}>
                            <View style={styles.activityHeader}>
                                <Text style={styles.activityJobTitle}>{activity.jobTitle}</Text>
                                <Text style={styles.activityDate}>{new Date(activity.date).toLocaleDateString()}</Text>
                            </View>
                            <Text style={styles.activityWorkerName}>{activity.workerName} ({activity.workerMobile})</Text>

                            <View style={styles.otpContainer}>
                                {(activity.startOtp || activity.startOtpVerified) && (
                                    <View style={[styles.otpBadge, { backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' }]}>
                                        <Text style={[styles.otpLabel, { color: '#2E7D32' }]}>Start OTP:</Text>
                                        <Text style={[styles.otpValue, { color: '#2E7D32' }]}>
                                            {activity.startOtp || 'Verified ✓'}
                                        </Text>
                                    </View>
                                )}
                                {(activity.endOtp || activity.endOtpVerified) && (
                                    <View style={[styles.otpBadge, { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' }]}>
                                        <Text style={[styles.otpLabel, { color: '#C62828' }]}>End OTP:</Text>
                                        <Text style={[styles.otpValue, { color: '#C62828' }]}>
                                            {activity.endOtp || 'Verified ✓'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </Card>
                    ))}
                </View>
            ) : (
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Recent Activity (OTPs)</Text>
                    <Card style={[styles.activityCard, { alignItems: 'center', paddingVertical: 30, borderLeftWidth: 0 }]}>
                        <Ionicons name="notifications-outline" size={32} color={COLORS.textSecondary} style={{ opacity: 0.5 }} />
                        <Text style={[styles.activityDate, { marginTop: 8 }]}>No recent work activity found.</Text>
                    </Card>
                </View>
            )}

            {/* Quick Actions */}
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.actionsGrid}>
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/(employer)/post-job')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
                            <Ionicons name="add-circle" size={28} color={COLORS.secondary} />
                        </View>
                        <Text style={styles.actionText}>Post Job</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/(employer)/my-jobs')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
                            <Ionicons name="list" size={28} color={COLORS.primary} />
                        </View>
                        <Text style={styles.actionText}>View Jobs</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/(employer)/workers')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
                            <Ionicons name="search" size={28} color={COLORS.success} />
                        </View>
                        <Text style={styles.actionText}>Find Workers</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/(employer)/hired-jobs')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
                            <Ionicons name="checkmark-done-circle" size={28} color="#9C27B0" />
                        </View>
                        <Text style={styles.actionText}>Hired Workers</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push('/(employer)/profile')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#E0F2F1' }]}>
                            <Ionicons name="settings" size={28} color="#009688" />
                        </View>
                        <Text style={styles.actionText}>Settings</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Recent Applicants */}
            {dashboardData?.recentApplicants && dashboardData.recentApplicants.length > 0 && (
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Applicants</Text>
                        <TouchableOpacity onPress={() => router.push('/(employer)/my-jobs')}>
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {dashboardData.recentApplicants.slice(0, 3).map((job) => (
                        <Card key={job._id} style={styles.applicantCard}>
                            <View style={styles.jobHeader}>
                                <Text style={styles.jobTitle}>{job.title}</Text>
                                <View style={styles.applicantBadge}>
                                    <Text style={styles.applicantCount}>
                                        {job.applicants?.length || 0} applicants
                                    </Text>
                                </View>
                            </View>
                            {job.applicants && job.applicants.slice(0, 2).map((applicant, index) => (
                                <View key={index} style={styles.applicantRow}>
                                    <View style={styles.applicantAvatar}>
                                        <Ionicons name="person" size={16} color={COLORS.textSecondary} />
                                    </View>
                                    <Text style={styles.applicantName}>{applicant.name}</Text>
                                </View>
                            ))}
                        </Card>
                    ))}
                </View>
            )}
            <View style={{ height: 20 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    contentContainer: {
        padding: 0,
        paddingBottom: 20,
    },
    headerBackground: {
        backgroundColor: COLORS.secondary,
        paddingBottom: 60, // Space for overlap
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    welcomeSection: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    welcomeText: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
    },
    userName: {
        fontSize: 26,
        fontWeight: 'bold',
        color: COLORS.white,
        marginTop: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginTop: -50, // Overlap
        marginBottom: 24,
    },
    statWrapper: {
        flex: 1,
        marginHorizontal: 4,
    },
    statCard: {
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderRadius: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        backgroundColor: COLORS.white,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    sectionContainer: {
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    actionCard: {
        width: '48%', // Sligthly wider
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    actionIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 14,
    },
    viewAllText: {
        fontSize: 14,
        color: COLORS.secondary,
        fontWeight: '600',
    },
    applicantCard: {
        marginBottom: 12,
        borderRadius: 12,
        padding: 14,
        borderColor: COLORS.border,
        borderWidth: 1,
        elevation: 0,
    },
    jobHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    jobTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        flex: 1,
    },
    applicantBadge: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    applicantCount: {
        fontSize: 12,
        color: COLORS.secondary,
        fontWeight: '600',
    },
    applicantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    applicantAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0'
    },
    applicantName: {
        fontSize: 14,
        color: COLORS.text,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
    },
    miniStatCard: {
        width: '48%',
        padding: 12,
        marginBottom: 10,
        backgroundColor: COLORS.card,
        elevation: 2,
    },
    miniStatLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    miniStatValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    activityCard: {
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
    },
    activityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    activityJobTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    activityDate: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    activityWorkerName: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 12,
    },
    otpContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    otpBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        gap: 6,
    },
    otpLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    otpValue: {
        fontSize: 14,
        fontWeight: 'bold',
    },
});
