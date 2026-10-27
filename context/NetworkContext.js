import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';

const NetworkContext = createContext({
    isConnected: true,
    isInternetReachable: true,
    isOffline: false,
    connectionType: 'unknown',
    refreshNetwork: async () => {},
});

export const NetworkProvider = ({ children }) => {
    const [netState, setNetState] = useState({
        isConnected: true,
        // On initial mount, isInternetReachable may be null while probing
        isInternetReachable: true,
        type: 'unknown',
        details: null,
    });

    const updateState = useCallback((state) => {
        setNetState({
            isConnected: state.isConnected ?? true,
            // When isInternetReachable is null (initial probing), fallback to isConnected
            isInternetReachable: state.isInternetReachable ?? (state.isConnected ?? true),
            type: state.type || 'unknown',
            details: state.details || null,
        });
    }, []);

    useEffect(() => {
        // Fetch current status on mount
        NetInfo.fetch().then(updateState);

        // Listen to network changes in real-time
        const unsubscribe = NetInfo.addEventListener(updateState);

        return () => {
            unsubscribe();
        };
    }, [updateState]);

    const refreshNetwork = useCallback(async () => {
        try {
            const state = await NetInfo.fetch();
            updateState(state);
            return state;
        } catch (error) {
            console.warn('[NetworkContext] Failed to refresh network status:', error);
            return null;
        }
    }, [updateState]);

    // An app is truly offline if isConnected is false, OR isInternetReachable has explicitly resolved to false
    const isOffline = netState.isConnected === false || netState.isInternetReachable === false;

    return (
        <NetworkContext.Provider
            value={{
                isConnected: netState.isConnected,
                isInternetReachable: netState.isInternetReachable,
                isOffline,
                connectionType: netState.type,
                details: netState.details,
                refreshNetwork,
            }}
        >
            {children}
        </NetworkContext.Provider>
    );
};

export const useNetwork = () => {
    const context = useContext(NetworkContext);
    if (!context) {
        throw new Error('useNetwork must be used within a NetworkProvider');
    }
    return context;
};

export default NetworkContext;
