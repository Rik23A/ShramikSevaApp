import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform, Alert, Linking } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/config';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
    }),
});

export async function setupNotificationChannels() {
    if (Platform.OS === 'android') {
        // 1. High Priority Messages & Urgent Work (Heads-up pop banner, vibration, sound)
        await Notifications.setNotificationChannelAsync('messages_channel', {
            name: 'Messages & Chat',
            description: 'Instant notifications for incoming chat messages',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#1976D2',
            showBadge: true,
            enableVibrate: true,
            enableLights: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            sound: 'default',
        });

        // 2. High Priority Job & Hiring Updates
        await Notifications.setNotificationChannelAsync('job_updates_channel', {
            name: 'Jobs & Work Updates',
            description: 'Alerts for job applications, hiring status, and shift tracking',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 200, 100, 200],
            lightColor: '#388E3C',
            showBadge: true,
            enableVibrate: true,
            enableLights: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            sound: 'default',
        });

        // 3. General & System Announcements (High Priority Heads-up Alert & Sound)
        await Notifications.setNotificationChannelAsync('general_channel', {
            name: 'General & System',
            description: 'Platform updates, announcements, and system alerts',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FFA000',
            showBadge: true,
            enableVibrate: true,
            enableLights: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            sound: 'default',
        });

        // 4. Default Channel for backward compatibility
        await Notifications.setNotificationChannelAsync('default', {
            name: 'General & Messages',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#1976D2',
            showBadge: true,
            enableVibrate: true,
            enableLights: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            sound: 'default',
        });
    }
}

/**
 * Deduplication cache to prevent identical simultaneous alerts from socket & push
 */
const recentNotificationKeys = new Set();

/**
 * Sync the application launcher icon badge count
 * @param {number} count - Unread notification count
 */
export async function syncBadgeCount(count) {
    try {
        const safeCount = Math.max(0, parseInt(count, 10) || 0);
        await Notifications.setBadgeCountAsync(safeCount);
    } catch (error) {
        console.warn('⚠️ [PushService] Could not set app badge count:', error.message);
    }
}

/**
 * Show a native status bar notification
 * @param {Object} params - { title, message, data, channelId }
 */
export async function showLocalNotification({ title, message, data = {}, channelId }) {
    try {
        const notifKey = data._id || data.notificationId || `${title}:${message}`;
        if (recentNotificationKeys.has(notifKey)) {
            console.log('🔇 [PushService] Duplicate notification suppressed:', notifKey);
            return;
        }
        recentNotificationKeys.add(notifKey);
        setTimeout(() => recentNotificationKeys.delete(notifKey), 4000);

        await setupNotificationChannels();
        
        let resolvedChannel = channelId;
        if (!resolvedChannel) {
            const type = (data.type || '').toLowerCase();
            if (type.includes('message') || type.includes('chat')) {
                resolvedChannel = 'messages_channel';
            } else if (type.includes('job') || type.includes('hire') || type.includes('applicant') || type.includes('work')) {
                resolvedChannel = 'job_updates_channel';
            } else {
                resolvedChannel = 'general_channel';
            }
        }

        await Notifications.scheduleNotificationAsync({
            content: {
                title: title || 'Shramik Seva',
                body: message || '',
                data: data,
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.MAX,
                channelId: resolvedChannel,
            },
            trigger: null, // Display immediately in status bar
        });
        console.log('📱 [PushService] Native status bar notification triggered on channel:', resolvedChannel, title);
    } catch (error) {
        console.error('❌ [PushService] Error scheduling local status bar notification:', error);
    }
}

async function promptNotificationSettings() {
    try {
        const lastPrompt = await AsyncStorage.getItem('last_notification_prompt_time');
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;

        if (!lastPrompt || now - parseInt(lastPrompt, 10) > sevenDays) {
            await AsyncStorage.setItem('last_notification_prompt_time', now.toString());

            Alert.alert(
                'Enable Notifications',
                'To get instant job matches, status updates, and messages in real-time, please enable notifications for Shramik Seva in settings.',
                [
                    { text: 'Maybe Later', style: 'cancel' },
                    { 
                        text: 'Go to Settings', 
                        onPress: () => {
                            if (Platform.OS === 'ios') {
                                Linking.openURL('app-settings:');
                            } else {
                                Linking.openSettings();
                            }
                        }
                    }
                ]
            );
        }
    } catch (error) {
        console.error('Error prompting notification settings:', error);
    }
}

export async function registerForPushNotificationsAsync() {
    let token;

    await setupNotificationChannels();

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            // Ask user periodically to allow settings redirect
            await promptNotificationSettings();
            return;
        }

        // Get the token
        try {
            const projectId =
                Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;

            if (projectId) {
                console.log('📡 [PushService] Attempting to get token with ProjectId:', projectId);
                token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
            } else {
                console.log('📡 [PushService] Attempting to get token without explicitly passed ProjectId');
                token = (await Notifications.getExpoPushTokenAsync()).data;
            }
            console.log('✅ [PushService] Expo Push Token obtained:', token);
        } catch (e) {
            console.error('❌ [PushService] Error getting push token:', e.message);
            // Attempt a quick fallback without projectId if it failed with one
            try {
                console.log('📡 [PushService] Attempting fallback token retrieval...');
                token = (await Notifications.getExpoPushTokenAsync()).data;
                console.log('✅ [PushService] Fallback token obtained:', token);
            } catch (fallbackError) {
                console.error('❌ [PushService] Fallback also failed:', fallbackError.message);
            }
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    if (token) {
        await sendPushTokenToBackend(token);
    }

    return token;
}

import { updatePushToken } from './userService';

async function sendPushTokenToBackend(token) {
    try {
        const deviceName = Device.modelName || Device.deviceName || 'Android Device';
        await updatePushToken({
            pushToken: token,
            platform: Platform.OS,
            deviceName: deviceName
        });
        console.log('Push token sent to backend via userService');
    } catch (error) {
        console.error('Error sending push token to backend:', error.message);
    }
}
