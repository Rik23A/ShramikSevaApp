import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/config';

const LiveTrackingMap = ({ workerLocation, jobLocation, workerName }) => {
    const mapRef = useRef(null);

    // Initial region centered between worker and job
    const getInitialRegion = () => {
        if (!workerLocation && !jobLocation) {
            return {
                latitude: 20.5937,
                longitude: 78.9629,
                latitudeDelta: 15,
                longitudeDelta: 15,
            };
        }

        const lat1 = workerLocation?.latitude || jobLocation?.latitude;
        const lng1 = workerLocation?.longitude || jobLocation?.longitude;
        const lat2 = jobLocation?.latitude || workerLocation?.latitude;
        const lng2 = jobLocation?.longitude || workerLocation?.longitude;

        return {
            latitude: (lat1 + lat2) / 2,
            longitude: (lng1 + lng2) / 2,
            latitudeDelta: Math.abs(lat1 - lat2) * 2 + 0.05,
            longitudeDelta: Math.abs(lng1 - lng2) * 2 + 0.05,
        };
    };

    useEffect(() => {
        if (mapRef.current && workerLocation && jobLocation) {
            mapRef.current.fitToCoordinates(
                [
                    { latitude: workerLocation.latitude, longitude: workerLocation.longitude },
                    { latitude: jobLocation.latitude, longitude: jobLocation.longitude }
                ],
                {
                    edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                    animated: true,
                }
            );
        }
    }, [workerLocation, jobLocation]);

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={getInitialRegion()}
                showsUserLocation={false}
                showsMyLocationButton={false}
            >
                {jobLocation && (
                    <Marker
                        coordinate={{
                            latitude: jobLocation.latitude,
                            longitude: jobLocation.longitude,
                        }}
                        title="Job Location"
                        description="Where the work is"
                    >
                        <View style={styles.jobMarker}>
                            <Ionicons name="briefcase" size={24} color={COLORS.white} />
                        </View>
                    </Marker>
                )}

                {workerLocation && (
                    <Marker
                        coordinate={{
                            latitude: workerLocation.latitude,
                            longitude: workerLocation.longitude,
                        }}
                        title={workerName || "Worker"}
                        description="Current location"
                    >
                        <View style={styles.workerMarker}>
                            <Ionicons name="person" size={20} color={COLORS.white} />
                        </View>
                    </Marker>
                )}
            </MapView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 300,
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        marginVertical: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    jobMarker: {
        backgroundColor: COLORS.primary,
        padding: 5,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    workerMarker: {
        backgroundColor: COLORS.success,
        padding: 5,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: COLORS.white,
    },
});

export default LiveTrackingMap;
