import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/config';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            showBadge: true,
            enableVibrate: true,
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
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
        await updatePushToken(token);
        console.log('Push token sent to backend via userService');
    } catch (error) {
        console.error('Error sending push token to backend:', error.message);
    }
}
