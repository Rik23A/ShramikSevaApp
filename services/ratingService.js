import API from './api';

/**
 * Create a rating for a job
 * @param {Object} ratingData - { jobId, ratedUser, rating, review }
 */
export const createRating = async (ratingData) => {
    const response = await API.post('/ratings', ratingData);
    return response.data;
};

/**
 * Get pending rating prompts for the current user
 * Returns jobs that need to be rated
 */
export const getPendingRatingPrompts = async () => {
    const response = await API.get('/ratings/pending-prompts');
    return response.data;
};
