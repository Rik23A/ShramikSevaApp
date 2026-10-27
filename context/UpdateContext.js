import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { checkForAppUpdate, postponeUpdate } from '../services/updateService';
import AppUpdateModal from '../components/ui/AppUpdateModal';

const UpdateContext = createContext({});

export const UpdateProvider = ({ children }) => {
    const [updateInfo, setUpdateInfo] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const lastCheckTime = useRef(0);

    const performCheck = useCallback(async (isManual = false) => {
        // Prevent spam checks within 30 seconds unless manual
        const now = Date.now();
        if (!isManual && now - lastCheckTime.current < 30000) {
            return;
        }
        lastCheckTime.current = now;

        setIsChecking(true);
        try {
            const data = await checkForAppUpdate(isManual);

            if (data && data.updateAvailable && !data.suppressedByReminder) {
                setUpdateInfo(data);
                setModalVisible(true);
            } else if (isManual) {
                setUpdateInfo(data);
            }
            return data;
        } catch (error) {
            console.log('[UpdateContext] Check error:', error);
            return null;
        } finally {
            setIsChecking(false);
        }
    }, []);

    // Initial check on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            performCheck(false);
        }, 2000); // 2-second grace period after splash screen

        return () => clearTimeout(timer);
    }, [performCheck]);

    // Check when app resumes from background
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                performCheck(false);
            }
        });

        return () => subscription.remove();
    }, [performCheck]);

    const dismissUpdate = async () => {
        setModalVisible(false);
        if (updateInfo && !updateInfo.forceUpdate) {
            await postponeUpdate();
        }
    };

    return (
        <UpdateContext.Provider
            value={{
                updateInfo,
                isChecking,
                checkForUpdates: () => performCheck(true),
                dismissUpdate
            }}
        >
            {children}
            <AppUpdateModal
                visible={modalVisible}
                updateInfo={updateInfo}
                onDismiss={dismissUpdate}
            />
        </UpdateContext.Provider>
    );
};

export const useUpdate = () => {
    const context = useContext(UpdateContext);
    if (!context) {
        throw new Error('useUpdate must be used within an UpdateProvider');
    }
    return context;
};
