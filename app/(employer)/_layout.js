import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Tabs, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/config';
import NotificationBell from '../../components/NotificationBell';

export default function EmployerLayout() {
    const insets = useSafeAreaInsets();

    const HeaderRight = () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
            <TouchableOpacity
                onPress={() => router.push('/(employer)/post-job')}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    marginRight: 12
                }}
            >
                <Ionicons name="add-circle" size={18} color={COLORS.white} />
                <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: 'bold', marginLeft: 4 }}>Post Job</Text>
            </TouchableOpacity>
            <NotificationBell iconColor={COLORS.white} />
        </View>
    );

    return (
        <>
            <StatusBar style="light" />
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
                        title: 'Home',
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
                        title: 'Post Job',
                        headerTitle: 'Post New Job',
                    }}
                />
                <Tabs.Screen
                    name="my-jobs"
                    options={{
                        title: 'My Jobs',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="briefcase" size={size} color={color} />
                        ),
                        headerTitle: 'My Jobs',
                    }}
                />
                <Tabs.Screen
                    name="messages"
                    options={{
                        title: 'Messages',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="chatbubbles" size={size} color={color} />
                        ),
                        headerTitle: 'Messages',
                    }}
                />
                <Tabs.Screen
                    name="workers"
                    options={{
                        title: 'Workers',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="people" size={size} color={color} />
                        ),
                        headerTitle: 'Find Workers',
                    }}
                />
                <Tabs.Screen
                    name="subscription-plans"
                    options={{
                        title: 'Plans',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="card" size={size} color={color} />
                        ),
                        headerTitle: 'Subscription Plans',
                    }}
                />
                <Tabs.Screen
                    name="hired-jobs"
                    options={{
                        title: 'Hired',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="checkmark-done-circle" size={size} color={color} />
                        ),
                        headerTitle: 'Hired Workers',
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Profile',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="person" size={size} color={color} />
                        ),
                        headerTitle: 'Company Profile',
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
