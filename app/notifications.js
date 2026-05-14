import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
    StatusBar,
    Animated,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/config';
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllReadNotifications,
} from '../services/notificationService';
import { timeAgo } from '../utils/dateUtils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';

export default function NotificationsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { t } = useLanguage();
    const { socket, connected, unreadCount: globalUnreadCount } = useSocket();
    const [notifications, setNotifications] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const scrollY = new Animated.Value(0);
    const headerHeight = 120;

    const headerBackgroundColor = scrollY.interpolate({
        inputRange: [0, headerHeight],
        outputRange: [COLORS.primary, COLORS.primary],
        extrapolate: 'clamp',
    });

    const fetchNotifications = async (isInitial = false, isRefresh = false) => {
        if (!hasMore && !isInitial && !isRefresh) return;
        
        try {
            if (isInitial || isRefresh) {
                setLoading(true);
                setPage(1);
            } else {
                setLoadingMore(true);
            }

            const currentPage = (isInitial || isRefresh) ? 1 : page;
            const params = { page: currentPage, limit: 15 };
            if (activeTab === 'unread') {
                params.isRead = false;
            }
            const data = await getNotifications(params);
            
            const newNotifications = data.notifications || [];
            
            if (isInitial || isRefresh) {
                setNotifications(newNotifications);
            } else {
                setNotifications(prev => [...prev, ...newNotifications]);
            }

            setHasMore(newNotifications.length === 15);
            setTotalCount(data.totalCount || 0);
            setPage(prev => (isInitial || isRefresh) ? 2 : prev + 1);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            if (isInitial || isRefresh) {
                Alert.alert(t('error_title'), t('failed_to_load_notifications'));
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchNotifications(true);
    }, [activeTab]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchNotifications(false, true);
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore && !loading && !refreshing) {
            fetchNotifications();
        }
    };

    // Real-time notification listener
    useEffect(() => {
        if (!socket || !connected) return;

        const handleNewNotification = (notification) => {
            console.log('🔔 New notification received:', notification);
            setNotifications(prev => [notification, ...prev]);
        };

        socket.on('notification:new', handleNewNotification);

        return () => {
            socket.off('notification:new', handleNewNotification);
        };
    }, [socket, connected]);

    const handleMarkAsRead = async (notificationId) => {
        try {
            await markAsRead(notificationId);
            setNotifications(prev =>
                prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
            );
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (globalUnreadCount === 0) {
            Alert.alert(t('info'), t('all_notifications_read'));
            return;
        }

        Alert.alert(
            t('mark_all_read'),
            t('mark_all_read_confirm'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('mark_all'),
                    style: 'default',
                    onPress: async () => {
                        try {
                            await markAllAsRead();
                            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                        } catch (error) {
                            console.error('Failed to mark all as read:', error);
                            Alert.alert(t('error_title'), t('failed_to_mark_all_read'));
                        }
                    },
                },
            ]
        );
    };

    const handleDelete = async (notificationId) => {
        Alert.alert(
            t('delete_notification'),
            t('delete_notification_confirm'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteNotification(notificationId);
                            setNotifications(prev => prev.filter(n => n._id !== notificationId));
                        } catch (error) {
                            console.error('Failed to delete notification:', error);
                            Alert.alert(t('error_title'), t('failed_to_delete_notification'));
                        }
                    },
                },
            ]
        );
    };

    const handleClearAll = async () => {
        const readNotifications = notifications.filter(n => n.isRead);
        if (readNotifications.length === 0 && (totalCount - globalUnreadCount) === 0) {
            Alert.alert(t('info'), t('no_read_notifications'));
            return;
        }

        Alert.alert(
            t('clear_all_read'),
            t('clear_all_read_confirm_count').replace('{count}', readNotifications.length),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('clear'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await clearAllReadNotifications();
                            setNotifications(prev => prev.filter(n => !n.isRead));
                        } catch (error) {
                            console.error('Failed to clear notifications:', error);
                            Alert.alert(t('error_title'), t('failed_to_clear_notifications'));
                        }
                    },
                },
            ]
        );
    };

    const mapWebUrlToMobileRoute = (url) => {
        if (!url) return null;

        // Employer: Hired jobs detail mapping
        const hiredJobsMatch = url.match(/\/dashboard\/employer\/hired-jobs\/([a-f\d]+)/i);
        if (hiredJobsMatch) return `/hired-job-details/${hiredJobsMatch[1]}`;

        // Employer: Job Applicants (both URL patterns the backend uses)
        const applicantsMatch = url.match(/\/(?:dashboard\/employer\/)?job\/([a-f\d]+)\/applicants/i);
        if (applicantsMatch) return `/job/${applicantsMatch[1]}/applicants`;

        // Employer: Applicants list (no job id)
        if (url.match(/\/dashboard\/employer\/applicants\/?$/i)) {
            return '/(employer)/my-jobs';
        }

        // Employer: My Jobs
        if (url.match(/\/dashboard\/employer\/jobs\/?$/i)) {
            return '/(employer)/my-jobs';
        }

        // Worker: Assigned Jobs with ID
        const assignedJobMatch = url.match(/\/dashboard\/worker\/assigned-jobs\/([a-f\d]+)/i);
        if (assignedJobMatch) return `/hired-job-details/${assignedJobMatch[1]}`;

        // Worker: Hiring Requests
        if (url.match(/\/dashboard\/worker\/hiring-requests\/?$/i)) {
            return '/(worker)/my-work';
        }

        // Worker: Job Details
        const jobMatch = url.match(/\/dashboard\/worker\/job\/([a-f\d]+)/i);
        if (jobMatch) return `/job-details/${jobMatch[1]}`;

        // Generic Job Details (e.g. /jobs/:id)
        const genericJobMatch = url.match(/\/jobs\/([a-f\d]+)/i);
        if (genericJobMatch) return `/job-details/${genericJobMatch[1]}`;

        // Messages with conversationId query param
        const conversationMatch = url.match(/\/messages\?conversationId=([a-f\d]+)/i);
        if (conversationMatch) return `/chat/${conversationMatch[1]}`;

        // Messages (generic)
        if (url.match(/\/messages/i)) {
            return user?.role === 'employer' ? '/(employer)/messages' : '/(worker)/messages';
        }

        // Profile
        const profileMatch = url.match(/\/profile\/([a-f\d]+)/i);
        if (profileMatch) return `/worker/${profileMatch[1]}`;

        // Subscriptions & Plans
        if (url.includes('/subscriptions') || url.includes('/subscription-plans')) {
            return '/(employer)/subscription-plans';
        }

        // Billing & Invoices
        if (url.includes('/billing') || url.includes('/invoices')) {
            return '/(employer)/billing';
        }

        // Dashboard
        if (url.match(/\/dashboard\/employer\/?$/i)) {
            return '/(employer)/dashboard';
        }
        if (url.match(/\/dashboard\/worker\/?$/i)) {
            return '/(worker)/dashboard';
        }

        console.warn('⚠️ Unhandled notification URL:', url);
        return null;
    };

    // Helper: extract the actual Job ID from a notification.
    // relatedId is NOT always a jobId — it may be Application._id or WorkLog._id.
    // The real jobId lives in metadata.jobId or can be parsed from actionUrl.
    const getJobIdFromNotification = (item) => {
        // 1. Check metadata first (most reliable)
        if (item.metadata?.jobId) return item.metadata.jobId;

        // 2. If relatedModel is 'Job', relatedId IS the jobId
        if (item.relatedModel === 'Job' && item.relatedId) return item.relatedId;

        // 3. Extract from actionUrl patterns
        if (item.actionUrl) {
            const hiredMatch = item.actionUrl.match(/\/hired-jobs\/([a-f\d]+)/i);
            if (hiredMatch) return hiredMatch[1];

            const assignedMatch = item.actionUrl.match(/\/assigned-jobs\/([a-f\d]+)/i);
            if (assignedMatch) return assignedMatch[1];

            const jobMatch = item.actionUrl.match(/\/jobs?\/([a-f\d]+)/i);
            if (jobMatch) return jobMatch[1];
        }

        return null;
    };

    const handleNotificationPress = async (item) => {
        if (!item.isRead) {
            await handleMarkAsRead(item._id);
        }

        const notificationType = item.type;
        const jobId = getJobIdFromNotification(item);

        // ─── Messages ───
        if (notificationType === 'new_message' || notificationType === 'new_conversation') {
            if (item.actionUrl) {
                const conversationMatch = item.actionUrl.match(/conversationId=([a-f\d]+)/i);
                if (conversationMatch) {
                    router.push(`/chat/${conversationMatch[1]}`);
                    return;
                }
            }
            if (item.relatedId) {
                router.push(`/chat/${item.relatedId}`);
                return;
            }
            router.push(user?.role === 'employer' ? '/(employer)/messages' : '/(worker)/messages');
            return;
        }

        // ─── Job Applications (Employer receives) ───
        // relatedId = Application._id (NOT jobId!) for new_application
        // relatedId = jobId for job_application
        if (notificationType === 'new_application' || notificationType === 'job_application') {
            if (notificationType === 'job_application' && item.relatedId) {
                // applicationController sets relatedId = jobId
                router.push(`/job/${item.relatedId}/applicants`);
                return;
            }
            // new_application: relatedId = application._id, need jobId from actionUrl
            if (jobId) {
                router.push(`/job/${jobId}/applicants`);
                return;
            }
            // Fallback: go to my-jobs where employer can see all applicants
            router.push('/(employer)/my-jobs');
            return;
        }

        // ─── Application Rejected/Approved (Worker receives) ───
        // relatedId = Application._id, actionUrl has /jobs/:jobId
        if (notificationType === 'application_rejected' || notificationType === 'application_approved') {
            if (jobId) {
                router.push(`/job-details/${jobId}`);
                return;
            }
            router.push('/(worker)/my-work');
            return;
        }

        // ─── Hiring Requests (Worker receives) ───
        // relatedId = Application._id
        if (notificationType === 'hire_request_received') {
            router.push('/(worker)/my-work');
            return;
        }

        // ─── Hire Request Accepted (Employer receives) ───
        // relatedId = Job._id ✓
        if (notificationType === 'hire_request_accepted') {
            if (item.relatedId) {
                router.push(`/hired-job-details/${item.relatedId}`);
                return;
            }
            router.push('/(employer)/hired-jobs');
            return;
        }

        // ─── Worker Hired (Worker receives) ───
        // relatedId = Job._id ✓
        if (notificationType === 'worker_hired') {
            if (item.relatedId) {
                router.push(`/hired-job-details/${item.relatedId}`);
                return;
            }
            router.push('/(worker)/my-work');
            return;
        }

        // ─── Hire Request Rejected (Employer receives) ───
        if (notificationType === 'hire_request_rejected') {
            router.push('/(employer)/my-jobs');
            return;
        }

        // ─── Work Progress (Employer receives) ───
        // relatedId = WorkLog._id (NOT jobId!), jobId is in metadata.jobId
        if (notificationType === 'work_started' || notificationType === 'work_ended' || notificationType === 'work_log_updated') {
            if (jobId) {
                router.push({ pathname: `/hired-job-details/${jobId}`, params: { workerId: item.metadata?.workerId } });
                return;
            }
            router.push('/(employer)/hired-jobs');
            return;
        }

        // ─── OTP Generated (Employer receives) ───
        // relatedId = WorkLog._id (NOT jobId!), jobId is in metadata.jobId
        if (notificationType === 'otp_generated') {
            if (jobId) {
                router.push({ pathname: `/hired-job-details/${jobId}`, params: { workerId: item.metadata?.workerId } });
                return;
            }
            router.push(user?.role === 'employer' ? '/(employer)/hired-jobs' : '/(worker)/my-work');
            return;
        }

        // ─── Ratings ───
        if (notificationType === 'rating_received' || notificationType === 'new_rating' || notificationType === 'rating_prompt') {
            if (user?.role === 'worker') {
                router.push('/(worker)/profile');
            } else {
                if (jobId) {
                    router.push({ pathname: `/hired-job-details/${jobId}`, params: { workerId: item.metadata?.workerId } });
                } else {
                    router.push('/(employer)/hired-jobs');
                }
            }
            return;
        }

        // ─── Job Management (Admin → Employer) ───
        if (notificationType === 'job_approved' || notificationType === 'job_rejected' || notificationType === 'job_posted' || notificationType === 'job_completed') {
            if (user?.role === 'employer') {
                router.push('/(employer)/my-jobs');
            } else if (jobId) {
                router.push(`/job-details/${jobId}`);
            }
            return;
        }

        // ─── Profile Approval ───
        if (notificationType === 'profile_approved' || notificationType === 'profile_rejected') {
            router.push(user?.role === 'employer' ? '/(employer)/profile' : '/(worker)/profile');
            return;
        }

        // ─── Availability Changed ───
        if (notificationType === 'availability_changed') {
            router.push('/(worker)/profile');
            return;
        }

        // ─── Documents ───
        if (notificationType === 'document_verified' || notificationType === 'document_rejected' || notificationType === 'document_expiring') {
            router.push(user?.role === 'employer' ? '/(employer)/profile' : '/(worker)/profile');
            return;
        }

        // ─── Subscriptions & Payments ───
        if (notificationType && (notificationType.startsWith('subscription_') || notificationType === 'subscription_created')) {
            router.push('/(employer)/subscription-plans');
            return;
        }
        if (notificationType && (notificationType.startsWith('payment_') || notificationType.includes('invoice'))) {
            router.push('/(employer)/billing');
            return;
        }

        // ─── Fallback: Use actionUrl mapping ───
        if (item.actionUrl) {
            const mobileRoute = mapWebUrlToMobileRoute(item.actionUrl);
            if (mobileRoute) {
                const params = {};
                if (item.metadata?.workerId) {
                    params.workerId = item.metadata.workerId;
                }
                router.push({ pathname: mobileRoute, params });
                return;
            }
        }

        // ─── Last resort: go to dashboard ───
        console.warn('⚠️ Unhandled notification type:', notificationType, 'URL:', item.actionUrl);
        router.push(user?.role === 'employer' ? '/(employer)/dashboard' : '/(worker)/dashboard');
    };

    const getNotificationColor = (type) => {
        if (!type) return COLORS.primary;
        if (type.includes('approved') || type.includes('hired') || type.includes('accepted') || type.includes('success'))
            return '#10B981';
        if (type.includes('rejected') || type.includes('declined') || type.includes('error'))
            return '#EF4444';
        if (type.includes('pending') || type.includes('prompt') || type.includes('warning'))
            return '#F59E0B';
        return COLORS.primary;
    };

    const getNotificationIcon = (type) => {
        if (!type) return 'notifications-outline';
        if (type.includes('application') || type.includes('hire') || type.includes('job'))
            return 'briefcase-outline';
        if (type.includes('rating') || type.includes('review'))
            return 'star-outline';
        if (type.includes('message') || type.includes('chat'))
            return 'chatbubble-ellipses-outline';
        if (type.includes('payment') || type.includes('money'))
            return 'cash-outline';
        if (type.includes('work') || type.includes('time'))
            return 'time-outline';
        if (type.includes('system') || type.includes('info'))
            return 'information-circle-outline';
        if (type.includes('alert') || type.includes('warning'))
            return 'warning-outline';
        return 'notifications-outline';
    };

    const renderNotification = ({ item, index }) => {
        const iconColor = getNotificationColor(item.type);
        const IconName = getNotificationIcon(item.type);

        return (
            <TouchableOpacity
                style={[
                    styles.notificationCard,
                    !item.isRead && styles.unreadCard,
                    { opacity: item.isRead ? 0.8 : 1 }
                ]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
            >
                <View style={styles.notificationContent}>
                    <View style={[styles.iconContainer, { backgroundColor: iconColor + '10' }]}>
                        <Ionicons
                            name={IconName}
                            size={22}
                            color={iconColor}
                        />
                    </View>

                    <View style={styles.textContainer}>
                        <View style={styles.headerRow}>
                            <Text style={[styles.title, !item.isRead && styles.unreadTitle]} numberOfLines={1}>
                                {item.title}
                            </Text>
                            {!item.isRead && (
                                <View style={styles.unreadDot} />
                            )}
                        </View>
                        <Text style={[styles.message, !item.isRead && styles.unreadMessage]} numberOfLines={2}>
                            {item.message}
                        </Text>
                        <View style={styles.footerRow}>
                            <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
                            {item.type && (
                                <Text style={[styles.typeLabel, { color: iconColor }]}>
                                    {item.type.replace(/_/g, ' ').toUpperCase()}
                                </Text>
                            )}
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={() => handleDelete(item._id)}
                        style={styles.deleteButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={18} color={COLORS.textLight} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    const loadedUnreadCount = notifications.filter(n => !n.isRead).length;
    const filteredNotifications = notifications;

    if (loading) {
        return <LoadingSpinner fullScreen message={t('loading_notifications')} />;
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
            <Stack.Screen
                options={{
                    title: t('nav_messages'),
                    headerStyle: {
                        backgroundColor: COLORS.primary,
                        elevation: 0,
                        shadowOpacity: 0,
                    },
                    headerTintColor: COLORS.white,
                    headerTitleStyle: {
                        fontWeight: '600',
                        fontSize: 18,
                    },
                    headerRight: () => (
                        <View style={styles.headerButtons}>
                            {globalUnreadCount > 0 && (
                                <TouchableOpacity
                                    onPress={handleMarkAllAsRead}
                                    style={styles.headerButton}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Ionicons name="checkmark-done" size={24} color={COLORS.white} />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={handleClearAll}
                                style={styles.headerButton}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="trash-outline" size={22} color={COLORS.white} />
                            </TouchableOpacity>
                        </View>
                    ),
                }}
            />

            <View style={styles.container}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'all' && styles.activeTab]}
                        onPress={() => setActiveTab('all')}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
                            {t('filter_all')}
                        </Text>
                        {activeTab === 'all' && <View style={styles.tabIndicator} />}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'unread' && styles.activeTab]}
                        onPress={() => setActiveTab('unread')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.tabBadgeContainer}>
                            <Text style={[styles.tabText, activeTab === 'unread' && styles.activeTabText]}>
                                {t('unread')}
                            </Text>
                            {globalUnreadCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{globalUnreadCount}</Text>
                                </View>
                            )}
                        </View>
                        {activeTab === 'unread' && <View style={styles.tabIndicator} />}
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={filteredNotifications}
                    keyExtractor={(item) => item._id}
                    renderItem={renderNotification}
                    contentContainerStyle={[
                        styles.listContent,
                        filteredNotifications.length === 0 && styles.emptyListContent
                    ]}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={COLORS.primary}
                            colors={[COLORS.primary]}
                        />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={
                        loadingMore ? (
                            <View style={styles.loadMoreContainer}>
                                <LoadingSpinner size="small" />
                            </View>
                        ) : null
                    }
                    showsVerticalScrollIndicator={false}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                        { useNativeDriver: false }
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons
                                    name="notifications-off-outline"
                                    size={70}
                                    color={COLORS.textSecondary}
                                />
                            </View>
                            <Text style={styles.emptyTitle}>
                                {activeTab === 'all' ? t('no_notifications_yet') : t('no_unread_notifications')}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {activeTab === 'all'
                                    ? t('all_caught_up')
                                    : t('all_notifications_read_msg')}
                            </Text>
                            {notifications.length === 0 && (
                                <TouchableOpacity
                                    style={styles.refreshButton}
                                    onPress={handleRefresh}
                                >
                                    <Ionicons name="refresh" size={18} color={COLORS.primary} />
                                    <Text style={styles.refreshText}>{t('refresh')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                    ListHeaderComponent={
                        filteredNotifications.length > 0 && (
                            <View style={styles.listHeader}>
                                <Text style={styles.listHeaderText}>
                                    {activeTab === 'all'
                                        ? `${t('filter_all')} (${totalCount})`
                                        : `${t('unread')} (${globalUnreadCount})`
                                    }
                                </Text>
                            </View>
                        )
                    }
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.primary,
    },
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 10 : 15,
        paddingBottom: 0,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 3,
        zIndex: 10,
    },
    tab: {
        marginRight: 32,
        paddingBottom: 14,
        position: 'relative',
    },
    activeTab: {
        // Active state handled by indicator
    },
    tabText: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.textSecondary,
        letterSpacing: 0.3,
    },
    activeTabText: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: COLORS.primary,
        borderRadius: 1.5,
    },
    tabBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    badge: {
        backgroundColor: '#EF4444',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 6,
        minWidth: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: '700',
    },
    listContent: {
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: 30,
    },
    emptyListContent: {
        flexGrow: 1,
    },
    listHeader: {
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    listHeaderText: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    headerButtons: {
        flexDirection: 'row',
        marginRight: 8,
        alignItems: 'center',
    },
    headerButton: {
        padding: 8,
        marginLeft: 12,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    notificationCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        marginBottom: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        transform: [{ scale: 1 }],
    },
    unreadCard: {
        backgroundColor: COLORS.white,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
    },
    notificationContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    textContainer: {
        flex: 1,
        marginRight: 12,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.text,
        flex: 1,
        marginRight: 8,
        letterSpacing: 0.2,
    },
    unreadTitle: {
        fontWeight: '700',
        color: COLORS.textDark,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
    },
    message: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
        marginBottom: 8,
        letterSpacing: 0.1,
    },
    unreadMessage: {
        color: COLORS.text,
        fontWeight: '400',
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    time: {
        fontSize: 12,
        color: COLORS.textLight,
        fontWeight: '400',
    },
    typeLabel: {
        fontSize: 10,
        fontWeight: '600',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.04)',
        overflow: 'hidden',
    },
    deleteButton: {
        padding: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingVertical: 80,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(0,0,0,0.03)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.textDark,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        backgroundColor: COLORS.primary + '10',
        borderWidth: 1,
        borderColor: COLORS.primary + '30',
    },
    refreshText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
        marginLeft: 6,
    },
    loadMoreContainer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
});