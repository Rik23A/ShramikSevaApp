import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
    Modal,
    StatusBar,
    ScrollView,
    Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/config';
import { useLanguage } from '../context/LanguageContext';

const LEAFLET_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; width: 100%; }
    #crosshair-container {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1000;
      pointer-events: none;
      align-items: center;
      justify-content: center;
      display: flex;
    }
    #crosshair-pin {
      width: 36px;
      height: 36px;
      margin-bottom: 36px; /* offset to place tip exactly at center */
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="crosshair-container">
    <svg id="crosshair-pin" viewBox="0 0 24 24" fill="none" stroke="#FF4500" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>
  </div>
  <script>
    var map = L.map('map', {
      zoomControl: false
    }).setView([22.5726, 88.3639], 15);
    
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    function sendCoords() {
      var center = map.getCenter();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        latitude: center.lat,
        longitude: center.lng
      }));
    }

    map.on('moveend', sendCoords);

    window.addEventListener('message', function(event) {
      try {
        var coords = JSON.parse(event.data);
        if (coords.latitude && coords.longitude) {
          map.setView([coords.latitude, coords.longitude], 15);
        }
      } catch (err) {
        console.error('Leaflet parsing error:', err);
      }
    });
  </script>
</body>
</html>
`;

// Calculate distance in kilometers between two lat/lon coordinates (Haversine formula)
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return Math.round(dist * 10) / 10;
};

// Robust search using free Nominatim API with nearby bias, pincode detection, deduplication & multi-tier fallback
const searchLocations = async (query, refCoords = null, signal = null) => {
    if (!query || query.trim().length < 2) return [];

    const cleanedQuery = query.trim().replace(/\s+/g, ' ');

    // Build bounding box for nearby prioritization if reference coordinates exist (approx 80km radius)
    let viewboxParam = '';
    if (refCoords && refCoords.latitude && refCoords.longitude) {
        const delta = 0.8;
        const minLon = (refCoords.longitude - delta).toFixed(4);
        const maxLat = (refCoords.latitude + delta).toFixed(4);
        const maxLon = (refCoords.longitude + delta).toFixed(4);
        const minLat = (refCoords.latitude - delta).toFixed(4);
        viewboxParam = `&viewbox=${minLon},${maxLat},${maxLon},${minLat}&bounded=0`;
    }

    const fetchNominatim = async (url) => {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'ShramikSevaApp/1.0 (shramik-seva-app@gmail.com)',
                'Accept-Language': 'en',
            },
            signal,
        });
        if (!response.ok) return [];
        return await response.json();
    };

    try {
        // Check if query is an Indian 6-digit pincode
        const isPinCode = /^[1-9][0-9]{5}$/.test(cleanedQuery);
        let primaryUrl = isPinCode
            ? `https://nominatim.openstreetmap.org/search?format=json&postalcode=${cleanedQuery}&countrycodes=in&limit=15&addressdetails=1${viewboxParam}`
            : `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanedQuery)}&countrycodes=in&limit=15&addressdetails=1${viewboxParam}`;

        let data = await fetchNominatim(primaryUrl);

        // Fallback 1: If 6-digit pincode with postalcode param returned 0, try standard 'q'
        if ((!data || data.length === 0) && isPinCode) {
            data = await fetchNominatim(
                `https://nominatim.openstreetmap.org/search?format=json&q=${cleanedQuery}&countrycodes=in&limit=15&addressdetails=1${viewboxParam}`
            );
        }

        // Fallback 2: If multi-term query with commas returned 0 results, try relaxing the query
        if ((!data || data.length === 0) && cleanedQuery.includes(',')) {
            const parts = cleanedQuery.split(',').map(p => p.trim()).filter(Boolean);
            if (parts.length > 1) {
                const relaxedQuery = `${parts[0]}, ${parts[parts.length - 1]}`;
                data = await fetchNominatim(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(relaxedQuery)}&countrycodes=in&limit=15&addressdetails=1${viewboxParam}`
                );
            }
        }

        // Fallback 3: If query still has 0 results and viewbox was applied, retry without viewbox (user searching another state)
        if ((!data || data.length === 0) && viewboxParam) {
            data = await fetchNominatim(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanedQuery)}&countrycodes=in&limit=15&addressdetails=1`
            );
        }

        if (!Array.isArray(data) || data.length === 0) return [];

        const seenKeys = new Set();
        const results = [];

        for (const item of data) {
            const lat = parseFloat(item.lat);
            const lon = parseFloat(item.lon);
            if (isNaN(lat) || isNaN(lon)) continue;

            const address = item.address || {};
            const city = address.city || address.town || address.village || address.municipality || address.county || address.state_district || '';
            const state = address.state || '';
            const postcode = address.postcode || '';
            const suburb = address.suburb || address.neighbourhood || address.residential || address.subdistrict || address.road || '';
            
            const primaryTitle = item.name || suburb || city || item.display_name.split(',')[0].trim();

            const subtitleParts = [];
            if (suburb && suburb !== primaryTitle) subtitleParts.push(suburb);
            if (city && city !== primaryTitle) subtitleParts.push(city);
            if (state) subtitleParts.push(state);
            if (postcode) subtitleParts.push(postcode);

            const subtitle = subtitleParts.length > 0
                ? subtitleParts.join(', ')
                : item.display_name;

            // Deduplication key based on title + city + approximate coordinates (within ~200m)
            const dedupeKey = `${primaryTitle.toLowerCase()}_${city.toLowerCase()}_${lat.toFixed(2)}_${lon.toFixed(2)}`;
            if (seenKeys.has(dedupeKey)) continue;
            seenKeys.add(dedupeKey);

            // Compute distance from reference coordinates
            let distanceKm = null;
            let distanceText = '';
            if (refCoords && refCoords.latitude && refCoords.longitude) {
                distanceKm = calculateDistanceKm(refCoords.latitude, refCoords.longitude, lat, lon);
                if (distanceKm !== null) {
                    distanceText = distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm} km`;
                }
            }

            results.push({
                id: item.place_id ? String(item.place_id) : `${lat}_${lon}`,
                latitude: lat,
                longitude: lon,
                displayName: item.display_name,
                title: primaryTitle,
                subtitle,
                city: city || primaryTitle,
                state,
                postcode,
                distanceKm,
                distanceText,
            });
        }

        // Sort by distance if reference coordinates exist (nearby first)
        if (refCoords && refCoords.latitude && refCoords.longitude) {
            results.sort((a, b) => {
                if (a.distanceKm != null && b.distanceKm != null) {
                    return a.distanceKm - b.distanceKm;
                }
                return 0;
            });
        }

        return results;
    } catch (error) {
        if (error.name === 'AbortError') {
            return [];
        }
        console.error('Location search error:', error);
        return [];
    }
};

// Geocode single address query with nearby prioritization
const geocodeAddress = async (query, refCoords = null) => {
    try {
        const cleaned = query.trim();
        let viewboxParam = '';
        if (refCoords && refCoords.latitude && refCoords.longitude) {
            const delta = 0.8;
            viewboxParam = `&viewbox=${(refCoords.longitude - delta).toFixed(4)},${(refCoords.latitude + delta).toFixed(4)},${(refCoords.longitude + delta).toFixed(4)},${(refCoords.latitude - delta).toFixed(4)}&bounded=0`;
        }

        const isPin = /^[1-9][0-9]{5}$/.test(cleaned);
        const url = isPin
            ? `https://nominatim.openstreetmap.org/search?format=json&postalcode=${cleaned}&countrycodes=in&limit=1&addressdetails=1${viewboxParam}`
            : `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleaned)}&countrycodes=in&limit=1&addressdetails=1${viewboxParam}`;

        let response = await fetch(url, {
            headers: {
                'User-Agent': 'ShramikSevaApp/1.0 (shramik-seva-app@gmail.com)',
                'Accept-Language': 'en',
            },
        });
        let data = await response.json();

        if ((!data || data.length === 0) && viewboxParam) {
            response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleaned)}&countrycodes=in&limit=1&addressdetails=1`,
                {
                    headers: {
                        'User-Agent': 'ShramikSevaApp/1.0 (shramik-seva-app@gmail.com)',
                        'Accept-Language': 'en',
                    },
                }
            );
            data = await response.json();
        }

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

// Reverse geocoding using free Nominatim API with rich address fields
const reverseGeocode = async (latitude, longitude) => {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'ShramikSevaApp/1.0 (shramik-seva-app@gmail.com)',
                    'Accept-Language': 'en',
                },
            }
        );
        const data = await response.json();

        if (data && data.display_name) {
            const address = data.address || {};
            const city = address.city || address.town || address.village || address.municipality || address.county || address.state_district || '';
            const state = address.state || '';
            const suburb = address.suburb || address.neighbourhood || address.residential || address.road || '';
            const parts = [];

            if (suburb) parts.push(suburb);
            if (city && city !== suburb) parts.push(city);
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
    placeholder,
    label,
    error,
}) => {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [mapModalVisible, setMapModalVisible] = useState(false);
    const [mapRegion, setMapRegion] = useState(null);
    const [markerCoordinate, setMarkerCoordinate] = useState(null);
    const [tempAddress, setTempAddress] = useState('');
    const [tempCity, setTempCity] = useState('');
    const [tempState, setTempState] = useState('');
    const [mapLoading, setMapLoading] = useState(false);
    const [userCoords, setUserCoords] = useState(null);

    // Modal Search State
    const [modalSearchText, setModalSearchText] = useState('');
    const [modalSearchResults, setModalSearchResults] = useState([]);
    const [modalSearchLoading, setModalSearchLoading] = useState(false);
    const modalDebounceRef = useRef(null);
    const modalAbortControllerRef = useRef(null);

    // Inline Main Input Autocomplete State
    const [inlineSearchText, setInlineSearchText] = useState(value || '');
    const [inlineSearchResults, setInlineSearchResults] = useState([]);
    const [inlineSearchLoading, setInlineSearchLoading] = useState(false);
    const [showInlineDropdown, setShowInlineDropdown] = useState(false);
    const inlineDebounceRef = useRef(null);
    const inlineAbortControllerRef = useRef(null);

    const finalPlaceholder = placeholder || t('location_placeholder') || 'Enter location or use GPS';
    const finalLabel = label || t('location') || 'Location';
    const webViewRef = useRef(null);

    // Check location permission silently on mount for nearby prioritization
    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getLastKnownPositionAsync();
                    if (loc && isMounted) {
                        setUserCoords({
                            latitude: loc.coords.latitude,
                            longitude: loc.coords.longitude,
                        });
                    }
                }
            } catch (_e) {}
        })();
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        setInlineSearchText(value || '');
    }, [value]);

    useEffect(() => {
        if (mapModalVisible && mapRegion && webViewRef.current) {
            const js = `
                if (typeof map !== 'undefined' && map) {
                    map.setView([${mapRegion.latitude}, ${mapRegion.longitude}], 15);
                }
            `;
            const timer = setTimeout(() => {
                webViewRef.current?.injectJavaScript(js);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [mapModalVisible, mapRegion]);

    const handleMapMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.latitude && data.longitude) {
                handleRegionChangeComplete(data);
            }
        } catch (err) {
            console.error('Error parsing map message data:', err);
        }
    };

    const handleOpenMap = async () => {
        setMapModalVisible(true);
        setMapLoading(true);
        setModalSearchText('');
        setModalSearchResults([]);
        
        let lat = 22.5726;
        let lon = 88.3639;
        
        try {
            const { status } = await Location.getForegroundPermissionsAsync();
            if (status === 'granted') {
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                lat = location.coords.latitude;
                lon = location.coords.longitude;
                setUserCoords({ latitude: lat, longitude: lon });
            }
        } catch (_e) {
            console.log('Skipping GPS default region lookup');
        }
        
        const initialRegion = {
            latitude: lat,
            longitude: lon,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
        };
        
        setMapRegion(initialRegion);
        setMarkerCoordinate({ latitude: lat, longitude: lon });
        
        const result = await reverseGeocode(lat, lon);
        if (result) {
            setTempAddress(result.address);
            setTempCity(result.city || '');
            setTempState(result.state || '');
        } else {
            setTempAddress(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        }
        setMapLoading(false);
    };

    const handleRegionChangeComplete = async (region) => {
        const newCoord = {
            latitude: region.latitude,
            longitude: region.longitude,
        };
        setMarkerCoordinate(newCoord);
        
        try {
            setMapLoading(true);
            const result = await reverseGeocode(region.latitude, region.longitude);
            if (result) {
                setTempAddress(result.address);
                if (result.city) setTempCity(result.city);
                if (result.state) setTempState(result.state);
            } else {
                setTempAddress(`${region.latitude.toFixed(4)}, ${region.longitude.toFixed(4)}`);
                setTempCity('');
                setTempState('');
            }
        } catch (err) {
            console.error('Map move geocode error:', err);
        } finally {
            setMapLoading(false);
        }
    };

    // Modal Search handler with debounce, nearby biasing & abort control
    const handleModalSearchChange = (text) => {
        setModalSearchText(text);
        if (modalDebounceRef.current) clearTimeout(modalDebounceRef.current);
        if (modalAbortControllerRef.current) {
            modalAbortControllerRef.current.abort();
        }
        if (!text || text.trim().length < 2) {
            setModalSearchResults([]);
            setModalSearchLoading(false);
            return;
        }
        setModalSearchLoading(true);
        modalDebounceRef.current = setTimeout(async () => {
            modalAbortControllerRef.current = new AbortController();
            const refCoords = markerCoordinate || mapRegion || userCoords;
            const results = await searchLocations(text, refCoords, modalAbortControllerRef.current.signal);
            setModalSearchResults(results);
            setModalSearchLoading(false);
        }, 300);
    };

    // When an item in the modal search dropdown is tapped
    const handleSelectModalLocation = (item) => {
        setModalSearchText('');
        setModalSearchResults([]);
        Keyboard.dismiss();

        const newCoord = {
            latitude: item.latitude,
            longitude: item.longitude,
        };
        setMarkerCoordinate(newCoord);
        setMapRegion({
            latitude: item.latitude,
            longitude: item.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
        });
        setTempAddress(item.displayName);
        setTempCity(item.city);
        setTempState(item.state);

        // Fly map to new coordinates
        const js = `
            if (typeof map !== 'undefined' && map) {
                map.setView([${item.latitude}, ${item.longitude}], 16);
            }
        `;
        webViewRef.current?.injectJavaScript(js);
    };

    const handleConfirmMapLocation = () => {
        setInlineSearchText(tempAddress);
        if (markerCoordinate) {
            setUserCoords({
                latitude: markerCoordinate.latitude,
                longitude: markerCoordinate.longitude
            });
        }
        onChangeLocation(
            tempAddress,
            { latitude: markerCoordinate.latitude, longitude: markerCoordinate.longitude },
            { city: tempCity, state: tempState }
        );
        setMapModalVisible(false);
    };

    // Inline search input handler with debounce, nearby biasing & abort control
    const handleInlineTextChange = (text) => {
        setInlineSearchText(text);
        setShowInlineDropdown(true);

        // Immediate fallback city/state extraction so city is never blank
        const parts = text.split(',').map(p => p.trim()).filter(Boolean);
        const fallbackCity = parts[0] || text.trim();
        const fallbackState = parts.length > 1 ? parts[1] : '';
        onChangeLocation(text, null, { city: fallbackCity, state: fallbackState });

        if (inlineDebounceRef.current) clearTimeout(inlineDebounceRef.current);
        if (inlineAbortControllerRef.current) {
            inlineAbortControllerRef.current.abort();
        }
        if (!text || text.trim().length < 2) {
            setInlineSearchResults([]);
            setInlineSearchLoading(false);
            return;
        }

        setInlineSearchLoading(true);
        inlineDebounceRef.current = setTimeout(async () => {
            inlineAbortControllerRef.current = new AbortController();
            const results = await searchLocations(text, userCoords, inlineAbortControllerRef.current.signal);
            setInlineSearchResults(results);
            setInlineSearchLoading(false);
        }, 300);
    };

    // When an item in the inline search dropdown is tapped
    const handleSelectInlineLocation = (item) => {
        setInlineSearchText(item.displayName);
        setInlineSearchResults([]);
        setShowInlineDropdown(false);
        Keyboard.dismiss();

        setUserCoords({
            latitude: item.latitude,
            longitude: item.longitude,
        });

        onChangeLocation(
            item.displayName,
            { latitude: item.latitude, longitude: item.longitude },
            { city: item.city, state: item.state }
        );
    };

    const handleSearchLocation = async () => {
        if (!inlineSearchText || inlineSearchText.trim().length < 3) {
            Alert.alert(t('error_title'), t('location_search_error'));
            return;
        }

        try {
            setLoading(true);
            const geoResult = await geocodeAddress(inlineSearchText, userCoords);

            if (geoResult) {
                const details = await reverseGeocode(geoResult.latitude, geoResult.longitude);
                setInlineSearchText(geoResult.displayName);
                setShowInlineDropdown(false);
                setUserCoords({ latitude: geoResult.latitude, longitude: geoResult.longitude });
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

            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    t('location_permission_denied'),
                    t('location_permission_desc'),
                    [{ text: t('ok') }]
                );
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const { latitude, longitude } = location.coords;
            setUserCoords({ latitude, longitude });
            const result = await reverseGeocode(latitude, longitude);

            if (result) {
                setInlineSearchText(result.address);
                setShowInlineDropdown(false);
                onChangeLocation(result.address, { latitude, longitude }, { city: result.city, state: result.state });
                Alert.alert(t('success'), t('location_detected_success'));
            } else {
                const fallbackStr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                setInlineSearchText(fallbackStr);
                setShowInlineDropdown(false);
                onChangeLocation(fallbackStr, { latitude, longitude }, { city: '', state: '' });
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
            {finalLabel && <Text style={styles.label}>{finalLabel}</Text>}

            {/* OpenStreetMap Visual Picker Modal */}
            <Modal
                visible={mapModalVisible}
                animationType="slide"
                onRequestClose={() => {
                    setMapModalVisible(false);
                    setModalSearchResults([]);
                    setModalSearchText('');
                }}
                statusBarTranslucent={false}
            >
                <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
                    <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
                    <View style={styles.mapContainer}>
                        {/* Integrated Top Header with Search & Suggestions */}
                        <View style={styles.modalTopHeader}>
                            <View style={styles.mapHeader}>
                                <View style={styles.mapHeaderTitleRow}>
                                    <Ionicons name="map" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                                    <Text style={styles.mapHeaderTitle}>{t('select_location')}</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => {
                                        setMapModalVisible(false);
                                        setModalSearchResults([]);
                                        setModalSearchText('');
                                    }}
                                    style={styles.mapCloseButton}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Ionicons name="close" size={24} color={COLORS.white} />
                                </TouchableOpacity>
                            </View>

                            {/* Integrated Search Input in Top Header */}
                            <View style={styles.modalSearchSection}>
                                <View style={styles.modalSearchInputWrapper}>
                                    <Ionicons name="search" size={18} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
                                    <TextInput
                                        style={styles.modalSearchInput}
                                        placeholder="Search city, area, pincode..."
                                        placeholderTextColor={COLORS.textSecondary}
                                        value={modalSearchText}
                                        onChangeText={handleModalSearchChange}
                                        returnKeyType="search"
                                        autoCorrect={false}
                                    />
                                    {modalSearchLoading ? (
                                        <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 6 }} />
                                    ) : modalSearchText && modalSearchText.length > 0 ? (
                                        <TouchableOpacity
                                            onPress={() => { setModalSearchText(''); setModalSearchResults([]); }}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} style={{ marginLeft: 6 }} />
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            </View>

                            {/* Dropdown Results Card - In layout flow directly under search bar */}
                            {modalSearchResults.length > 0 && (
                                <View style={styles.modalDropdownCard}>
                                    <View style={styles.dropdownHeaderBar}>
                                        <View style={styles.dropdownHeaderTitleRow}>
                                            <Ionicons name="compass-outline" size={14} color={COLORS.primary} style={{ marginRight: 5 }} />
                                            <Text style={styles.dropdownHeaderText}>
                                                {modalSearchResults.some(i => i.distanceText)
                                                    ? `Nearby Locations (${modalSearchResults.length})`
                                                    : `Matching Locations (${modalSearchResults.length})`}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => setModalSearchResults([])}
                                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                        >
                                            <Ionicons name="close" size={16} color={COLORS.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                    <ScrollView
                                        keyboardShouldPersistTaps="always"
                                        nestedScrollEnabled={true}
                                        showsVerticalScrollIndicator={true}
                                        style={{ maxHeight: 280 }}
                                    >
                                        {modalSearchResults.map((item, index) => (
                                            <TouchableOpacity
                                                key={item.id || index}
                                                style={[
                                                    styles.dropdownItem,
                                                    index < modalSearchResults.length - 1 && styles.dropdownItemBorder
                                                ]}
                                                onPress={() => handleSelectModalLocation(item)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={styles.dropdownIconBox}>
                                                    <Ionicons name="location-sharp" size={16} color={COLORS.primary} />
                                                </View>
                                                <View style={styles.dropdownItemContent}>
                                                    <View style={styles.dropdownItemTopRow}>
                                                        <Text style={styles.dropdownItemTitle} numberOfLines={1}>{item.title}</Text>
                                                        {item.distanceText ? (
                                                            <View style={styles.distanceBadge}>
                                                                <Ionicons name="navigate-outline" size={10} color={COLORS.primary} style={{ marginRight: 3 }} />
                                                                <Text style={styles.distanceBadgeText}>{item.distanceText}</Text>
                                                            </View>
                                                        ) : null}
                                                    </View>
                                                    <Text style={styles.dropdownItemSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        {/* Map Area */}
                        <View style={styles.mapWrapper}>
                            {mapRegion && (
                                <WebView
                                    ref={webViewRef}
                                    style={styles.map}
                                    source={{ html: LEAFLET_HTML }}
                                    onMessage={handleMapMessage}
                                    javaScriptEnabled={true}
                                    domStorageEnabled={true}
                                />
                            )}
                        </View>

                        {/* Footer */}
                        <View style={styles.mapFooter}>
                            <View style={styles.mapFooterAddressRow}>
                                <Ionicons name="location" size={18} color={COLORS.primary} style={{ marginRight: 6, marginTop: 2 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.mapAddressLabel}>{t('selected_address')}</Text>
                                    <Text style={styles.mapAddressText} numberOfLines={2}>
                                        {mapLoading ? t('loading') : tempAddress || t('no_address_selected')}
                                    </Text>
                                </View>
                            </View>
                            
                            <TouchableOpacity
                                style={[styles.mapConfirmButton, mapLoading && { opacity: 0.7 }]}
                                onPress={handleConfirmMapLocation}
                                disabled={mapLoading}
                            >
                                <Ionicons name="checkmark-circle" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                                <Text style={styles.mapConfirmButtonText}>{t('confirm_location')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </Modal>

            {/* Main Location Input with Inline Autocomplete Dropdown */}
            <View style={styles.mainInputContainer}>
                <View style={styles.inputWrapper}>
                    <Ionicons
                        name="location-outline"
                        size={20}
                        color={COLORS.textSecondary}
                        style={styles.inputIcon}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder={finalPlaceholder}
                        placeholderTextColor={COLORS.textSecondary}
                        value={inlineSearchText}
                        onChangeText={handleInlineTextChange}
                        onFocus={() => {
                            if (inlineSearchResults.length > 0) setShowInlineDropdown(true);
                        }}
                        multiline={false}
                        returnKeyType="search"
                        onSubmitEditing={handleSearchLocation}
                    />
                    {inlineSearchLoading ? (
                        <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 6 }} />
                    ) : inlineSearchText && inlineSearchText.length > 0 ? (
                        <TouchableOpacity
                            onPress={() => {
                                setInlineSearchText('');
                                setInlineSearchResults([]);
                                setShowInlineDropdown(false);
                                onChangeLocation('', null, { city: '', state: '' });
                            }}
                            style={styles.searchIcon}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="close-circle-outline" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* Inline Dropdown Suggestions Card (In-flow expansion, never clipped) */}
                {showInlineDropdown && inlineSearchResults.length > 0 && (
                    <View style={styles.inlineDropdownCard}>
                        <View style={styles.dropdownHeaderBar}>
                            <View style={styles.dropdownHeaderTitleRow}>
                                <Ionicons name="compass-outline" size={14} color={COLORS.primary} style={{ marginRight: 5 }} />
                                <Text style={styles.dropdownHeaderText}>
                                    {inlineSearchResults.some(i => i.distanceText)
                                        ? `Nearby Locations (${inlineSearchResults.length})`
                                        : `Matching Locations (${inlineSearchResults.length})`}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowInlineDropdown(false)}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                                <Ionicons name="close" size={16} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            keyboardShouldPersistTaps="always"
                            nestedScrollEnabled={true}
                            showsVerticalScrollIndicator={true}
                            style={{ maxHeight: 260 }}
                        >
                            {inlineSearchResults.map((item, index) => (
                                <TouchableOpacity
                                    key={item.id || index}
                                    style={[
                                        styles.dropdownItem,
                                        index < inlineSearchResults.length - 1 && styles.dropdownItemBorder
                                    ]}
                                    onPress={() => handleSelectInlineLocation(item)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.dropdownIconBox}>
                                        <Ionicons name="location-sharp" size={16} color={COLORS.primary} />
                                    </View>
                                    <View style={styles.dropdownItemContent}>
                                        <View style={styles.dropdownItemTopRow}>
                                            <Text style={styles.dropdownItemTitle} numberOfLines={1}>{item.title}</Text>
                                            {item.distanceText ? (
                                                <View style={styles.distanceBadge}>
                                                    <Ionicons name="navigate-outline" size={10} color={COLORS.primary} style={{ marginRight: 3 }} />
                                                    <Text style={styles.distanceBadgeText}>{item.distanceText}</Text>
                                                </View>
                                            ) : null}
                                        </View>
                                        <Text style={styles.dropdownItemSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>

            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.gpsButton, loading && styles.gpsButtonLoading]}
                    onPress={handleGetLocation}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                        <>
                            <Ionicons name="navigate" size={18} color={COLORS.white} />
                            <Text style={styles.actionButtonText}>{t('gps')}</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={{ width: 12 }} />

                <TouchableOpacity
                    style={[styles.actionButton, styles.mapButton]}
                    onPress={handleOpenMap}
                    disabled={loading}
                >
                    <Ionicons name="map-outline" size={18} color={COLORS.white} />
                    <Text style={styles.actionButtonText}>{t('map')}</Text>
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
    mainInputContainer: {
        width: '100%',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 12,
        height: 48,
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
    inlineDropdownCard: {
        marginTop: 8,
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 5,
        overflow: 'hidden',
    },
    dropdownHeaderBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: COLORS.border + '30',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border + '60',
    },
    dropdownHeaderTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dropdownHeaderText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    dropdownIconBox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        marginTop: 2,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: COLORS.card,
    },
    dropdownItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border + '50',
    },
    dropdownItemContent: {
        flex: 1,
    },
    dropdownItemTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    distanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary + '18',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        marginLeft: 6,
    },
    distanceBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.primary,
    },
    dropdownItemTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        flex: 1,
    },
    dropdownItemSubtitle: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    buttonRow: {
        flexDirection: 'row',
        marginTop: 10,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 44,
        borderRadius: 12,
    },
    gpsButton: {
        backgroundColor: COLORS.secondary,
    },
    mapButton: {
        backgroundColor: COLORS.primary,
    },
    gpsButtonLoading: {
        opacity: 0.8,
    },
    actionButtonText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 14,
        marginLeft: 6,
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
    modalSafeArea: {
        flex: 1,
        backgroundColor: COLORS.primary,
    },
    mapContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        flexDirection: 'column',
    },
    modalTopHeader: {
        backgroundColor: COLORS.primary,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.15)',
        zIndex: 50,
        elevation: 6,
    },
    mapHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    mapHeaderTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    mapHeaderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    mapCloseButton: {
        padding: 4,
    },
    modalSearchSection: {
        paddingHorizontal: 14,
        paddingTop: 4,
    },
    modalSearchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    modalSearchInput: {
        flex: 1,
        fontSize: 14,
        color: COLORS.text,
        paddingVertical: 0,
        height: '100%',
    },
    modalDropdownCard: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        marginHorizontal: 14,
        marginTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    mapWrapper: {
        flex: 1,
        position: 'relative',
    },
    map: {
        flex: 1,
    },
    mapFooter: {
        backgroundColor: COLORS.card,
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingBottom: Platform.OS === 'ios' ? 24 : 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 6,
    },
    mapFooterAddressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    mapAddressLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    mapAddressText: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text,
        lineHeight: 20,
    },
    mapConfirmButton: {
        backgroundColor: COLORS.primary,
        height: 48,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 3,
    },
    mapConfirmButtonText: {
        color: COLORS.white,
        fontWeight: '700',
        fontSize: 16,
    },
});

export default LocationPicker;
