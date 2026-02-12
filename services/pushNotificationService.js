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
                token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
            } else {
                token = (await Notifications.getExpoPushTokenAsync()).data;
            }
            console.log('Push Token:', token);
        } catch (e) {
            // Handle specific errors gracefully
            if (e.message && (e.message.includes('No "projectId" found') || e.message.includes('Invalid uuid'))) {
                console.warn('⚠️ Push Notifications Warning: EAS Project ID is missing or invalid.');
                console.warn('To enable Push Notifications, you must run "eas build:configure" in the ShramikSevaApp directory.');
                console.warn('App will continue without Push Notification capability.');
                // Attempt fallback if possible, though likely to fail if config is malformed
                try {
                    token = (await Notifications.getExpoPushTokenAsync()).data;
                    console.log('Push Token (fallback):', token);
                } catch (fallbackError) {
                    console.log('Fallback token retrieval also failed (expected without EAS config).');
                }
            } else {
                console.error('Error getting push token:', e);
            }
            return null;
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    if (token) {
        await sendPushTokenToBackend(token);
    }

    return token;
}

async function sendPushTokenToBackend(token) {
    try {
        const authToken = await AsyncStorage.getItem('token');
        if (!authToken) return;

        await axios.put(`${API_URL}/users/push-token`, { pushToken: token }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('Push token sent to backend');
    } catch (error) {
        console.error('Error sending push token to backend:', error.message);
        // Retry maybe?
    }
}
