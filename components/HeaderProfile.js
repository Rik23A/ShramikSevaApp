import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/config';
import { useAuth } from '../context/AuthContext';
import { getFullImageUrl } from '../utils/imageUtil';
import NotificationBell from './NotificationBell';

export default function HeaderProfile() {
    const { user } = useAuth();
    const isWorker = user?.role === 'worker';

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
            <TouchableOpacity onPress={handleProfilePress} style={styles.profileContainer}>
                {user?.profilePicture ? (
                    <Image
                        source={{ uri: imageUrl }}
                        style={styles.avatar}
                        onError={(e) => console.log('Header Avatar Load Error:', e.nativeEvent.error)}
                    />
                ) : (
                    <View style={styles.placeholder}>
                        <Ionicons name="person" size={20} color={COLORS.primary} />
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
        marginRight: 15,
        gap: 15,
    },
    profileContainer: {
        // Optional tap area padding
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.8)',
    },
    placeholder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
