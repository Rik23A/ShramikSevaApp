import API from './api';

// Get worker's applications
export const getWorkerApplications = async () => {
    const response = await API.get('/applications/worker');
    return response.data;
};

// Get applications for a specific job (employer)
export const getApplicationsForJob = async (jobId) => {
    const response = await API.get(`/applications/job/${jobId}`);
    return response.data;
};

// Get all applications for employer
export const getAllEmployerApplications = async () => {
    const response = await API.get('/applications/employer');
    return response.data;
};

// Create application (apply to job)
export const createApplication = async (jobId) => {
    const response = await API.post(`/applications/${jobId}`);
    return response.data;
};
