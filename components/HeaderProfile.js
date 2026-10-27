import React from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/config';
import { useAuth } from '../context/AuthContext';
import { getFullImageUrl } from '../utils/imageUtil';
import { calculateProfileCompletion } from '../utils/profileCompletion';
import NotificationBell from './NotificationBell';

export default function HeaderProfile() {
    const { user } = useAuth();
    const isWorker = user?.role === 'worker';

    // Calculate dynamic completion status
    const { percentage, isComplete, color: statusColor } = calculateProfileCompletion(user);

    // Navigate to respective profile based on role
    const handleProfilePress = () => {
        if (isWorker) {
            router.push('/(worker)/profile');
        } else {
            router.push('/(employer)/profile');
        }
    };

    const imageUrl = getFullImageUrl(user?.profilePicture);

    return (
        <View style={styles.container}>
            <NotificationBell iconColor={COLORS.white} />
            <TouchableOpacity 
                onPress={handleProfilePress} 
                style={styles.profileContainer}
                activeOpacity={0.8}
            >
                <View style={[styles.avatarRing, { borderColor: statusColor }]}>
                    {user?.profilePicture ? (
                        <Image
                            source={{ uri: imageUrl }}
                            style={styles.avatar}
                            onError={(e) => console.log('Header Avatar Load Error:', e.nativeEvent.error)}
                        />
                    ) : (
                        <View style={styles.placeholder}>
                            <Ionicons name="person" size={18} color={COLORS.primary} />
                        </View>
                    )}
                </View>

                {/* Percentage Badge */}
                {!isComplete && percentage < 100 ? (
                    <View style={[styles.percentBadge, { backgroundColor: statusColor }]}>
                        <Text style={styles.percentText}>{percentage}%</Text>
                    </View>
                ) : (
                    <View style={styles.completeBadge}>
                        <Ionicons name="checkmark" size={7} color={COLORS.white} />
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
        gap: 12,
    },
    profileContainer: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarRing: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
    placeholder: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    percentBadge: {
        position: 'absolute',
        bottom: -4,
        right: -6,
        paddingHorizontal: 3,
        paddingVertical: 1,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 2,
    },
    percentText: {
        color: COLORS.white,
        fontSize: 7.5,
        fontWeight: '900',
        lineHeight: 9,
    },
    completeBadge: {
        position: 'absolute',
        bottom: -2,
        right: -3,
        width: 13,
        height: 13,
        borderRadius: 6.5,
        backgroundColor: '#10B981',
        borderWidth: 1.5,
        borderColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
