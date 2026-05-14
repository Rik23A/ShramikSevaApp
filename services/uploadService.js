import API from './api';
import { API_URL } from '../constants/config';

/**
 * Upload a file to the server
 * @param {Object} file - File object from React Native file picker
 * @param {Function} onUploadProgress - Progress callback (optional)
 */
export const uploadFile = async (file, onUploadProgress) => {
    const formData = new FormData();

    // Determine correct MIME type
    const getMimeType = (file) => {
        if (file.mimeType) return file.mimeType;
        if (file.type === 'image') return 'image/jpeg';
        if (file.type === 'video') return 'video/mp4';
        return file.type || 'application/octet-stream';
    };

    const fileType = getMimeType(file);
    const fileName = file.name || file.fileName || `upload-${Date.now()}`;

    // Handle React Native file structure
    formData.append('file', {
        uri: file.uri,
        type: fileType,
        name: fileName,
    });

    if (__DEV__) {
        console.log('[Upload] Target:', `${API_URL}/upload`);
        console.log('[Upload] File Info:', { uri: file.uri, type: fileType, name: fileName });
    }

    try {
        const response = await API.post('/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (onUploadProgress) {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onUploadProgress(progress);
                }
            },
        });

        return response.data;
    } catch (error) {
        console.error('Upload error:', error.response?.data || error.message);
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
