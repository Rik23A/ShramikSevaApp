import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const TOAST_TYPES = {
    success: { icon: 'checkmark-circle', color: '#10B981', bg: '#ECFDF5', borderColor: '#A7F3D0' },
    error: { icon: 'alert-circle', color: '#EF4444', bg: '#FEF2F2', borderColor: '#FECACA' },
    warning: { icon: 'warning', color: '#F59E0B', bg: '#FFFBEB', borderColor: '#FDE68A' },
    info: { icon: 'information-circle', color: '#3B82F6', bg: '#EFF6FF', borderColor: '#BFDBFE' },
};

export default function Toast({ id, type = 'info', title, message, action, onClose, duration = 4000 }) {
    const router = useRouter();
    const style = TOAST_TYPES[type] || TOAST_TYPES.info;

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, duration);
        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    const handlePress = () => {
        if (action?.onPress) {
            action.onPress();
        } else if (action?.url) {
            router.push(action.url);
        }
        onClose(id);
    };

    return (
        <Animated.View
            entering={FadeInUp.springify().damping(15)}
            exiting={FadeOutUp}
            layout={LinearTransition}
            style={[styles.container, { backgroundColor: style.bg, borderColor: style.borderColor }]}
        >
            <View style={styles.content}>
                <Ionicons name={style.icon} size={24} color={style.color} style={styles.icon} />
                <View style={styles.textContainer}>
                    {title && <Text style={[styles.title, { color: style.color }]}>{title}</Text>}
                    <Text style={[styles.message, { color: COLORS.text }]}>{message}</Text>
                </View>
                {action && (
                    <TouchableOpacity onPress={handlePress} style={styles.actionButton}>
                        <Text style={[styles.actionText, { color: style.color }]}>{action.label || 'View'}</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => onClose(id)} style={styles.closeButton}>
                    <Ionicons name="close" size={18} color={COLORS.textLight} />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: width - 32,
        marginHorizontal: 16,
        marginVertical: 4,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    message: {
        fontSize: 13,
        lineHeight: 18,
    },
    actionButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginLeft: 8,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '600',
    },
    closeButton: {
        padding: 4,
        marginLeft: 4,
    },
});
