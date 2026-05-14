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
export const sendMessage = async (conversationId, sender, text, clientMessageId = null) => {
    const payload = { conversationId, sender, text };
    if (clientMessageId) {
        payload.clientMessageId = clientMessageId;
    }
    const response = await API.post('/messages', payload);
    return response.data;
};

// Mark messages as read
export const markMessagesAsRead = async (conversationId) => {
    const response = await API.put(`/messages/${conversationId}/read`);
    return response.data;
};

// Translate text
export const translateText = async (text, targetLang, sourceLang = 'en') => {
    if (!text || !targetLang || targetLang === 'en') return text;
    try {
        const response = await API.post('/translate', { text, targetLang, sourceLang });
        return response.data?.translation || text;
    } catch (error) {
        console.error('Translation error:', error);
        return text;
    }
};
