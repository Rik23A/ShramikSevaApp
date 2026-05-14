import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/config';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const NotificationBell = ({ iconSize = 24, iconColor = COLORS.text }) => {
    const router = useRouter();
    const { user } = useAuth();
    const { unreadCount, connected } = useSocket();
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const prevCount = useRef(unreadCount);

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

    // Pulse when unread count increases
    useEffect(() => {
        if (unreadCount > prevCount.current) {
            pulseNotification();
        }
        prevCount.current = unreadCount;
    }, [unreadCount]);

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
        minWidth: 24,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 2,
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    badgeText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: '600',
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
