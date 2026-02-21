import API from './api';

// Initiate registration - sends OTP
export const initiateRegistration = async (userData) => {
    const response = await API.post('/users/initiate-register', userData);
    return response.data;
};

// Complete registration - verify OTP
export const completeRegistration = async (mobile, otp) => {
    const response = await API.post('/users/complete-register', { mobile, otp });
    return response.data;
};

// Request OTP for login
export const requestOtp = async (mobile) => {
    const response = await API.post('/auth/request-otp', { mobile });
    return response.data;
};

// Login with email and password
export const loginUser = async (email, password) => {
    const response = await API.post('/users/login', { email, password });
    return response.data;
};

// Verify OTP and login
export const verifyOtp = async (mobile, otp) => {
    const response = await API.post('/auth/verify-otp', { mobile, otp });
    return response.data;
};

// Firebase OTP verification (alternative)
export const verifyFirebaseOtp = async (firebaseToken) => {
    const response = await API.post('/auth/verify-firebase-otp', { firebaseToken });
    return response.data;
};
