import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Dimensions,
    Platform,
    TextInput,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    FadeInDown,
    FadeInUp,
    SlideInRight,
    interpolate,
    Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/config';
import {
    getAssignedJobs,
    getHiringRequests,
    acceptHiringRequest,
    rejectHiringRequest,
    getCompletedJobs,
} from '../../services/jobService';
import { getWorkerApplications } from '../../services/applicationService';
import { getWorkerWorkLogs } from '../../services/worklogService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';
import StartWorkModal from '../../components/worklog/StartWorkModal';
import EndWorkModal from '../../components/worklog/EndWorkModal';
import ApplicationStatusModal from '../../components/ApplicationStatusModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = SCREEN_WIDTH / 4;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// Animated Tab Bar Component
const AnimatedTabBar = ({ activeTab, tabs, onTabPress, counts }) => {
    const indicatorPosition = useSharedValue(0);

    useEffect(() => {
        const index = tabs.findIndex(t => t.key === activeTab);
        const tabWidth = SCREEN_WIDTH / tabs.length;
        indicatorPosition.value = withSpring(index * tabWidth, {
            damping: 15,
            stiffness: 120,
        });
    }, [activeTab, tabs]);

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: indicatorPosition.value }],
    }));

    return (
        <View style={styles.tabBarContainer}>
            <View style={styles.tabBar}>
                {tabs.map((tab, index) => {
                    const isActive = activeTab === tab.key;
                    const count = counts[tab.key] || 0;

                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={styles.tabItem}
                            onPress={() => {
                                Haptics.selectionAsync();
                                onTabPress(tab.key);
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.tabIconContainer}>
                                <Ionicons
                                    name={isActive ? tab.activeIcon : tab.icon}
                                    size={22}
                                    color={isActive ? COLORS.primary : COLORS.textSecondary}
                                />
                                {count > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>
                                            {count > 99 ? '99+' : count}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <Text style={[
                                styles.tabLabel,
                                isActive && styles.tabLabelActive
                            ]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}

                {/* Animated Indicator */}
                <Animated.View style={[styles.indicator, indicatorStyle]} />
            </View>
        </View>
    );
};

// Job Card Component with animations
const JobCard = ({ job, index, type, workLogs, onStartWork, onEndWork, onViewDetails }) => {
    const { t } = useLanguage();
    const scaleValue = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scaleValue.value }],
    }));

    const handlePressIn = () => {
        scaleValue.value = withTiming(0.98, { duration: 100 });
    };

    const handlePressOut = () => {
        scaleValue.value = withSpring(1);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'in-progress':
                return COLORS.primary;
            case 'completed':
                return COLORS.success;
            case 'pending':
                return COLORS.warning;
            default:
                return COLORS.textSecondary;
        }
    };

    const getStatusBgColor = (status) => {
        switch (status) {
            case 'in-progress':
                return COLORS.infoLight;
            case 'completed':
                return COLORS.successLight;
            case 'pending':
                return COLORS.warningLight;
            default:
                return COLORS.backgroundDark;
        }
    };

    // Get the actual work log status for this job
    const getWorkLogStatus = () => {
        // workLogs prop should be passed from parent
        if (!workLogs || workLogs.length === 0) return 'pending';

        // Find today's work log for this job
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayWorkLog = workLogs.find(log => {
            const logDate = new Date(log.workDate);
            logDate.setHours(0, 0, 0, 0);
            const logJobId = log.job?._id || log.job;
            return logJobId === job._id && logDate.getTime() === today.getTime();
        });

        if (todayWorkLog) {
            return todayWorkLog.status; // 'assigned', 'in-progress', or 'completed'
        }

        // If no work log for today, check if any work log exists for this job
        const anyWorkLog = workLogs.find(log => log.job === job._id);
        return anyWorkLog ? anyWorkLog.status : 'pending';
    };

    const workerStatus = getWorkLogStatus();

    return (
        <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
            <Animated.View style={animatedStyle}>
                <TouchableOpacity
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    onPress={onViewDetails}
                    activeOpacity={0.9}
                >
                    <View style={styles.jobCard}>
                        {/* Header */}
                        <View style={styles.cardHeader}>
                            <View style={styles.companyInfo}>
                                <View style={styles.companyAvatar}>
                                    <Ionicons name="business" size={20} color={COLORS.primary} />
                                </View>
                                <View style={styles.companyDetails}>
                                    <Text style={styles.companyName} numberOfLines={1}>
                                        {job.employer?.companyName || job.employer?.name || t('company')}
                                    </Text>
                                    <Text style={styles.postedDate}>
                                        {job.workType === 'permanent' ? t('full_time') : (job.durationDays || 0) + ' ' + t('days')}
                                    </Text>
                                </View>
                            </View>
                            <View style={[
                                styles.statusBadge,
                                { backgroundColor: getStatusBgColor(workerStatus) }
                            ]}>
                                <View style={[
                                    styles.statusDot,
                                    { backgroundColor: getStatusColor(workerStatus) }
                                ]} />
                                <Text style={[
                                    styles.statusText,
                                    { color: getStatusColor(workerStatus) }
                                ]}>
                                    {workerStatus === 'in-progress' ? t('active') : t(workerStatus) || workerStatus}
                                </Text>
                            </View>
                        </View>

                        {/* Job Title */}
                        <Text style={styles.jobTitle}>{job.title}</Text>

                        {/* Job Details */}
                        <View style={styles.jobMeta}>
                            <View style={styles.metaItem}>
                                <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                                <Text style={styles.metaText} numberOfLines={1}>
                                    {job.address || job.location?.address || t('location')}
                                </Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Ionicons name="cash-outline" size={16} color={COLORS.success} />
                                <Text style={[styles.metaText, styles.salaryText]}>
                                    ₹{job.salary}/day
                                </Text>
                            </View>
                        </View>

                        {/* Skills */}
                        {job.skills && job.skills.length > 0 && (
                            <View style={styles.skillsRow}>
                                {job.skills.slice(0, 3).map((skill, i) => (
                                    <View key={i} style={styles.skillChip}>
                                        <Text style={styles.skillText}>{skill}</Text>
                                    </View>
                                ))}
                                {job.skills.length > 3 && (
                                    <View style={styles.skillChip}>
                                        <Text style={styles.skillText}>+{job.skills.length - 3}</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Action Buttons */}
                        {type === 'assigned' && (
                            <View style={styles.actionRow}>
                                {workerStatus === 'in-progress' ? (
                                    <TouchableOpacity
                                        style={[styles.primaryButton, { backgroundColor: COLORS.danger }]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            onEndWork && onEndWork(job);
                                        }}
                                    >
                                        <Ionicons name="stop-circle" size={18} color={COLORS.white} />
                                        <Text style={styles.primaryButtonText}>{t('end_work')}</Text>
                                    </TouchableOpacity>
                                ) : workerStatus === 'completed' ? (
                                    <View style={[styles.primaryButton, { backgroundColor: COLORS.success, opacity: 0.7 }]}>
                                        <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
                                        <Text style={styles.primaryButtonText}>{t('completed')}</Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.primaryButton}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            onStartWork && onStartWork(job);
                                        }}
                                    >
                                        <Ionicons name="play-circle" size={18} color={COLORS.white} />
                                        <Text style={styles.primaryButtonText}>{t('start_work')}</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={styles.secondaryButton}
                                    onPress={onViewDetails}
                                >
                                    <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Animated.View>
        </Animated.View>
    );
};

// Request Card Component
const RequestCard = ({ request, index, onAccept, onReject, loading, onViewDetails }) => {
    const { t } = useLanguage();
    return (
        <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
            <TouchableOpacity onPress={onViewDetails} activeOpacity={0.9}>
                <View style={styles.requestCard}>
                    {/* Header */}
                    <View style={styles.cardHeader}>
                        <View style={styles.companyInfo}>
                            <View style={[styles.companyAvatar, { backgroundColor: COLORS.warningLight }]}>
                                <Ionicons name="mail" size={20} color={COLORS.warning} />
                            </View>
                            <View style={styles.companyDetails}>
                                <Text style={styles.companyName} numberOfLines={1}>
                                    {request.job?.employer?.companyName || request.job?.employer?.name || t('employer')}
                                </Text>
                                <Text style={styles.postedDate}>{t('new_job_offer')}</Text>
                            </View>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: COLORS.warningLight }]}>
                            <Ionicons name="time" size={14} color={COLORS.warning} />
                            <Text style={[styles.statusText, { color: COLORS.warning, marginLeft: 4 }]}>
                                {t('pending')}
                            </Text>
                        </View>
                    </View>

                    {/* Job Title */}
                    <Text style={styles.jobTitle}>{request.job?.title || t('job_offer')}</Text>

                    {/* Job Details */}
                    <View style={styles.jobMeta}>
                        <View style={styles.metaItem}>
                            <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                            <Text style={styles.metaText} numberOfLines={1}>
                                {request.job?.location?.address || t('location')}
                            </Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Ionicons name="cash-outline" size={16} color={COLORS.success} />
                            <Text style={[styles.metaText, styles.salaryText]}>
                                ₹{request.job?.salary}/day
                            </Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.requestActions}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.acceptButton]}
                            onPress={() => {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                onAccept(request._id);
                            }}
                            disabled={loading}
                        >
                            <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                            <Text style={styles.actionButtonText}>{t('accept')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={() => {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                onReject(request._id);
                            }}
                            disabled={loading}
                        >
                            <Ionicons name="close-circle" size={20} color={COLORS.danger} />
                            <Text style={[styles.actionButtonText, styles.rejectButtonText]}>{t('decline')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

// Application Card Component
const ApplicationCard = ({ application, index, onViewDetails }) => {
    const { t } = useLanguage();
    const getStatusConfig = (status) => {
        switch (status) {
            case 'pending':
                return { color: COLORS.warning, bg: COLORS.warningLight, icon: 'time' };
            case 'accepted':
            case 'hired':
            case 'offerAccepted':
                return { color: COLORS.success, bg: COLORS.successLight, icon: 'checkmark-circle' };
            case 'rejected':
            case 'offerRejected':
                return { color: COLORS.danger, bg: COLORS.dangerLight, icon: 'close-circle' };
            case 'offered':
                return { color: COLORS.info, bg: COLORS.infoLight, icon: 'gift' };
            default:
                return { color: COLORS.textSecondary, bg: COLORS.backgroundDark, icon: 'ellipsis-horizontal' };
        }
    };

    const statusConfig = getStatusConfig(application.status);

    return (
        <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
            <TouchableOpacity onPress={onViewDetails} activeOpacity={0.8}>
                <View style={styles.applicationCard}>
                    <View style={styles.appCardHeader}>
                        <View style={styles.appInfo}>
                            <Text style={styles.appJobTitle} numberOfLines={1}>
                                {application.job?.title || t('job_position')}
                            </Text>
                            <Text style={styles.appCompany} numberOfLines={1}>
                                {application.job?.employer?.companyName || application.job?.employer?.name || t('company')}
                            </Text>
                        </View>
                        <View style={[styles.appStatusBadge, { backgroundColor: statusConfig.bg }]}>
                            <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
                            <Text style={[styles.appStatusText, { color: statusConfig.color }]}>
                                {t(application.status) || application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.appMeta}>
                        <View style={styles.appMetaItem}>
                            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
                            <Text style={styles.appMetaText}>
                                {t('date_applied')}: {new Date(application.appliedDate || application.createdAt).toLocaleDateString()}
                            </Text>
                        </View>
                        {application.job?.salary && (
                            <View style={styles.appMetaItem}>
                                <Ionicons name="cash-outline" size={14} color={COLORS.success} />
                                <Text style={[styles.appMetaText, { color: COLORS.success }]}>
                                    ₹{application.job.salary}/day
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

// Daily History Card Component
const DailyHistoryCard = ({ log, index }) => {
    const { t } = useLanguage();
    const job = log.job;
    const isCompleted = log.status === 'completed';

    return (
        <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
            <View style={styles.historyCard}>
                <View style={styles.historyHeader}>
                    <View style={styles.historyInfo}>
                        <Text style={styles.historyTitle} numberOfLines={1}>
                            {job?.title || t('job_position')}
                        </Text>
                        <Text style={styles.historyCompany} numberOfLines={1}>
                            {job?.employer?.companyName || job?.employer?.name || t('company')}
                        </Text>
                        <Text style={styles.historyDate}>
                            {new Date(log.workDate).toLocaleDateString(undefined, {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            })}
                        </Text>
                    </View>
                    <View style={[styles.completedBadge, { backgroundColor: isCompleted ? COLORS.successLight : COLORS.warningLight }]}>
                        <Ionicons
                            name={isCompleted ? "checkmark-done-circle" : "time-outline"}
                            size={16}
                            color={isCompleted ? COLORS.success : COLORS.warning}
                        />
                        <Text style={[styles.completedText, { color: isCompleted ? COLORS.success : COLORS.warning }]}>
                            {isCompleted ? t('completed') : t(log.status)}
                        </Text>
                    </View>
                </View>

                {/* Timings */}
                <View style={styles.timeRow}>
                    <View style={styles.timeItem}>
                        <Ionicons name="play-circle-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.timeText}>
                            {log.startTime ? new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={14} color={COLORS.textLight} />
                    <View style={styles.timeItem}>
                        <Ionicons name="stop-circle-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.timeText}>
                            {log.endTime ? new Date(log.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </Text>
                    </View>
                </View>

                {/* Earnings if completed */}
                {isCompleted && job?.salary && (
                    <View style={styles.dailyEarnings}>
                        <Text style={styles.dailyEarningsLabel}>{t('daily_earnings')}:</Text>
                        <Text style={styles.dailyEarningsValue}>₹{job.salary}</Text>
                    </View>
                )}
            </View>
        </Animated.View>
    );
};

// Empty State Component
const EmptyState = ({ icon, title, subtitle }) => {
    const { t } = useLanguage();
    return (
        <Animated.View
            entering={FadeInUp.delay(200).springify()}
            style={styles.emptyState}
        >
            <View style={styles.emptyIconContainer}>
                <Ionicons name={icon} size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>{title}</Text>
            <Text style={styles.emptySubtitle}>{subtitle}</Text>
        </Animated.View>
    );
};

export default function MyWorkScreen() {
    const { tab } = useLocalSearchParams();
    const [activeTab, setActiveTab] = useState(tab || 'assigned');
    const { t } = useLanguage();

    // Search state for History tab
    const [searchQuery, setSearchQuery] = useState('');

    const TABS = useMemo(() => [
        { key: 'assigned', label: t('tab_assigned'), icon: 'briefcase', activeIcon: 'briefcase' },
        { key: 'requests', label: t('tab_requests'), icon: 'mail-outline', activeIcon: 'mail' },
        { key: 'applications', label: t('tab_applied'), icon: 'document-text-outline', activeIcon: 'document-text' },
        { key: 'history', label: t('tab_history'), icon: 'time-outline', activeIcon: 'time' },
    ], [t]);

    useEffect(() => {
        if (tab && ['assigned', 'requests', 'applications', 'history'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [tab]);
    const [assignedJobs, setAssignedJobs] = useState([]);
    const [hiringRequests, setHiringRequests] = useState([]);
    const [applications, setApplications] = useState([]);
    const [completedJobs, setCompletedJobs] = useState([]);
    const [workLogs, setWorkLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // ... existing modal states ...
    const [startWorkModalVisible, setStartWorkModalVisible] = useState(false);
    const [endWorkModalVisible, setEndWorkModalVisible] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [showStatusModal, setShowStatusModal] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [assigned, requests, apps, completed, logs] = await Promise.all([
                getAssignedJobs().catch(() => []),
                getHiringRequests().catch(() => []),
                getWorkerApplications().catch(() => []),
                getCompletedJobs().catch(() => []),
                getWorkerWorkLogs().catch(() => []),
            ]);
            setAssignedJobs(assigned || []);
            setHiringRequests(requests || []);
            setApplications(apps || []);
            setCompletedJobs(completed || []);
            setWorkLogs(logs || []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ... existing handlers (handleAccept, handleReject, handleRefresh) ...
    const handleAccept = async (applicationId) => {
        setActionLoading(true);
        try {
            await acceptHiringRequest(applicationId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            fetchData();
        } catch (error) {
            console.error('Failed to accept:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async (applicationId) => {
        setActionLoading(true);
        try {
            await rejectHiringRequest(applicationId);
            fetchData();
        } catch (error) {
            console.error('Failed to reject:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        Haptics.selectionAsync();
        fetchData();
    }, [fetchData]);


    if (loading) {
        return <LoadingSpinner fullScreen message={t('loading')} />;
    }

    const tabCounts = {
        assigned: assignedJobs.length,
        requests: hiringRequests.length,
        applications: applications.length,
        history: 0, // Count calculated dynamically based on logs
    };

    // Filter work logs for history tab
    const getFilteredHistory = () => {
        // Filter for completed logs only as requested
        // Sort by date descending
        let filtered = workLogs
            .filter(log => log.status === 'completed')
            .sort((a, b) => new Date(b.workDate) - new Date(a.workDate));

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(log =>
                log.job?.title?.toLowerCase().includes(query) ||
                log.job?.employer?.companyName?.toLowerCase().includes(query) ||
                log.job?.employer?.name?.toLowerCase().includes(query)
            );
        }
        return filtered;
    };

    const filteredHistory = getFilteredHistory();
    tabCounts.history = filteredHistory.length;

    const renderContent = () => {
        switch (activeTab) {
            case 'assigned':
                return assignedJobs.length > 0 ? (
                    assignedJobs.map((job, index) => (
                        <JobCard
                            key={job._id}
                            job={job}
                            index={index}
                            type="assigned"
                            workLogs={workLogs}
                            onStartWork={(job) => {
                                setSelectedJobId(job._id);
                                setStartWorkModalVisible(true);
                            }}
                            onEndWork={(job) => {
                                setSelectedJobId(job._id);
                                setEndWorkModalVisible(true);
                            }}
                            onViewDetails={() => router.push('/job-details/' + job._id)}
                        />
                    ))
                ) : (
                    <EmptyState
                        icon="briefcase-outline"
                        title={t('no_assigned_jobs')}
                        subtitle={t('no_assigned_sub')}
                    />
                );

            case 'requests':
                return hiringRequests.length > 0 ? (
                    hiringRequests.map((request, index) => (
                        <RequestCard
                            key={request._id}
                            request={request}
                            index={index}
                            onAccept={handleAccept}
                            onReject={handleReject}
                            loading={actionLoading}
                            onViewDetails={() => request.job?._id && router.push('/job-details/' + request.job._id)}
                        />
                    ))
                ) : (
                    <EmptyState
                        icon="mail-outline"
                        title={t('no_offers')}
                        subtitle={t('no_offers_sub')}
                    />
                );

            case 'applications':
                return applications.length > 0 ? (
                    applications.map((app, index) => (
                        <ApplicationCard
                            key={app._id}
                            application={app}
                            index={index}
                            onViewDetails={() => {
                                setSelectedApplication(app);
                                setShowStatusModal(true);
                            }}
                        />
                    ))
                ) : (
                    <EmptyState
                        icon="document-text-outline"
                        title={t('no_applications')}
                        subtitle={t('no_applications_sub')}
                    />
                );

            case 'history':
                return (
                    <>
                        {/* Search Bar for History */}
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder={t('search_history')}
                                placeholderTextColor={COLORS.textLight}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {filteredHistory.length > 0 ? (
                            filteredHistory.map((log, index) => (
                                <DailyHistoryCard
                                    key={log._id}
                                    log={log}
                                    index={index}
                                />
                            ))
                        ) : (
                            <EmptyState
                                icon="time-outline"
                                title={t('no_history')}
                                subtitle={t('no_history_sub')}
                            />
                        )}
                    </>
                );

            default:
                return null;
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            { /*     <View style={styles.header}>
                <Text style={styles.headerTitle}>My Work</Text>
                <View style={styles.headerStats}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{assignedJobs.length}</Text>
                        <Text style={styles.statLabel}>Active</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{hiringRequests.length}</Text>
                        <Text style={styles.statLabel}>Offers</Text>
                    </View>
                </View>
            </View>
*/}
            {/* Animated Tab Bar */}
            <AnimatedTabBar
                activeTab={activeTab}
                tabs={TABS}
                onTabPress={setActiveTab}
                counts={tabCounts}
            />

            {/* Content */}
            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[COLORS.primary]}
                        tintColor={COLORS.primary}
                    />
                }
            >
                {renderContent()}
            </ScrollView>

            {/* Work Log Modals */}
            <StartWorkModal
                visible={startWorkModalVisible}
                onClose={() => {
                    setStartWorkModalVisible(false);
                    setSelectedJobId(null);
                }}
                jobId={selectedJobId}
                onSuccess={() => {
                    fetchData(); // Refresh data after successful start
                }}
            />

            <EndWorkModal
                visible={endWorkModalVisible}
                onClose={() => {
                    setEndWorkModalVisible(false);
                    setSelectedJobId(null);
                }}
                jobId={selectedJobId}
                onSuccess={() => {
                    fetchData(); // Refresh data after successful end
                }}
            />

            <ApplicationStatusModal
                isOpen={showStatusModal}
                onClose={() => {
                    setShowStatusModal(false);
                    setSelectedApplication(null);
                }}
                application={selectedApplication}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    // Header Styles
    header: {
        backgroundColor: COLORS.primary,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.white,
    },
    headerStats: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.white,
    },
    statLabel: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginHorizontal: 16,
    },

    // Tab Bar Styles
    tabBarContainer: {
        backgroundColor: COLORS.card,
        paddingTop: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    tabBar: {
        flexDirection: 'row',
        position: 'relative',
        width: '100%',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
    },
    tabIconContainer: {
        position: 'relative',
        marginBottom: 4,
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: COLORS.textSecondary,
    },
    tabLabelActive: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: -10,
        backgroundColor: COLORS.danger,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.white,
    },
    indicator: {
        position: 'absolute',
        bottom: 0,
        width: '25%',
        height: 3,
        backgroundColor: COLORS.primary,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
    },

    // Content
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 100,
    },

    // Job Card Styles
    jobCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    companyInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    companyAvatar: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.infoLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    companyDetails: {
        flex: 1,
    },
    companyName: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    postedDate: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    jobTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 12,
    },
    jobMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 12,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginLeft: 6,
    },
    salaryText: {
        fontWeight: '600',
        color: COLORS.success,
    },
    skillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    skillChip: {
        backgroundColor: COLORS.backgroundDark,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    skillText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 10,
    },
    primaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    primaryButtonText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '600',
    },
    secondaryButton: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.infoLight,
        borderRadius: 12,
    },

    // Request Card Styles
    requestCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.warning,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    requestActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 16,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    acceptButton: {
        backgroundColor: COLORS.success,
    },
    rejectButton: {
        backgroundColor: COLORS.dangerLight,
        borderWidth: 1,
        borderColor: COLORS.danger,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.white,
    },
    rejectButtonText: {
        color: COLORS.danger,
    },

    // Application Card Styles
    applicationCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    appCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    appInfo: {
        flex: 1,
        marginRight: 12,
    },
    appJobTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    appCompany: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    appStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 4,
    },
    appStatusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    appMeta: {
        flexDirection: 'row',
        gap: 16,
    },
    appMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    appMetaText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },

    // History Card Styles
    historyCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    historyInfo: {
        flex: 1,
        marginRight: 12,
    },
    historyTitle: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    historyCompany: {
        fontSize: 14,
        fontFamily: 'Outfit-Medium',
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    historyDate: {
        fontSize: 12,
        fontFamily: 'Outfit-Regular',
        color: COLORS.textLight,
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.successLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    completedText: {
        fontSize: 12,
        fontFamily: 'Outfit-Bold',
        color: COLORS.success,
        marginLeft: 4,
        textTransform: 'capitalize',
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        padding: 10,
        borderRadius: 12,
        marginBottom: 12,
    },
    timeItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    timeText: {
        fontSize: 13,
        fontFamily: 'Outfit-Medium',
        color: COLORS.textPrimary,
    },
    dailyEarnings: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    dailyEarningsLabel: {
        fontSize: 14,
        fontFamily: 'Outfit-Medium',
        color: COLORS.textSecondary,
    },
    dailyEarningsValue: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: COLORS.success,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Outfit-Regular',
        color: COLORS.textPrimary,
        paddingVertical: 4,
    },

    // Empty State Styles
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.infoLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
});
