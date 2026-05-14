import axios from 'axios';
import { getToken, clearAuthData } from '../utils/storage';
import { API_URL } from '../constants/config';

// Module-level logout callback — registered by AuthContext on mount.
// Called automatically when any API request returns 401.
let _logoutCallback = null;
export const setLogoutCallback = (fn) => { _logoutCallback = fn; };

// Create axios instance
const API = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

// Request interceptor - add JWT token to all requests
API.interceptors.request.use(
    async (config) => {
        const token = await getToken();
        if (__DEV__) {
            console.log('[API] Request URL:', config.url);
            console.log('[API] Token:', token ? `exists (${token.length} chars)` : 'NO TOKEN');
        }
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add language setting
        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const locale = await AsyncStorage.getItem('user-language');
            if (locale) {
                config.headers['Accept-Language'] = locale;
            }
        } catch (e) {
            console.log('Error reading language', e);
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle errors globally
API.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid — clear storage then trigger app logout + navigation
            await clearAuthData();
            if (_logoutCallback) {
                _logoutCallback();
            }
        }
        
        if (error.response?.status === 429) {
            // Rate limit hit
            const { Alert } = require('react-native');
            Alert.alert(
                'Slow Down',
                'You are making too many requests. Please wait a few minutes before trying again.',
                [{ text: 'OK' }]
            );
        }

        return Promise.reject(error);
    }
);

export default API;
