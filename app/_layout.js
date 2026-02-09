import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';

function RootLayoutNav() {
    const { isAuthenticated, isLoading, user } = useAuth();

    useEffect(() => {
        if (!isLoading && isAuthenticated && user) {
            // Navigate based on user role
            if (user.role === 'worker') {
                router.replace('/(worker)/dashboard');
            } else if (user.role === 'employer') {
                router.replace('/(employer)/dashboard');
            }
        }
    }, [isAuthenticated, isLoading, user]);

    if (isLoading) {
        return <LoadingSpinner fullScreen message="Loading..." />;
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="language-selection" options={{ headerShown: false }} />
                <Stack.Screen name="auth" />
                <Stack.Screen name="(worker)" />
                <Stack.Screen name="(employer)" />
                <Stack.Screen
                    name="worker/[id]"
                    options={{
                        headerShown: true,
                        headerStyle: { backgroundColor: '#1976D2' },
                        headerTintColor: '#FFFFFF',
                        headerTitle: 'Worker Profile',
                    }}
                />
                <Stack.Screen
                    name="job-details/[id]"
                    options={{
                        headerShown: true,
                        headerStyle: { backgroundColor: '#1976D2' },
                        headerTintColor: '#FFFFFF',
                        headerTitle: 'Job Details',
                    }}
                />
                <Stack.Screen
                    name="job/[id]/applicants"
                    options={{
                        headerShown: true,
                        headerStyle: { backgroundColor: '#1976D2' },
                        headerTintColor: '#FFFFFF',
                        headerTitle: 'Applicants',
                    }}
                />
            </Stack>
        </View>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <LanguageProvider>
                <RootLayoutNav />
            </LanguageProvider>
        </AuthProvider>
    );
}

