import api from './api';

/**
 * Get available subscription plans
 */
export const getSubscriptionPlans = async () => {
    const response = await api.get('/payments/plans');
    return response.data;
};

/**
 * Get current active subscription for logged-in employer
 */
export const getCurrentSubscription = async () => {
    const response = await api.get('/payments/current');
    return response.data;
};

/**
 * Check if employer can post a job
 */
export const canPostJob = async () => {
    const response = await api.get('/payments/can-post');
    return response.data;
};

/**
 * Purchase a subscription plan
 * @param {string} planId - The plan ID to purchase
 * @param {string} paymentId - Payment transaction ID (optional for demo)
 */
export const purchaseSubscription = async (planId, paymentId = null) => {
    const response = await api.post('/payments/subscribe', { plan: planId, paymentId });
    return response.data;
};

/**
 * Purchase worklog addon
 * @param {Object} addonData - Addon purchase data
 */
export const purchaseWorklogAddon = async (addonData) => {
    const response = await api.post('/payments/addon', addonData);
    return response.data;
};

/**
 * Generate an invoice
 * @param {Object} invoiceData - Invoice generation data
 */
export const generateInvoice = async (invoiceData) => {
    const response = await api.post('/payments/generate-invoice', invoiceData);
    return response.data;
};

/**
 * Get all invoices for the current user
 */
export const getInvoices = async () => {
    const response = await api.get('/payments/invoices');
    return response.data;
};

/**
 * Get a specific invoice by ID
 * @param {string} invoiceId - Invoice ID
 */
export const getInvoiceById = async (invoiceId) => {
    const response = await api.get(`/payments/invoices/${invoiceId}`);
    return response.data;
};

/**
 * Download invoice PDF
 * @param {string} invoiceId - Invoice ID
 */
export const downloadInvoice = async (invoiceId) => {
    const response = await api.get(`/payments/invoices/${invoiceId}/download`, {
        responseType: 'blob'
    });
    return response.data;
};
