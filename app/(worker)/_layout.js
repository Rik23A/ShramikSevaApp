import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/config';
import { useLanguage } from '../../context/LanguageContext';
import NotificationBell from '../../components/NotificationBell';
import LocationTracker from '../../components/worklog/LocationTracker';
import HeaderProfile from '../../components/HeaderProfile';

export default function WorkerLayout() {
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();

    return (
        <>
            <LocationTracker />
            <Tabs
                screenOptions={{
                    tabBarActiveTintColor: COLORS.primary,
                    tabBarInactiveTintColor: COLORS.textSecondary,
                    tabBarStyle: {
                        backgroundColor: COLORS.card,
                        borderTopColor: COLORS.border,
                        paddingBottom: Math.max(insets.bottom, 5),
                        paddingTop: 5,
                        height: 60 + Math.max(insets.bottom - 5, 0),
                    },
                    headerStyle: {
                        backgroundColor: COLORS.primary,
                    },
                    headerTintColor: COLORS.white,
                    headerTitleStyle: {
                        fontWeight: '600',
                    },
                    headerRight: () => <HeaderProfile />,
                }}
            >
                <Tabs.Screen
                    name="dashboard"
                    options={{
                        title: t('nav_home'),
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="home" size={size} color={color} />
                        ),
                        headerTitle: 'Shramik Seva',
                    }}
                />
                <Tabs.Screen
                    name="jobs"
                    options={{
                        title: t('nav_jobs'),
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="briefcase" size={size} color={color} />
                        ),
                        headerTitle: t('find_jobs'),
                    }}
                />
                <Tabs.Screen
                    name="my-work"
                    options={{
                        title: t('nav_my_work'),
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="clipboard" size={size} color={color} />
                        ),
                        headerTitle: t('my_work'),
                    }}
                />
                <Tabs.Screen
                    name="messages"
                    options={{
                        title: t('nav_messages'),
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="chatbubbles" size={size} color={color} />
                        ),
                        headerTitle: t('nav_messages'),
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: t('nav_profile'),
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="person" size={size} color={color} />
                        ),
                        headerTitle: t('my_profile'),
                    }}
                />
            </Tabs>
        </>
    );
}
