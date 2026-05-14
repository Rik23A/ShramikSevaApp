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
import { useLanguage } from '../context/LanguageContext';

// Reverse geocoding using free Nominatim API (OpenStreetMap)
const geocodeAddress = async (query) => {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
            {
                headers: {
                    'User-Agent': 'ShramikSevaApp/1.0',
                },
            }
        );
        const data = await response.json();
        if (data && data.length > 0) {
            return {
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon),
                displayName: data[0].display_name
            };
        }
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
};

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
            const address = data.address || {};
            const city = address.city || address.town || address.village || '';
            const state = address.state || '';
            const parts = [];

            if (address.suburb || address.neighbourhood) {
                parts.push(address.suburb || address.neighbourhood);
            }
            if (city) parts.push(city);
            if (state) parts.push(state);

            const displayAddress = parts.length > 0
                ? parts.join(', ')
                : data.display_name.split(',').slice(0, 3).join(',');

            return { address: displayAddress, city, state };
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
        placeholder = t('location_placeholder') || 'Enter location or use GPS',
        label = t('location') || 'Location',
        error,
    }) => {
        const { t } = useLanguage();
        const [loading, setLoading] = useState(false);
    
        const handleSearchLocation = async () => {
            if (!value || value.trim().length < 3) {
                Alert.alert(t('error_title'), t('location_search_error'));
                return;
            }
    
            try {
                setLoading(true);
                const geoResult = await geocodeAddress(value);
    
                if (geoResult) {
                    // Get more details like city/state
                    const details = await reverseGeocode(geoResult.latitude, geoResult.longitude);
                    onChangeLocation(
                        geoResult.displayName,
                        { latitude: geoResult.latitude, longitude: geoResult.longitude },
                        { city: details?.city || '', state: details?.state || '' }
                    );
                    Alert.alert(t('location_found_title') || 'Location Found', t('location_found_msg'));
                } else {
                    Alert.alert(t('not_found'), t('location_not_found'));
                }
            } catch (error) {
                console.error('Search error:', error);
                Alert.alert(t('error_title'), t('something_went_wrong'));
            } finally {
                setLoading(false);
            }
        };
    
        const handleGetLocation = async () => {
            try {
                setLoading(true);
    
                // Request permission
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert(
                        t('location_permission_denied'),
                        t('location_permission_desc'),
                        [{ text: t('ok') }]
                    );
                    return;
                }
    
                // Get current position
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
    
                const { latitude, longitude } = location.coords;
    
                // Reverse geocode to get address
                const result = await reverseGeocode(latitude, longitude);
    
                if (result) {
                    onChangeLocation(result.address, { latitude, longitude }, { city: result.city, state: result.state });
                    Alert.alert(t('success'), t('location_detected_success'));
                } else {
                    // Fallback to coords if geocoding fails
                    onChangeLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, { latitude, longitude }, { city: '', state: '' });
                    Alert.alert(t('location_found_title') || 'Location Found', t('location_fallback_msg') || 'Could not get address, but coordinates saved.');
                }
            } catch (error) {
                console.error('Location error:', error);
                Alert.alert(t('error_title'), t('location_manual_hint'));
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
                            onChangeText={(text) => onChangeLocation(text, null, { city: '', state: '' })}
                            multiline={false}
                            returnKeyType="search"
                            onSubmitEditing={handleSearchLocation}
                        />
                        {value && value.length > 2 && (
                            <TouchableOpacity onPress={handleSearchLocation} disabled={loading} style={styles.searchIcon}>
                                <Ionicons name="search" size={20} color={COLORS.primary} />
                            </TouchableOpacity>
                        )}
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
                                <Text style={styles.gpsButtonText}>{t('gps')}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
    
                {error && <Text style={styles.errorText}>{error}</Text>}
    
                <Text style={styles.helperText}>
                    {loading ? t('location_detecting') : t('location_manual_hint')}
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
        height: '100%',
    },
    searchIcon: {
        padding: 4,
        marginLeft: 4,
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
