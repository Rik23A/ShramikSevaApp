import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Tabs, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/config';
import { useLanguage } from '../../context/LanguageContext';
import HeaderProfile from '../../components/HeaderProfile';
import ProfileTabIcon from '../../components/ProfileTabIcon';

export default function EmployerLayout() {
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();

    const HeaderRight = () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
            <TouchableOpacity
                onPress={() => router.push('/(employer)/post-job')}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 20,
                    marginRight: 8
                }}
            >
                <Ionicons name="add-circle" size={16} color={COLORS.white} />
                <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: 'bold', marginLeft: 4 }}>{t('post_job')}</Text>
            </TouchableOpacity>
            <HeaderProfile />
        </View>
    );

    return (
        <>
            <StatusBar backgroundColor="#1976D2" style="light" />
            <Tabs
                screenOptions={{
                    tabBarActiveTintColor: COLORS.secondary,
                    tabBarInactiveTintColor: COLORS.textSecondary,
                    tabBarStyle: {
                        backgroundColor: COLORS.card,
                        borderTopColor: COLORS.border,
                        paddingBottom: Math.max(insets.bottom, 5),
                        paddingTop: 5,
                        height: 60 + Math.max(insets.bottom - 5, 0),
                    },
                    headerStyle: {
                        backgroundColor: COLORS.secondary,
                    },
                    headerTintColor: COLORS.white,
                    headerTitleStyle: {
                        fontWeight: '600',
                    },
                    headerRight: () => <HeaderRight />,
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
                    name="post-job"
                    options={{
                        href: null, // Hide from tab bar
                        title: t('post_job'),
                        headerTitle: t('post_new_job'),
                    }}
                />
                <Tabs.Screen
                    name="my-jobs"
                    options={{
                        title: t('nav_my_jobs'),
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="briefcase" size={size} color={color} />
                        ),
                        headerTitle: t('nav_my_jobs'),
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
                    name="workers"
                    options={{
                        title: t('nav_workers'),
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="people" size={size} color={color} />
                        ),
                        headerTitle: t('find_workers'),
                    }}
                />
                <Tabs.Screen
                    name="subscription-plans"
                    options={{
                        title: t('nav_plans'),
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="card" size={size} color={color} />
                        ),
                        headerTitle: t('subscription_plans') || 'Subscription Plans',
                    }}
                />
                <Tabs.Screen
                    name="hired-jobs"
                    options={{
                        title: t('nav_hired'),
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="checkmark-done-circle" size={size} color={color} />
                        ),
                        headerTitle: t('hired_workers'),
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: t('nav_profile'),
                        tabBarIcon: ({ color, size }) => (
                            <ProfileTabIcon color={color} size={size} />
                        ),
                        headerTitle: t('company_profile'),
                    }}
                />
                <Tabs.Screen
                    name="billing"
                    options={{
                        href: null,
                    }}
                />
                <Tabs.Screen
                    name="payment"
                    options={{
                        href: null,
                    }}
                />
                <Tabs.Screen
                    name="payment-status"
                    options={{
                        href: null,
                    }}
                />

            </Tabs>
        </>
    );
}
