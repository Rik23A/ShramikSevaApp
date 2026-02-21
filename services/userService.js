import API from './api';

// Get current user profile
export const getProfile = async () => {
    const response = await API.get('/users/profile');
    return response.data;
};

// Update user profile
export const updateProfile = async (profileData) => {
    const response = await API.put('/users/profile', profileData);
    return response.data;
};

// Get public profile of a user
export const getPublicProfile = async (userId) => {
    const response = await API.get(`/users/profile/${userId}`);
    return response.data;
};

// Get worker dashboard
export const getWorkerDashboard = async () => {
    const response = await API.get('/users/dashboard/worker');
    return response.data;
};

// Get employer dashboard
export const getEmployerDashboard = async () => {
    const response = await API.get('/users/dashboard/employer');
    return response.data;
};

// Get employer analytics
export const getEmployerAnalytics = async () => {
    const response = await API.get('/users/dashboard/employer/analytics');
    return response.data;
};

// Search workers (employer only)
export const searchWorkers = async (params) => {
    const response = await API.get('/users/search/workers', { params });
    return response.data;
};

// Update company profile (employer)
export const updateCompanyProfile = async (userId, companyData) => {
    const response = await API.put(`/users/${userId}/company-profile`, companyData);
    return response.data;
};

// Get worker's completed jobs
export const getWorkerCompletedJobs = async (userId) => {
    const response = await API.get(`/users/${userId}/completed-jobs`);
    return response.data;
};

// Update user subscription
export const updateSubscription = async (subscriptionData) => {
    const response = await API.put('/users/subscription', subscriptionData);
    return response.data;
};

// Unlock worker profile (requires active subscription)
export const unlockWorkerProfile = async (workerId) => {
    const response = await API.post(`/users/workers/${workerId}/unlock`);
    return response.data;
};

// Get user documents
export const getUserDocuments = async () => {
    const response = await API.get('/documents');
    return response.data;
};

// Upload document metadata
export const uploadDocument = async (documentData) => {
    const response = await API.post('/documents', documentData);
    return response.data;
};
