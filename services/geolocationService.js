import API from './api';

/**
 * Reverse geocode coordinates to get address
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 */
export const reverseGeocode = async (latitude, longitude) => {
    const response = await API.get('/geolocation/reverse', {
        params: { latitude, longitude }
    });
    return response.data;
};

/**
 * Update worker's current location for a job
 * @param {string} workerId - Worker ID
 * @param {string} jobId - Job ID
 * @param {Object} locationData - { latitude, longitude, timestamp }
 */
export const updateWorkerLocation = async (workerId, jobId, locationData) => {
    const response = await API.post(
        `/geolocation/worker/${workerId}/job/${jobId}/location`,
        locationData
    );
    return response.data;
};

/**
 * Get worker's latest location for a job
 * @param {string} workerId - Worker ID
 * @param {string} jobId - Job ID
 */
export const getWorkerLatestLocation = async (workerId, jobId) => {
    const response = await API.get(
        `/geolocation/worker/${workerId}/job/${jobId}/latest`
    );
    return response.data;
};

/**
 * Get worker's route history for a job
 * @param {string} workerId - Worker ID
 * @param {string} jobId - Job ID
 */
export const getWorkerRoute = async (workerId, jobId) => {
    const response = await API.get(
        `/geolocation/worker/${workerId}/job/${jobId}/route`
    );
    return response.data;
};

/**
 * Calculate route between two points
 * @param {Object} origin - { latitude, longitude }
 * @param {Object} destination - { latitude, longitude }
 */
export const calculateRoute = async (origin, destination) => {
    const response = await API.get('/geolocation/calculate-route', {
        params: {
            origin: `${origin.latitude},${origin.longitude}`,
            destination: `${destination.latitude},${destination.longitude}`
        }
    });
    return response.data;
};
