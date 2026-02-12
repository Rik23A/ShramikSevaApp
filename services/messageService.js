import API from './api';

// Get all conversations for a user
export const getConversations = async (userId) => {
    const response = await API.get(`/conversations/${userId}`);
    return response.data;
};

// Get a single conversation
export const getConversationById = async (conversationId) => {
    const response = await API.get(`/conversations/details/${conversationId}`);
    return response.data;
};

// Create a new conversation
export const createConversation = async (senderId, receiverId) => {
    const response = await API.post('/conversations', { senderId, receiverId });
    return response.data;
};

// Get messages for a conversation
export const getMessages = async (conversationId) => {
    const response = await API.get(`/messages/${conversationId}`);
    return response.data;
};

// Send a message
export const sendMessage = async (conversationId, sender, text) => {
    const response = await API.post('/messages', { conversationId, sender, text });
    return response.data;
};

// Mark messages as read
export const markMessagesAsRead = async (conversationId) => {
    const response = await API.put(`/messages/${conversationId}/read`);
    return response.data;
};
