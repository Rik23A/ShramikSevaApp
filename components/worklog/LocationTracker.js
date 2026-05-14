import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { updateWorkerLocation } from '../../services/geolocationService';
import { useSocket } from '../../context/SocketContext';

const LOCATION_UPDATE_INTERVAL = 3 * 60 * 1000; // 3 minutes

const LocationTracker = () => {
    const { user } = useAuth();
    const { activeWorkLog } = useSocket();
    const intervalRef = useRef(null);

    // Only track if the work log is actually in-progress
    const activeJobId = activeWorkLog?.status === 'in-progress' 
        ? (activeWorkLog.job?._id || activeWorkLog.job) 
        : null;

    const sendLocationUpdate = async () => {
        if (!user || !activeJobId) return;

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('LocationTracker: Permission to access location was denied');
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            console.log('LocationTracker: Sending location update for job:', activeJobId);
            await updateWorkerLocation(user._id, activeJobId, {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('LocationTracker: Error sending location update:', error);
        }
    };

    useEffect(() => {
        if (activeJobId && user) {
            // Initial update when active job is detected
            sendLocationUpdate();

            // Set up interval for location updates
            intervalRef.current = setInterval(sendLocationUpdate, LOCATION_UPDATE_INTERVAL);

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }
    }, [activeJobId, user?._id]);

    // Handle background/foreground transitions
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active' && activeJobId) {
                sendLocationUpdate();
            }
        });

        return () => {
            subscription.remove();
        };
    }, [activeJobId]);

    return null; // This is a background logic component
};

export default LocationTracker;
