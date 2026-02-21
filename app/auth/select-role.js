import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';

const { width } = Dimensions.get('window');

export default function SelectRoleScreen() {
    // Animation constants
    const cardScale1 = useRef(new Animated.Value(0.9)).current;
    const cardScale2 = useRef(new Animated.Value(0.9)).current;
    const cardOpacity1 = useRef(new Animated.Value(0)).current;
    const cardOpacity2 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.stagger(200, [
            Animated.parallel([
                Animated.spring(cardScale1, {
                    toValue: 1,
                    friction: 6,
                    useNativeDriver: true,
                }),
                Animated.timing(cardOpacity1, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]),
            Animated.parallel([
                Animated.spring(cardScale2, {
                    toValue: 1,
                    friction: 6,
                    useNativeDriver: true,
                }),
                Animated.timing(cardOpacity2, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, []);

    const handleSelectRole = (role) => {
        router.push({
            pathname: '/auth/register',
            params: { role }
        });
    };

    const RoleCard = ({ role, title, description, icon, color, style, onPress, scale, opacity }) => (
        <Animated.View style={[{ transform: [{ scale }], opacity }, style]}>
            <TouchableOpacity
                style={styles.cardTouchable}
                onPress={onPress}
                activeOpacity={0.9}
            >
                <View style={[styles.iconContainer, { backgroundColor: color }]}>
                    <Ionicons name={icon} size={32} color={COLORS.white} />
                </View>
                <View style={styles.roleInfo}>
                    <Text style={styles.roleTitle}>{title}</Text>
                    <Text style={styles.roleDescription}>{description}</Text>
                </View>
                <View style={styles.arrowContainer}>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.headerContainer}>
                    <Text style={styles.title}>Who are you?</Text>
                    <Text style={styles.subtitle}>Select your account type to continue</Text>
                </View>

                <RoleCard
                    scale={cardScale1}
                    opacity={cardOpacity1}
                    role="worker"
                    title="I'm a Worker"
                    description="Looking for jobs as Security Guard, Welder, Plumber, etc."
                    icon="construct"
                    color={COLORS.primary}
                    onPress={() => handleSelectRole('worker')}
                    style={styles.cardContainer}
                />

                <RoleCard
                    scale={cardScale2}
                    opacity={cardOpacity2}
                    role="employer"
                    title="I'm an Employer"
                    description="Looking to hire skilled workers for my business or projects"
                    icon="business"
                    color={COLORS.secondary}
                    onPress={() => handleSelectRole('employer')}
                    style={styles.cardContainer}
                />

                <TouchableOpacity
                    style={styles.loginLink}
                    onPress={() => router.push('/auth/login')}
                >
                    <Text style={styles.loginText}>
                        Already have an account? <Text style={styles.loginTextBold}>Login</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    headerContainer: {
        marginBottom: 40,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        maxWidth: 260,
        lineHeight: 22,
    },
    cardContainer: {
        marginBottom: 20,
    },
    cardTouchable: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    roleInfo: {
        flex: 1,
        marginLeft: 16,
        marginRight: 8,
    },
    roleTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    roleDescription: {
        fontSize: 13,
        color: COLORS.textSecondary,
        lineHeight: 18,
    },
    arrowContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginLink: {
        marginTop: 40,
        alignItems: 'center',
    },
    loginText: {
        fontSize: 15,
        color: COLORS.textSecondary,
    },
    loginTextBold: {
        color: COLORS.primary,
        fontWeight: '700',
    },
});
