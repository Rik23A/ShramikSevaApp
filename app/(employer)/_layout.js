import React from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/config';

export default function EmployerLayout() {
    const insets = useSafeAreaInsets();

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
                        title: 'Post Job',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="add-circle" size={size} color={color} />
                        ),
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
                    name="profile"
                    options={{
                        title: 'Profile',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="person" size={size} color={color} />
                        ),
                        headerTitle: 'Company Profile',
                    }}
                />
            </Tabs>
        </>
    );
}
