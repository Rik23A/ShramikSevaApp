import API from './api';

/**
 * Upload a file to the server
 * @param {Object} file - File object from React Native file picker
 * @param {Function} onUploadProgress - Progress callback (optional)
 */
export const uploadFile = async (file, onUploadProgress) => {
    const formData = new FormData();

    // Handle React Native file structure
    formData.append('file', {
        uri: file.uri,
        type: file.type || 'image/jpeg',
        name: file.name || 'upload.jpg',
    });

    const response = await API.post('/upload', formData, {
        headers: {
            'Accept': 'application/json',
        },
        onUploadProgress: onUploadProgress ? (progressEvent) => {
            const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
            );
            onUploadProgress(percentCompleted);
        } : undefined,
    });

    return response.data;
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
