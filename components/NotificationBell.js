import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getUnreadCount } from '../services/notificationService';
import { COLORS } from '../constants/config';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const NotificationBell = ({ iconSize = 24, iconColor = COLORS.text }) => {
    const router = useRouter();
    const { user } = useAuth();
    const { socket, connected } = useSocket();
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const pulseAnim = useState(new Animated.Value(1))[0];

    // Fetch unread notification count
    const fetchUnreadCount = async () => {
        if (!user) {
            setUnreadCount(0);
            return;
        }

        try {
            setLoading(true);
            const data = await getUnreadCount();
            setUnreadCount(data.count || 0);
        } catch (error) {
            if (error.code !== 'ERR_NETWORK' && error.message !== 'Network Error') {
                console.error('Error fetching unread count:', error.message);
            }
            setUnreadCount(0);
        } finally {
            setLoading(false);
        }
    };

    // Pulse animation for new notification
    const pulseNotification = () => {
        Animated.sequence([
            Animated.timing(pulseAnim, {
                toValue: 1.3,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
    };

    // Initial fetch
    useEffect(() => {
        if (!user) return;
        fetchUnreadCount();
    }, [user]);

    // Listen for real-time notification events
    useEffect(() => {
        if (!socket || !connected) return;

        const handleNewNotification = (notification) => {
            console.log('📬 New notification received:', notification);
            setUnreadCount(prev => prev + 1);
            pulseNotification();

            // Optional: Show a toast or vibration
            // Vibration.vibrate(100);
        };

        const handleNotificationRead = () => {
            setUnreadCount(prev => Math.max(0, prev - 1));
        };

        const handleAllNotificationsRead = () => {
            setUnreadCount(0);
        };

        socket.on('notification:new', handleNewNotification);
        socket.on('notification:read', handleNotificationRead);
        socket.on('notification:allRead', handleAllNotificationsRead);

        return () => {
            socket.off('notification:new', handleNewNotification);
            socket.off('notification:read', handleNotificationRead);
            socket.off('notification:allRead', handleAllNotificationsRead);
        };
    }, [socket, connected]);

    const handlePress = () => {
        router.push('/notifications');
    };

    if (!user) return null;

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Ionicons name="notifications-outline" size={iconSize} color={iconColor} />
                {unreadCount > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </Text>
                    </View>
                )}
                {connected && (
                    <View style={styles.connectedIndicator} />
                )}
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        padding: 8,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: COLORS.danger,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    badgeText: {
        color: COLORS.white,
        fontSize: 11,
        fontWeight: '700',
    },
    connectedIndicator: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.success,
        borderWidth: 1.5,
        borderColor: COLORS.white,
    },
});

export default NotificationBell;
