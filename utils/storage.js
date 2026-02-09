import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

// Check if SecureStore is available (not available on web)
const isSecureStoreAvailable = Platform.OS !== 'web';

// Save auth token securely
export const saveToken = async (token) => {
    try {
        if (isSecureStoreAvailable) {
            await SecureStore.setItemAsync(TOKEN_KEY, token);
        } else {
            await AsyncStorage.setItem(TOKEN_KEY, token);
        }
    } catch (error) {
        console.error('Error saving token:', error);
    }
};

// Get auth token
export const getToken = async () => {
    try {
        if (isSecureStoreAvailable) {
            return await SecureStore.getItemAsync(TOKEN_KEY);
        } else {
            return await AsyncStorage.getItem(TOKEN_KEY);
        }
    } catch (error) {
        console.error('Error getting token:', error);
        return null;
    }
};

// Remove auth token
export const removeToken = async () => {
    try {
        if (isSecureStoreAvailable) {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
        } else {
            await AsyncStorage.removeItem(TOKEN_KEY);
        }
    } catch (error) {
        console.error('Error removing token:', error);
    }
};

// Save user data
export const saveUser = async (user) => {
    try {
        if (isSecureStoreAvailable) {
            await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
        } else {
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
        }
    } catch (error) {
        console.error('Error saving user:', error);
    }
};

// Get user data
export const getUser = async () => {
    try {
        let userData;
        if (isSecureStoreAvailable) {
            userData = await SecureStore.getItemAsync(USER_KEY);
        } else {
            userData = await AsyncStorage.getItem(USER_KEY);
        }
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
};

// Remove user data
export const removeUser = async () => {
    try {
        if (isSecureStoreAvailable) {
            await SecureStore.deleteItemAsync(USER_KEY);
        } else {
            await AsyncStorage.removeItem(USER_KEY);
        }
    } catch (error) {
        console.error('Error removing user:', error);
    }
};

// Clear all auth data
export const clearAuthData = async () => {
    await removeToken();
    await removeUser();
};
