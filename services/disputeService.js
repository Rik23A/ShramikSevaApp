import API from './api';

/**
 * Create a dispute
 * @param {Object} disputeData - { jobId, description, category }
 */
export const createDispute = async (disputeData) => {
    const response = await API.post('/disputes', disputeData);
    return response.data;
};

/**
 * Get all disputes for the current user
 */
export const getMyDisputes = async () => {
    const response = await API.get('/disputes');
    return response.data;
};

/**
 * Resolve a dispute (Admin only)
 * @param {string} disputeId - Dispute ID
 * @param {Object} resolution - { resolution, resolvedBy }
 */
export const resolveDispute = async (disputeId, resolution) => {
    const response = await API.put(`/disputes/${disputeId}/resolve`, resolution);
    return response.data;
};
