import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from './api';

const UPDATE_REMIND_LATER_KEY = 'app_update_remind_later_timestamp';
const REMIND_DELAY_HOURS = 24;

/**
 * Get current application version details from Expo configuration
 */
export const getCurrentAppVersion = () => {
    const expoConfig = Constants.expoConfig || {};
    const version = expoConfig.version || '1.0.0';
    const versionCode = (Platform.OS === 'android' ? expoConfig.android?.versionCode : expoConfig.ios?.buildNumber) || 1;

    return {
        version,
        versionCode: parseInt(versionCode, 10) || 1,
        platform: Platform.OS
    };
};

/**
 * Check backend for new mobile app updates
 */
export const checkForAppUpdate = async (isManualCheck = false) => {
    try {
        const { version, versionCode, platform } = getCurrentAppVersion();

        const response = await API.get('/app-version/check', {
            params: {
                platform,
                currentVersion: version,
                currentBuild: versionCode
            }
        });

        const data = response.data;
        if (!data || !data.success) {
            return { updateAvailable: false };
        }

        // If not a force update and not a manual check, check if user chose "Remind Me Later" recently
        if (!data.forceUpdate && !isManualCheck) {
            const remindTimestamp = await AsyncStorage.getItem(UPDATE_REMIND_LATER_KEY);
            if (remindTimestamp) {
                const elapsedHours = (Date.now() - parseInt(remindTimestamp, 10)) / (1000 * 60 * 60);
                if (elapsedHours < REMIND_DELAY_HOURS) {
                    return {
                        ...data,
                        suppressedByReminder: true
                    };
                }
            }
        }

        return data;
    } catch (error) {
        if (__DEV__) {
            console.log('[UpdateService] Update check skipped/failed:', error.message);
        }
        return { updateAvailable: false, error: error.message };
    }
};

/**
 * Save "Remind Later" timestamp so user is not interrupted for 24 hours
 */
export const postponeUpdate = async () => {
    try {
        await AsyncStorage.setItem(UPDATE_REMIND_LATER_KEY, Date.now().toString());
    } catch (e) {
        console.warn('[UpdateService] Failed to save remind later timestamp:', e);
    }
};

/**
 * Clear reminder timestamp (e.g. after user updates or manually checks)
 */
export const clearUpdateReminder = async () => {
    try {
        await AsyncStorage.removeItem(UPDATE_REMIND_LATER_KEY);
    } catch (e) {
        console.warn('[UpdateService] Failed to clear reminder:', e);
    }
};

/**
 * Direct user efficiently to the Google Play Store (or Apple App Store)
 */
export const openStore = async (storeUrl, marketUrl) => {
    try {
        if (Platform.OS === 'android' && marketUrl) {
            const canOpen = await Linking.canOpenURL(marketUrl);
            if (canOpen) {
                await Linking.openURL(marketUrl);
                return;
            }
        }

        if (storeUrl) {
            await Linking.openURL(storeUrl);
        } else {
            // Fallback for Android package
            const fallbackUrl = 'https://play.google.com/store/apps/details?id=com.shramikseva.app';
            await Linking.openURL(fallbackUrl);
        }
    } catch (error) {
        console.error('[UpdateService] Error opening store URL:', error);
        // Fallback open via web browser
        const fallbackUrl = 'https://play.google.com/store/apps/details?id=com.shramikseva.app';
        Linking.openURL(fallbackUrl).catch((err) => console.error('Fallback link failed:', err));
    }
};
