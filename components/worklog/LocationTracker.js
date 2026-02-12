import React, { useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { updateWorkerLocation } from '../../services/geolocationService';
import { getWorkerWorkLogs } from '../../services/worklogService';

const LOCATION_UPDATE_INTERVAL = 3 * 60 * 1000; // 3 minutes

const LocationTracker = () => {
    const { user } = useAuth();
    const [activeJobId, setActiveJobId] = useState(null);
    const intervalRef = useRef(null);

    const checkActiveWorkLog = async () => {
        if (!user || user.role !== 'worker') return;

        try {
            const logs = await getWorkerWorkLogs();
            // Find an in-progress log
            const activeLog = logs.find(log => log.status === 'in-progress');
            if (activeLog) {
                const jobId = activeLog.job?._id || activeLog.job;
                console.log('LocationTracker: Found active job:', jobId);
                setActiveJobId(jobId);
            } else {
                setActiveJobId(null);
            }
        } catch (error) {
            console.error('LocationTracker: Error checking active work log:', error);
        }
    };

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
        checkActiveWorkLog();
        // Check every 5 minutes if there is a new active job
        const checkInterval = setInterval(checkActiveWorkLog, 5 * 60 * 1000);
        return () => clearInterval(checkInterval);
    }, [user?._id]);

    useEffect(() => {
        if (activeJobId && user) {
            // Initial update
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
