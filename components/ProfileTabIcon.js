import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { calculateProfileCompletion } from '../utils/profileCompletion';
import { COLORS } from '../constants/config';

export default function ProfileTabIcon({ color, size = 24 }) {
    const { user } = useAuth();
    const { percentage, isComplete, color: badgeColor } = calculateProfileCompletion(user);

    return (
        <View style={styles.container}>
            <Ionicons name="person" size={size} color={color} />
            
            {/* Completion Status Badge */}
            {!isComplete && percentage < 100 ? (
                <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                    <Text style={styles.badgeText}>{percentage}%</Text>
                </View>
            ) : (
                <View style={styles.completeCheckBadge}>
                    <Ionicons name="checkmark" size={8} color={COLORS.white} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 32,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -10,
        paddingHorizontal: 3.5,
        paddingVertical: 1,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 20,
    },
    badgeText: {
        color: COLORS.white,
        fontSize: 8,
        fontWeight: '900',
        lineHeight: 10,
    },
    completeCheckBadge: {
        position: 'absolute',
        top: -2,
        right: -4,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#10B981',
        borderWidth: 1.5,
        borderColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
