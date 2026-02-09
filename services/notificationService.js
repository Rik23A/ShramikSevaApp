import API from './api';

// Get notifications with pagination
export const getNotifications = async (params = {}) => {
    const response = await API.get('/notifications', { params });
    return response.data;
};

// Get unread notification count
export const getUnreadCount = async () => {
    const response = await API.get('/notifications/unread-count');
    return response.data;
};

// Mark notification as read
export const markAsRead = async (notificationId) => {
    const response = await API.put(`/notifications/${notificationId}/read`);
    return response.data;
};

// Mark all notifications as read
export const markAllAsRead = async () => {
    const response = await API.put('/notifications/mark-all-read');
    return response.data;
};

// Delete a notification
export const deleteNotification = async (notificationId) => {
    const response = await API.delete(`/notifications/${notificationId}`);
    return response.data;
};
