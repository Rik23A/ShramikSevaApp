import React, { createContext, useContext, useState, useEffect } from 'react';
import { saveToken, saveUser, getToken, getUser, clearAuthData } from '../utils/storage';

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
                setToken(storedToken);
                setUser(storedUser);
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
