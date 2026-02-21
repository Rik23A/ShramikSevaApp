import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    Platform,
    Modal,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import * as Haptics from 'expo-haptics';
import { uploadFile } from '../../services/uploadService';
import ViewShot from 'react-native-view-shot';

/**
 * Photo Capture Component
 * Handles camera permissions, photo capture, location capture, and upload
 */
const PhotoCapture = ({ onPhotoUploaded, type = 'start' }) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [locationPermission, setLocationPermission] = useState(null);
    const [capturedPhoto, setCapturedPhoto] = useState(null);
    const [location, setLocation] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [facing, setFacing] = useState('back');
    const cameraRef = useRef(null);
    const viewShotRef = useRef(null);

    useEffect(() => {
        requestLocationPermission();
    }, []);

    const toggleCameraFacing = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const requestLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationPermission(status === 'granted');

            if (status !== 'granted') {
                Alert.alert(
                    'Location Permission Required',
                    'Please enable location access to capture work photos.',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('Error requesting location permission:', error);
        }
    };

    const getCurrentLocation = async () => {
        try {
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            const address = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            });

            return {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                accuracy: loc.coords.accuracy,
                timestamp: loc.timestamp || Date.now(),
                address: address[0] ?
                    `${address[0].street || ''}, ${address[0].city || ''}, ${address[0].region || ''}, ${address[0].postalCode || ''}`.trim() :
                    'Unknown location',
            };
        } catch (error) {
            console.error('Error getting location:', error);
            throw new Error('Failed to get current location');
        }
    };

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    const handleOpenCamera = async () => {
        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert(
                    'Camera Permission Required',
                    'Please enable camera access to capture work photos.',
                    [{ text: 'OK' }]
                );
                return;
            }
        }

        if (!locationPermission) {
            await requestLocationPermission();
            return;
        }

        setShowCamera(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleTakePhoto = async () => {
        if (!cameraRef.current) return;

        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.7,
                base64: false,
            });

            const currentLocation = await getCurrentLocation();

            setCapturedPhoto(photo.uri);
            setLocation(currentLocation);
            setShowCamera(false);
        } catch (error) {
            console.error('Error taking photo:', error);
            Alert.alert('Error', 'Failed to capture photo. Please try again.');
        }
    };

    const handleRetake = () => {
        setCapturedPhoto(null);
        setLocation(null);
        setShowCamera(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleUpload = async () => {
        if (!capturedPhoto || !location) {
            Alert.alert('Error', 'Please capture a photo first');
            return;
        }

        setUploading(true);
        try {
            // Capture the view with overlay
            const watermarkedUri = await viewShotRef.current.capture();

            // Upload image to server
            // Construct a file object that uploadFile expects
            const fileObj = {
                uri: watermarkedUri,
                type: 'image/jpeg',
                name: `worklog-${type}-${Date.now()}.jpg`
            };

            const result = await uploadFile(fileObj);
            const photoUrl = result.fileUrl;

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Call parent callback with photo URL and location
            onPhotoUploaded({
                photoUrl,
                location: {
                    ...location,
                    timestamp: location.timestamp
                },
            });
        } catch (error) {
            console.error('Error uploading photo:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Upload Failed', error.message || 'Failed to upload photo. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Modal
                visible={showCamera}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setShowCamera(false)}
            >
                <View style={styles.cameraContainer}>
                    <CameraView
                        ref={cameraRef}
                        style={styles.camera}
                        facing={facing}
                    >
                        <View style={styles.cameraOverlay}>
                            <View style={styles.cameraHeader}>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => setShowCamera(false)}
                                >
                                    <Ionicons name="close" size={28} color={COLORS.white} />
                                </TouchableOpacity>
                                <Text style={styles.cameraTitle}>
                                    {type === 'start' ? 'Start Work Photo' : 'End Work Photo'}
                                </Text>
                            </View>

                            <View style={styles.cameraFooter}>
                                <TouchableOpacity
                                    style={styles.switchButton}
                                    onPress={toggleCameraFacing}
                                >
                                    <Ionicons name="camera-reverse" size={32} color={COLORS.white} />
                                </TouchableOpacity>

                                <View style={styles.captureButtonContainer}>
                                    <TouchableOpacity
                                        style={styles.captureButton}
                                        onPress={handleTakePhoto}
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.captureButtonInner} />
                                    </TouchableOpacity>
                                </View>

                                <View style={{ width: 40 }} />
                            </View>
                        </View>
                    </CameraView>
                </View>
            </Modal>

            {capturedPhoto ? (
                <View style={styles.previewContainer}>
                    <Text style={styles.previewTitle}>Photo Preview</Text>

                    <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.8 }} style={{ marginBottom: 16 }}>
                        <View style={styles.imageContainer}>
                            <Image source={{ uri: capturedPhoto }} style={styles.previewImage} />
                            {location && (
                                <View style={styles.imageOverlay}>
                                    <View style={styles.overlayRow}>
                                        <Ionicons name="location" size={14} color={COLORS.white} />
                                        <Text style={styles.overlayText}>
                                            {location.address}
                                        </Text>
                                    </View>
                                    <View style={styles.overlayRow}>
                                        <Ionicons name="time" size={14} color={COLORS.white} />
                                        <Text style={styles.overlayText}>
                                            {formatTimestamp(location.timestamp)}
                                        </Text>
                                    </View>
                                    <View style={styles.overlayRow}>
                                        <Ionicons name="navigate" size={14} color={COLORS.white} />
                                        <Text style={styles.overlayText}>
                                            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </ViewShot>

                    {location && (
                        <View style={styles.locationCard}>
                            <Ionicons name="location" size={20} color={COLORS.primary} />
                            <View style={styles.locationInfo}>
                                <Text style={styles.locationLabel}>Captured at:</Text>
                                <Text style={styles.locationText}>{location.address}</Text>
                                <Text style={styles.coordinatesText}>
                                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                </Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={styles.retakeButton}
                            onPress={handleRetake}
                            disabled={uploading}
                        >
                            <Ionicons name="camera-reverse" size={20} color={COLORS.textPrimary} />
                            <Text style={styles.retakeButtonText}>Retake</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                            onPress={handleUpload}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <>
                                    <Ionicons name="cloud-upload" size={20} color={COLORS.white} />
                                    <Text style={styles.uploadButtonText}>Upload</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <TouchableOpacity
                    style={styles.captureCard}
                    onPress={handleOpenCamera}
                    activeOpacity={0.7}
                >
                    <View style={styles.iconContainer}>
                        <Ionicons name="camera" size={48} color={COLORS.primary} />
                    </View>
                    <Text style={styles.captureTitle}>
                        Capture {type === 'start' ? 'Start' : 'End'} Work Photo
                    </Text>
                    <Text style={styles.captureSubtitle}>
                        Photo will include your current location
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 16,
    },
    captureCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.primary,
        borderStyle: 'dashed',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    captureTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    captureSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    cameraContainer: {
        flex: 1,
        backgroundColor: COLORS.black,
    },
    camera: {
        flex: 1,
    },
    cameraOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'space-between',
    },
    cameraHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cameraTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.white,
        textAlign: 'center',
        marginRight: 40,
    },
    cameraFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 30,
        paddingBottom: 40,
    },
    switchButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureButtonContainer: {
        alignItems: 'center',
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: COLORS.white,
    },
    captureButtonInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.white,
    },
    previewContainer: {
        marginVertical: 16,
    },
    previewTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 16,
    },
    imageContainer: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    previewImage: {
        width: '100%',
        height: 300,
        resizeMode: 'cover',
    },
    locationCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    locationInfo: {
        flex: 1,
        marginLeft: 12,
    },
    locationLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    locationText: {
        fontSize: 14,
        color: COLORS.textPrimary,
        fontWeight: '500',
        marginBottom: 4,
    },
    coordinatesText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontFamily: 'monospace',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    retakeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 12,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 8,
    },
    retakeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    uploadButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 14,
        gap: 8,
    },
    uploadButtonDisabled: {
        opacity: 0.6,
    },
    uploadButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 12,
    },
    overlayRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 4,
        gap: 8,
    },
    overlayText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: '500',
        flex: 1,
    },
});

export default PhotoCapture;
