import React, { createContext, useContext, useState, useEffect } from 'react';
import { saveToken, saveUser, getToken, getUser, clearAuthData } from '../utils/storage';
import { getProfile } from '../services/userService';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for existing auth on app start
    useEffect(() => {
        loadStoredAuth();
    }, []);

    const loadStoredAuth = async () => {
        try {
            const storedToken = await getToken();
            const storedUser = await getUser();

            if (storedToken && storedUser) {
                console.log('Auth Context: Loaded stored user:', storedUser._id);
                setToken(storedToken);
                setUser(storedUser);

                // Refresh profile data in background to get latest workerType/skills
                refreshProfile().catch(err => console.log('Background profile refresh failed:', err));
            } else {
                console.log('Auth Context: No stored user or token found');
            }
        } catch (error) {
            console.error('Error loading stored auth:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (userData) => {
        try {
            const { token: authToken, ...userInfo } = userData;

            await saveToken(authToken);
            await saveUser(userInfo);

            setToken(authToken);
            setUser(userInfo);

            return true;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };

    const logout = async () => {
        try {
            await clearAuthData();
            setToken(null);
            setUser(null);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const updateUser = async (newUserData) => {
        const updatedUser = { ...user, ...newUserData };
        await saveUser(updatedUser);
        setUser(updatedUser);
    };

    // Refresh user profile from backend
    const refreshProfile = async () => {
        try {
            const freshProfile = await getProfile();
            await saveUser(freshProfile);
            setUser(freshProfile);
            return freshProfile;
        } catch (error) {
            console.error('[AuthContext] Failed to refresh profile:', error);
            throw error;
        }
    };

    const value = {
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        isWorker: user?.role === 'worker',
        isEmployer: user?.role === 'employer',
        login,
        logout,
        updateUser,
        refreshProfile, // NEW: Expose refresh function
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
