import API from './api';
import { getToken } from '../utils/storage';
import { API_URL } from '../constants/config';

/**
 * Upload a file to the server
 * @param {Object} file - File object from React Native file picker
 * @param {Function} onUploadProgress - Progress callback (optional)
 */
export const uploadFile = async (file, onUploadProgress) => {
    const formData = new FormData();

    // Determine correct MIME type (Expo Image Picker returns 'image' which is not a valid MIME type)
    const getMimeType = (file) => {
        if (file.mimeType) return file.mimeType;
        if (file.type === 'image') return 'image/jpeg'; // Default for images
        if (file.type === 'video') return 'video/mp4';  // Default for videos
        return file.type || 'image/jpeg'; // Fallback
    };

    const fileType = getMimeType(file);
    const fileName = file.name || file.fileName || `upload-${Date.now()}.jpg`;

    // Handle React Native file structure
    formData.append('file', {
        uri: file.uri,
        type: fileType,
        name: fileName,
    });

    const token = await getToken();
    console.log('Uploading file:', {
        uri: file.uri,
        type: file.type,
        name: file.name
    });
    console.log('Upload Target:', `${API_URL}/upload`);

    try {
        // Use fetch instead of Axios for better multipart handling in RN
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Accept': 'application/json',
                // Important: Do NOT set Content-Type header, let fetch set it with boundary
            },
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Upload failed');
        }

        return result;
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
};

/**
 * Upload multiple files
 * @param {Array} files - Array of file objects
 * @param {Function} onUploadProgress - Progress callback (optional)
 */
export const uploadMultipleFiles = async (files, onUploadProgress) => {
    const uploadPromises = files.map(file => uploadFile(file, onUploadProgress));
    const results = await Promise.all(uploadPromises);
    return results;
};
