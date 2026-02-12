import API from './api';

// Get all jobs with optional filters
export const getJobs = async (params = {}) => {
    const response = await API.get('/jobs', { params });
    return response.data;
};

// Get single job by ID
export const getJobById = async (jobId) => {
    const response = await API.get(`/jobs/${jobId}`);
    return response.data;
};

// Create a new job (employer)
export const createJob = async (jobData) => {
    const response = await API.post('/jobs', jobData);
    return response.data;
};

// Update a job
export const updateJob = async (jobId, jobData) => {
    const response = await API.put(`/jobs/${jobId}`, jobData);
    return response.data;
};

// Apply to a job (worker)
export const applyToJob = async (jobId) => {
    const response = await API.post(`/jobs/${jobId}/apply`);
    return response.data;
};

// Get assigned jobs (worker)
export const getAssignedJobs = async () => {
    const response = await API.get('/jobs/assigned');
    return response.data;
};

// Get hired jobs (employer)
export const getHiredJobs = async () => {
    const response = await API.get('/jobs/hired');
    return response.data;
};

// Get employer's own jobs
export const getMyJobs = async () => {
    const response = await API.get('/jobs/my-jobs');
    return response.data;
};

// Hire a worker for a job (employer)
export const hireWorker = async (jobId, workerId) => {
    const response = await API.put(`/jobs/${jobId}/hire/${workerId}`);
    return response.data;
};

// Reject an applicant (employer)
export const rejectApplicant = async (jobId, applicantId) => {
    const response = await API.post(`/jobs/${jobId}/applicants/${applicantId}/reject`);
    return response.data;
};

// Get hiring requests (worker)
export const getHiringRequests = async () => {
    const response = await API.get('/jobs/hiring-requests');
    return response.data;
};

// Accept hiring request (worker)
export const acceptHiringRequest = async (applicationId) => {
    const response = await API.put(`/jobs/hiring-requests/${applicationId}/accept`);
    return response.data;
};

// Reject hiring request (worker)
export const rejectHiringRequest = async (applicationId) => {
    const response = await API.put(`/jobs/hiring-requests/${applicationId}/reject`);
    return response.data;
};

// Get completed jobs (worker)
export const getCompletedJobs = async () => {
    // Note: This endpoint requires user ID in the route, but the backend will get it from the auth token
    // The actual route is /users/:userId/completed-jobs but we need to get current user ID first
    // For now, using the assigned jobs endpoint which filters by status
    const response = await API.get('/jobs/assigned');
    return response.data.filter(job => job.status === 'completed');
};
// Close a job (employer)
export const closeJob = async (jobId) => {
    const response = await API.put(`/jobs/${jobId}`, { status: 'closed' });
    return response.data;
};

// Update job location (requires active subscription)
export const updateJobLocation = async (jobId, locationData) => {
    const response = await API.patch(`/jobs/${jobId}/location`, locationData);
    return response.data;
};
