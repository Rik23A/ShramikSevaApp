import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS } from '../constants/config';

// Reverse geocoding using free Nominatim API (OpenStreetMap)
const reverseGeocode = async (latitude, longitude) => {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'ShramikSevaApp/1.0',
                },
            }
        );
        const data = await response.json();

        if (data && data.display_name) {
            // Extract useful parts of the address
            const address = data.address || {};
            const parts = [];

            if (address.suburb || address.neighbourhood) {
                parts.push(address.suburb || address.neighbourhood);
            }
            if (address.city || address.town || address.village) {
                parts.push(address.city || address.town || address.village);
            }
            if (address.state) {
                parts.push(address.state);
            }

            return parts.length > 0 ? parts.join(', ') : data.display_name.split(',').slice(0, 3).join(',');
        }
        return null;
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
};

const LocationPicker = ({
    value,
    onChangeLocation,
    placeholder = 'Enter location or use GPS',
    label = 'Location',
    error,
}) => {
    const [loading, setLoading] = useState(false);

    const handleGetLocation = async () => {
        try {
            setLoading(true);

            // Request permission
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Denied',
                    'Please enable location permission in settings to use this feature.',
                    [{ text: 'OK' }]
                );
                return;
            }

            // Get current position
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const { latitude, longitude } = location.coords;

            // Reverse geocode to get address
            const address = await reverseGeocode(latitude, longitude);

            if (address) {
                onChangeLocation(address, { latitude, longitude });
                Alert.alert('Success', 'Location detected successfully!');
            } else {
                // Fallback to coords if geocoding fails
                onChangeLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, { latitude, longitude });
                Alert.alert('Location Found', 'Could not get address, but coordinates saved.');
            }
        } catch (error) {
            console.error('Location error:', error);
            Alert.alert('Error', 'Could not get location. Please enter manually.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}

            <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                    <Ionicons
                        name="location-outline"
                        size={20}
                        color={COLORS.textSecondary}
                        style={styles.inputIcon}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder={placeholder}
                        placeholderTextColor={COLORS.textSecondary}
                        value={value}
                        onChangeText={(text) => onChangeLocation(text)}
                        multiline={false}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.gpsButton, loading && styles.gpsButtonLoading]}
                    onPress={handleGetLocation}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                        <>
                            <Ionicons name="navigate" size={18} color={COLORS.white} />
                            <Text style={styles.gpsButtonText}>GPS</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Text style={styles.helperText}>
                Tap GPS to auto-detect or type manually
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 12,
        height: 48,
        marginRight: 8,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: COLORS.text,
        paddingVertical: 0,
    },
    gpsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.secondary,
        paddingHorizontal: 14,
        height: 48,
        borderRadius: 12,
        minWidth: 70,
    },
    gpsButtonLoading: {
        opacity: 0.8,
    },
    gpsButtonText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 13,
        marginLeft: 4,
    },
    errorText: {
        color: COLORS.danger,
        fontSize: 12,
        marginTop: 4,
    },
    helperText: {
        color: COLORS.textSecondary,
        fontSize: 11,
        marginTop: 4,
    },
});

export default LocationPicker;
