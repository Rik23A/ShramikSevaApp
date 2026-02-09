// Environment configuration for Shramik Seva App
// Change API_URL based on your testing environment:
// - Web Browser: http://localhost:5000/api
// - Android Emulator: http://10.0.2.2:5000/api
// - Physical Device: http://YOUR_MACHINE_IP:5000/api
// - Production: https://your-production-url.com/api

export const API_URL = 'http://192.168.1.11:5000/api';

// Worker Types from backend
export const WORKER_TYPES = [
    'Security guards',
    'Welders',
    'Plumbers',
    'Carpenters',
    'Electricians',
    'Housekeepers',
    'Rajmistri (Masons)',
    'Any skilled/unskilled workers',
];

// Work types
export const WORK_TYPES = ['permanent', 'temporary'];

// Availability statuses
export const AVAILABILITY = ['available', 'unavailable'];

// Business Types for Employer Registration (WorkIndia Style)
export const BUSINESS_TYPES = [
    'IT/Software',
    'Manufacturing',
    'Construction',
    'Retail',
    'Hospitality',
    'Healthcare',
    'Education',
    'Transportation',
    'Real Estate',
    'Staffing Agency',
    'Other'
];

// Employee Count Ranges
export const EMPLOYEE_COUNTS = [
    '1-10',
    '11-50',
    '51-200',
    '201-500',
    '500+'
];

// Indian States
export const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
    'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
    'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
    'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
    'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Jammu and Kashmir', 'Ladakh'
];

// App Colors - Blue Theme for Job Holders
export const COLORS = {
    // Primary Blue Palette
    primary: '#1976D2',
    primaryDark: '#1565C0',
    primaryLight: '#42A5F5',
    primaryGradientStart: '#1976D2',
    primaryGradientEnd: '#2196F3',

    // Secondary & Accent
    secondary: '#0D47A1',
    accent: '#64B5F6',

    // Status Colors
    success: '#4CAF50',
    successLight: '#E8F5E9',
    warning: '#FF9800',
    warningLight: '#FFF3E0',
    danger: '#F44336',
    dangerLight: '#FFEBEE',
    info: '#03A9F4',
    infoLight: '#E1F5FE',

    // Background & Surface
    background: '#F5F8FC',
    backgroundDark: '#E8EEF5',
    card: '#FFFFFF',
    cardElevated: '#FAFCFF',

    // Text Colors
    text: '#1A1A2E',
    textSecondary: '#64748B',
    textLight: '#94A3B8',
    textOnPrimary: '#FFFFFF',

    // Border & Divider
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    divider: '#E8EEF5',

    // Common
    white: '#FFFFFF',
    black: '#000000',
    overlay: 'rgba(0, 0, 0, 0.5)',

    // Gradient Colors
    gradientBlue: ['#1976D2', '#2196F3', '#42A5F5'],
    gradientSuccess: ['#43A047', '#66BB6A'],
    gradientDanger: ['#E53935', '#EF5350'],
};

export const FONTS = {
    regular: 'System',
    medium: 'System',
    bold: 'System',
};
