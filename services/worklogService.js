import API from './api';

/**
 * Get work log for a specific job (worker's current work log)
 */
export const getWorkLogByJob = async (jobId) => {
    try {
        const response = await API.get(`/worklogs/job/${jobId}`);
        return response.data;
    } catch (error) {
        if (error.response?.status !== 404) {
            console.error('Error fetching work log:', error);
        }
        throw error;
    }
};

/**
 * Generate start work OTP (worker initiates)
 */
export const generateStartOtp = async (jobId, workerId) => {
    try {
        const response = await API.post(`/worklogs/job/${jobId}/worker/${workerId}/generate-start-otp`);
        return response.data;
    } catch (error) {
        console.error('Error generating start OTP:', error);
        throw error;
    }
};

/**
 * Verify start work OTP (employer verifies)
 */
export const verifyStartOtp = async (jobId, workerId, otp) => {
    try {
        const response = await API.post(`/worklogs/job/${jobId}/worker/${workerId}/verify-start-otp`, { otp });
        return response.data;
    } catch (error) {
        console.error('Error verifying start OTP:', error);
        throw error;
    }
};

/**
 * Generate end work OTP (worker initiates)
 */
export const generateEndOtp = async (jobId, workerId) => {
    try {
        const response = await API.post(`/worklogs/job/${jobId}/worker/${workerId}/generate-end-otp`);
        return response.data;
    } catch (error) {
        console.error('Error generating end OTP:', error);
        throw error;
    }
};

/**
 * Verify end work OTP (employer verifies)
 */
export const verifyEndOtp = async (jobId, workerId, otp) => {
    try {
        const response = await API.post(`/worklogs/job/${jobId}/worker/${workerId}/verify-end-otp`, { otp });
        return response.data;
    } catch (error) {
        console.error('Error verifying end OTP:', error);
        throw error;
    }
};

/**
 * Upload work photo (start or end)
 */
export const uploadWorkPhoto = async (jobId, workerId, type, photoUrl, location) => {
    try {
        const response = await API.put(`/worklogs/job/${jobId}/worker/${workerId}/photo`, {
            type,
            photoUrl,
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address,
        });
        return response.data;
    } catch (error) {
        console.error('Error uploading work photo:', error);
        throw error;
    }
};

/**
 * Get all work logs for a specific job
 */
export const getWorkLogsByJob = async (jobId) => {
    try {
        const response = await API.get(`/worklogs/job/${jobId}/all`);
        return response.data;
    } catch (error) {
        console.error('Error fetching job work logs:', error);
        throw error;
    }
};

/**
 * Get all work logs for the current worker
 */
export const getWorkerWorkLogs = async () => {
    try {
        const response = await API.get('/worklogs/worker');
        return response.data;
    } catch (error) {
        console.error('Error fetching worker work logs:', error);
        throw error;
    }
};
