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

export default function NotificationsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { socket, connected } = useSocket();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const scrollY = new Animated.Value(0);
    const headerHeight = 120;

    const headerBackgroundColor = scrollY.interpolate({
        inputRange: [0, headerHeight],
        outputRange: [COLORS.primary, COLORS.primary],
        extrapolate: 'clamp',
    });

    const fetchNotifications = async () => {
        try {
            const data = await getNotifications({ page: 1, limit: 50 });
            setNotifications(data.notifications || []);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            Alert.alert('Error', 'Failed to load notifications. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

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
        if (notifications.filter(n => !n.isRead).length === 0) {
            Alert.alert('Info', 'All notifications are already read.');
            return;
        }

        Alert.alert(
            'Mark All as Read',
            'Are you sure you want to mark all notifications as read?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Mark All',
                    style: 'default',
                    onPress: async () => {
                        try {
                            await markAllAsRead();
                            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                        } catch (error) {
                            console.error('Failed to mark all as read:', error);
                            Alert.alert('Error', 'Failed to mark all as read. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleDelete = async (notificationId) => {
        Alert.alert(
            'Delete Notification',
            'Are you sure you want to delete this notification?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteNotification(notificationId);
                            setNotifications(prev => prev.filter(n => n._id !== notificationId));
                        } catch (error) {
                            console.error('Failed to delete notification:', error);
                            Alert.alert('Error', 'Failed to delete notification. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleClearAll = async () => {
        const readNotifications = notifications.filter(n => n.isRead);
        if (readNotifications.length === 0) {
            Alert.alert('Info', 'No read notifications to clear.');
            return;
        }

        Alert.alert(
            'Clear All Read',
            `Are you sure you want to clear all ${readNotifications.length} read notifications?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await clearAllReadNotifications();
                            setNotifications(prev => prev.filter(n => !n.isRead));
                        } catch (error) {
                            console.error('Failed to clear notifications:', error);
                            Alert.alert('Error', 'Failed to clear notifications. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const mapWebUrlToMobileRoute = (url) => {
        if (!url) return null;

        // Employer: Hired jobs detail mapping
        // From: /dashboard/employer/hired-jobs/[id]
        // To: /hired-job-details/[id]
        const hiredJobsMatch = url.match(/\/dashboard\/employer\/hired-jobs\/([a-f\d]+)/i);
        if (hiredJobsMatch) {
            return `/hired-job-details/${hiredJobsMatch[1]}`;
        }

        // Add other mappings as needed...

        return url;
    };

    const handleNotificationPress = async (item) => {
        if (!item.isRead) {
            await handleMarkAsRead(item._id);
        }

        // Navigation logic
        if (item.type === 'message' || item.type === 'new_message') {
            if (item.relatedId) router.push(`/chat/${item.relatedId}`);
            else if (item.actionUrl) router.push(item.actionUrl);
        } else if (item.type === 'job_application') {
            if (item.relatedId) router.push(`/job/${item.relatedId}/applicants`);
        } else if (item.type === 'job_hired' || item.type === 'job_rejected') {
            if (item.relatedId) router.push(`/job-details/${item.relatedId}`);
        } else if (item.actionUrl) {
            const mobileRoute = mapWebUrlToMobileRoute(item.actionUrl);
            if (mobileRoute) {
                // Pass workerId if available in metadata
                const params = {};
                if (item.metadata && item.metadata.workerId) {
                    params.workerId = item.metadata.workerId;
                }

                router.push({
                    pathname: mobileRoute,
                    params
                });
            }
        }
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

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const filteredNotifications = activeTab === 'all'
        ? notifications
        : notifications.filter(n => !n.isRead);

    if (loading) {
        return <LoadingSpinner fullScreen message="Loading notifications..." />;
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
            <Stack.Screen
                options={{
                    title: 'Notifications',
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
                            {unreadCount > 0 && (
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
                            All
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
                                Unread
                            </Text>
                            {unreadCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{unreadCount}</Text>
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
                            onRefresh={() => {
                                setRefreshing(true);
                                fetchNotifications();
                            }}
                            tintColor={COLORS.primary}
                            colors={[COLORS.primary]}
                        />
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
                                {activeTab === 'all' ? 'No Notifications Yet' : 'No Unread Notifications'}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {activeTab === 'all'
                                    ? "You're all caught up! Check back later for updates."
                                    : "All notifications are read. Great job staying on top of things!"}
                            </Text>
                            {notifications.length === 0 && (
                                <TouchableOpacity
                                    style={styles.refreshButton}
                                    onPress={() => {
                                        setRefreshing(true);
                                        fetchNotifications();
                                    }}
                                >
                                    <Ionicons name="refresh" size={18} color={COLORS.primary} />
                                    <Text style={styles.refreshText}>Refresh</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                    ListHeaderComponent={
                        filteredNotifications.length > 0 && (
                            <View style={styles.listHeader}>
                                <Text style={styles.listHeaderText}>
                                    {activeTab === 'all'
                                        ? `All Notifications (${notifications.length})`
                                        : `Unread Notifications (${unreadCount})`
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
});