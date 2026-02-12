import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import { getFullImageUrl } from '../../utils/imageUtil';

export default function ProfileImagePicker({ imageUri, onImageSelected, size = 100, editable = true }) {
    const pickImage = async () => {
        try {
            // Request permissions
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Please grant camera roll permissions to upload a photo.'
                );
                return;
            }

            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                onImageSelected(result.assets[0]);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const takePhoto = async () => {
        try {
            // Request permissions
            const { status } = await ImagePicker.requestCameraPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Please grant camera permissions to take a photo.'
                );
                return;
            }

            // Launch camera
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                onImageSelected(result.assets[0]);
            }
        } catch (error) {
            console.error('Error taking photo:', error);
            Alert.alert('Error', 'Failed to take photo');
        }
    };

    const showImageOptions = () => {
        Alert.alert(
            'Profile Photo',
            'Choose an option',
            [
                {
                    text: 'Take Photo',
                    onPress: takePhoto,
                },
                {
                    text: 'Choose from Library',
                    onPress: pickImage,
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
            ]
        );
    };

    // Use shared utility for image URL resolution
    const processedImageUri = imageUri ? getFullImageUrl(imageUri) : null;

    return (
        <TouchableOpacity
            style={[styles.container, { width: size, height: size }]}
            onPress={editable ? showImageOptions : null}
            activeOpacity={editable ? 0.7 : 1}
        >
            {imageUri ? (
                <Image source={{ uri: processedImageUri }} style={styles.image} />
            ) : (
                <View style={[styles.placeholder, { width: size, height: size }]}>
                    <Ionicons name="person" size={size * 0.4} color={COLORS.textSecondary} />
                </View>
            )}

            {editable && (
                <View style={styles.editBadge}>
                    <Ionicons name="camera" size={16} color={COLORS.white} />
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        borderRadius: 100,
        overflow: 'hidden',
        backgroundColor: COLORS.background, // Ensure background for transparent images
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: 100,
        resizeMode: 'cover',
    },
    placeholder: {
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 100,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.white,
    },
});
