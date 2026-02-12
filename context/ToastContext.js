import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, Platform } from 'react-native';
import Toast from '../components/ui/Toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const insets = useSafeAreaInsets();

    const showToast = useCallback(({ type = 'info', title, message, duration = 4000, action }) => {
        const id = Date.now().toString() + Math.random().toString();
        setToasts(prev => [...prev, { id, type, title, message, duration, action }]);
    }, []);

    const hideToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, hideToast }}>
            <View style={{ flex: 1 }}>
                {children}
                <View style={[styles.toastContainer, { top: insets.top + (Platform.OS === 'android' ? 10 : 0) }]}>
                    {toasts.map(toast => (
                        <Toast key={toast.id} {...toast} onClose={hideToast} />
                    ))}
                </View>
            </View>
        </ToastContext.Provider>
    );
};

const styles = StyleSheet.create({
    toastContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
        pointerEvents: 'box-none', // Allow clicks pass through empty space
    }
});
