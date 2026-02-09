import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';

export default function SelectRoleScreen() {
    const handleSelectRole = (role) => {
        router.push({
            pathname: '/auth/register',
            params: { role }
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Who are you?</Text>
                <Text style={styles.subtitle}>Select your account type to continue</Text>

                <TouchableOpacity
                    style={styles.roleCard}
                    onPress={() => handleSelectRole('worker')}
                    activeOpacity={0.8}
                >
                    <View style={[styles.iconContainer, styles.workerIcon]}>
                        <Ionicons name="construct" size={40} color={COLORS.white} />
                    </View>
                    <View style={styles.roleInfo}>
                        <Text style={styles.roleTitle}>I'm a Worker</Text>
                        <Text style={styles.roleDescription}>
                            Looking for jobs as Security Guard, Welder, Plumber, Electrician, etc.
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.roleCard}
                    onPress={() => handleSelectRole('employer')}
                    activeOpacity={0.8}
                >
                    <View style={[styles.iconContainer, styles.employerIcon]}>
                        <Ionicons name="business" size={40} color={COLORS.white} />
                    </View>
                    <View style={styles.roleInfo}>
                        <Text style={styles.roleTitle}>I'm an Employer</Text>
                        <Text style={styles.roleDescription}>
                            Looking to hire skilled workers for my business or projects
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>

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
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 40,
    },
    roleCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    iconContainer: {
        width: 70,
        height: 70,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    workerIcon: {
        backgroundColor: COLORS.primary,
    },
    employerIcon: {
        backgroundColor: COLORS.secondary,
    },
    roleInfo: {
        flex: 1,
        marginLeft: 16,
    },
    roleTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    roleDescription: {
        fontSize: 13,
        color: COLORS.textSecondary,
        lineHeight: 18,
    },
    loginLink: {
        marginTop: 40,
        alignItems: 'center',
    },
    loginText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    loginTextBold: {
        color: COLORS.primary,
        fontWeight: '600',
    },
});
