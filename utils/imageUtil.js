import { API_URL } from '../constants/config';

/**
 * Get full image URL from relative path
 * @param {string} uri - Image URI (relative or absolute)
 * @returns {string} - Full image URL
 */
export const getFullImageUrl = (uri) => {
    if (!uri) return null;

    // Clean up URI
    let cleanUri = uri.trim();

    // Handle localhost URLs saved in DB (replace with actual API URL)
    // If DB has http://localhost:5000/uploads/..., we want to use API_URL instead
    // Handle localhost URLs saved in DB (replace with actual API URL)
    // If DB has http://localhost:5000/uploads/... or /http://localhost:5000/uploads/..., we want to use API_URL instead
    if (cleanUri.includes('localhost:5000')) {
        cleanUri = cleanUri.replace(/^(\/)?https?:\/\/localhost:5000/, '');
    }

    // If it's a remote URL (not localhost), return as is
    if (cleanUri.startsWith('http') || cleanUri.startsWith('file://')) return cleanUri;

    // Remove /api from API_URL if present to get base URL
    const BASE_URL = API_URL.replace('/api', '');

    // Ensure cleanUri starts with / (if not empty)
    const path = (cleanUri && !cleanUri.startsWith('/')) ? `/${cleanUri}` : cleanUri;

    return `${BASE_URL}${path}`;
};
