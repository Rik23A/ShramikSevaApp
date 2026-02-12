import API from './api';

/**
 * Upload a document (Aadhaar, PAN, etc.)
 * @param {Object} documentData - { type, documentNumber, fileUrl }
 */
export const uploadDocument = async (documentData) => {
    const response = await API.post('/documents', documentData);
    return response.data;
};

/**
 * Get all documents for the current user
 */
export const getDocuments = async () => {
    const response = await API.get('/documents');
    return response.data;
};

/**
 * Update document verification status (Admin only)
 * @param {string} documentId - Document ID
 * @param {string} status - 'pending' | 'verified' | 'rejected'
 */
export const updateDocumentStatus = async (documentId, status) => {
    const response = await API.put(`/documents/${documentId}/status`, { status });
    return response.data;
};
