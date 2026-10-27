import React, { useEffect, useRef } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import { SocketProvider } from '../context/SocketContext';
import { ToastProvider } from '../context/ToastContext';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import { UpdateProvider } from '../context/UpdateContext';
import { NetworkProvider } from '../context/NetworkContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import AnnouncementBanner from '../components/ui/AnnouncementBanner';
import OfflineBanner from '../components/ui/OfflineBanner';
import { COLORS } from '../constants/config';

import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { setupNotificationChannels } from '../services/pushNotificationService';

function RootLayoutNav() {
    const { isAuthenticated, isLoading, user } = useAuth();
    const hasNavigated = useRef(false);

    useEffect(() => {
        // Initialize Android notification channels immediately
        setupNotificationChannels();

        // Safely pre-cache icon fonts so offline screens don't trigger dynamic asset downloads
        Font.loadAsync(Ionicons.font).catch((err) => {
            if (__DEV__) {
                console.log('[Fonts] Preload notice:', err?.message || err);
            }
        });
    }, []);

    useEffect(() => {
        if (!isLoading) {
            if (isAuthenticated && user && !hasNavigated.current) {
                hasNavigated.current = true;
                
                // Navigate based on user role
                if (user.role === 'worker') {
                    router.replace('/(worker)/dashboard');
                } else if (user.role === 'employer') {
                    router.replace('/(employer)/dashboard');
                }
            } else if (!isAuthenticated) {
                hasNavigated.current = false;
            }
        }
    }, [isAuthenticated, isLoading, user]);

    // Convert web URLs (e.g. /messages?conversationId=123) to native app routes (/chat/123)
    const resolveAppRoute = (actionUrl, data = {}) => {
        if (!actionUrl && !data.relatedId) return null;
        if (actionUrl) {
            const convMatch = actionUrl.match(/[?&]conversationId=([^&]+)/);
            if (convMatch) {
                return `/chat/${convMatch[1]}`;
            }
        }
        if (data.type === 'new_message' && data.relatedId) {
            return `/chat/${data.relatedId}`;
        }
        return actionUrl || '/notifications';
    };

    useEffect(() => {
        // 1. Handle notification tap when app was KILLED (Cold Start)
        Notifications.getLastNotificationResponseAsync().then(response => {
            const data = response?.notification?.request?.content?.data || {};
            const targetRoute = resolveAppRoute(data.actionUrl, data);
            if (targetRoute) {
                console.log('🚀 [RootLayoutNav] Cold-start navigating to:', targetRoute);
                setTimeout(() => {
                    router.push(targetRoute);
                }, 400);
            }
        }).catch(err => console.warn('Could not get initial notification response:', err.message));

        // 2. Handle notification tap when app is in BACKGROUND / FOREGROUND
        const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response?.notification?.request?.content?.data || {};
            const targetRoute = resolveAppRoute(data.actionUrl, data);
            if (targetRoute) {
                console.log('🔔 [RootLayoutNav] Background tap navigating to:', targetRoute);
                router.push(targetRoute);
            }
        });

        // 3. Handle notification received in FOREGROUND
        const notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
            console.log('🔔 Foreground notification received:', notification.request.content.title);
        });

        return () => {
            responseSubscription.remove();
            notificationSubscription.remove();
        };
    }, []);

    if (isLoading) {
        return <LoadingSpinner fullScreen message="Loading..." />;
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
            <StatusBar backgroundColor="#1976D2" style="light" />
            <AnnouncementBanner />
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
                <Stack.Screen
                    name="hired-job-details/[id]"
                    options={{
                        headerShown: true,
                        headerStyle: { backgroundColor: COLORS.secondary },
                        headerTintColor: '#FFFFFF',
                        headerTitle: 'Work Details',
                    }}
                />
            </Stack>
        </View>
    );
}

export default function RootLayout() {
    return (
        <NetworkProvider>
            <AuthProvider>
                <LanguageProvider>
                    <SafeAreaProvider>
                        <ToastProvider>
                            <SubscriptionProvider>
                                <SocketProvider>
                                    <UpdateProvider>
                                        <RootLayoutNav />
                                        <OfflineBanner />
                                    </UpdateProvider>
                                </SocketProvider>
                            </SubscriptionProvider>
                        </ToastProvider>
                    </SafeAreaProvider>
                </LanguageProvider>
            </AuthProvider>
        </NetworkProvider>
    );
}


