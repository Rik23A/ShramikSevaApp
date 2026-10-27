import api from './api';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getToken } from '../utils/storage';
import { API_URL } from '../constants/config';

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
 * Get pricing preview (including tax and credits)
 * @param {string} planId - The plan ID to preview
 */
export const getPaymentPreview = async (planId) => {
    const response = await api.get(`/payments/preview?planId=${planId}`);
    return response.data;
};

/**
 * Generate an invoice (dead endpoint — removed)
 * @deprecated No /payments/generate-invoice backend route exists.
 */
// export const generateInvoice = async () => {};


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
 * Download invoice PDF and open system share sheet.
 * Uses expo-file-system so the file is saved to device storage,
 * then expo-sharing opens the native share / open-with dialog.
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<string>} Local file URI
 */
export const downloadInvoice = async (invoiceId) => {
    const token = await getToken();
    const url = `${API_URL}/payments/invoices/${invoiceId}/download`;
    const fileUri = FileSystem.documentDirectory + `invoice_${invoiceId}.pdf`;

    const downloadResult = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (downloadResult.status !== 200) {
        throw new Error('Failed to download invoice. Please try again.');
    }

    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Open or save your invoice',
            UTI: 'com.adobe.pdf',
        });
    }

    return downloadResult.uri;
};
