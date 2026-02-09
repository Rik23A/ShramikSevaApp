import api from './api';

/**
 * Get available subscription plans
 */
export const getSubscriptionPlans = async () => {
    const response = await api.get('/subscriptions/plans');
    return response.data;
};

/**
 * Get current active subscription for logged-in employer
 */
export const getCurrentSubscription = async () => {
    const response = await api.get('/subscriptions/current');
    return response.data;
};

/**
 * Check if employer can post a job
 */
export const canPostJob = async () => {
    const response = await api.get('/subscriptions/can-post');
    return response.data;
};

/**
 * Purchase a subscription plan
 * @param {string} planId - The plan ID to purchase
 * @param {string} paymentId - Payment transaction ID (optional for demo)
 */
export const purchaseSubscription = async (planId, paymentId = null) => {
    const response = await api.post('/subscriptions', { planId, paymentId });
    return response.data;
};
