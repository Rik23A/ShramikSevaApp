import API from './api';

// Generate start work OTP (employer)
export const generateStartOtp = async (jobId, workerId) => {
    const response = await API.post(`/worklogs/job/${jobId}/worker/${workerId}/generate-start-otp`);
    return response.data;
};

// Generate end work OTP (employer)
export const generateEndOtp = async (jobId, workerId) => {
    const response = await API.post(`/worklogs/job/${jobId}/worker/${workerId}/generate-end-otp`);
    return response.data;
};

// Verify start work OTP (worker)
export const verifyStartOtp = async (jobId, workerId, otp) => {
    const response = await API.post(`/worklogs/job/${jobId}/worker/${workerId}/verify-start-otp`, { otp });
    return response.data;
};

// Verify end work OTP (worker)
export const verifyEndOtp = async (jobId, workerId, otp) => {
    const response = await API.post(`/worklogs/job/${jobId}/worker/${workerId}/verify-end-otp`, { otp });
    return response.data;
};

// Upload work photo
export const uploadWorkPhoto = async (jobId, workerId, photoData) => {
    const response = await API.put(`/worklogs/job/${jobId}/worker/${workerId}/photo`, photoData);
    return response.data;
};

// Get work logs for a job
export const getWorkLogs = async (jobId) => {
    const response = await API.get(`/worklogs/job/${jobId}/all`);
    return response.data;
};

// Get all work logs for worker (history)
export const getWorkerWorkLogs = async () => {
    const response = await API.get('/worklogs/worker');
    return response.data;
};
