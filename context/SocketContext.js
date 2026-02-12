import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import { API_URL } from '../constants/config';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getToken } from '../utils/storage';
import * as Notifications from 'expo-notifications';

const SocketContext = createContext();

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const { showToast } = useToast();
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const { user } = useAuth();
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;

    useEffect(() => {
        console.log('Socket Context: User state changed:', user ? user._id : 'No User');
        if (!user) {
            // Disconnect socket if user logs out
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setConnected(false);
            }
            return;
        }

        const initializeSocket = async () => {
            try {
                // Get auth token
                const token = await getToken();
                console.log('Socket Context: Token retrieved:', token ? 'Yes' : 'No');

                if (!token) {
                    console.log('No token found, skipping socket connection');
                    return;
                }

                // Create socket connection - use base URL without /api
                const socketUrl = API_URL.replace('/api', '');
                console.log('Socket Context: Connecting to:', socketUrl);

                const newSocket = io(socketUrl, {
                    auth: { token },
                    transports: ['websocket', 'polling'],
                    reconnection: true,
                    reconnectionDelay: 1000,
                    reconnectionDelayMax: 5000,
                    reconnectionAttempts: maxReconnectAttempts,
                });

                // Connection events
                newSocket.on('connect', () => {
                    console.log('✅ Socket connected:', newSocket.id);
                    setConnected(true);
                    reconnectAttempts.current = 0;

                    // Join user's personal room
                    newSocket.emit('joinUserRoom', `user:${user._id}`);
                });

                // Listen for new notifications to trigger local notification
                newSocket.on('notification:new', async (notification) => {
                    console.log('🔔 Socket Notification Received:', notification);

                    if (AppState.currentState === 'active') {
                        // Show in-app toast matching frontend types
                        let toastType = 'info';
                        if (notification.type.includes('success') || notification.type.includes('hired') || notification.type.includes('accepted')) toastType = 'success';
                        else if (notification.type.includes('error') || notification.type.includes('rejected')) toastType = 'error';
                        else if (notification.type.includes('warning') || notification.type.includes('pending')) toastType = 'warning';

                        showToast({
                            type: toastType,
                            title: notification.title,
                            message: notification.message,
                            action: notification.actionUrl ? {
                                label: 'View',
                                url: notification.actionUrl // Toast component handles this
                            } : undefined
                        });
                    } else {
                        // Background: Show system notification
                        try {
                            await Notifications.scheduleNotificationAsync({
                                content: {
                                    title: notification.title,
                                    body: notification.message,
                                    data: { actionUrl: notification.actionUrl, relatedId: notification.relatedId, type: notification.type },
                                },
                                trigger: null, // Show immediately
                            });
                        } catch (error) {
                            console.error('Error scheduling local notification:', error);
                        }
                    }
                });

                newSocket.on('disconnect', (reason) => {
                    console.log('❌ Socket disconnected:', reason);
                    setConnected(false);
                });

                newSocket.on('connect_error', (error) => {
                    console.log('⚠️  Socket connection error:', error.message);
                    reconnectAttempts.current += 1;

                    if (reconnectAttempts.current >= maxReconnectAttempts) {
                        console.log('Max reconnection attempts reached');
                        newSocket.disconnect();
                    }
                });

                newSocket.on('reconnect', (attemptNumber) => {
                    console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
                    reconnectAttempts.current = 0;
                });

                // Online status events
                newSocket.on('user:online', ({ userId }) => {
                    setOnlineUsers(prev => new Set([...prev, userId]));
                });

                newSocket.on('user:offline', ({ userId }) => {
                    setOnlineUsers(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(userId);
                        return newSet;
                    });
                });

                setSocket(newSocket);

                // Cleanup on unmount
                return () => {
                    newSocket.disconnect();
                };
            } catch (error) {
                console.error('Error initializing socket:', error);
            }
        };

        initializeSocket();

        // Cleanup function
        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, [user]);

    // Helper functions
    const emitTypingStart = (conversationId, receiverId) => {
        if (socket && connected) {
            socket.emit('typing:start', { conversationId, receiverId });
        }
    };

    const emitTypingStop = (conversationId, receiverId) => {
        if (socket && connected) {
            socket.emit('typing:stop', { conversationId, receiverId });
        }
    };

    const joinConversation = (conversationId) => {
        if (socket && connected) {
            socket.emit('joinConversation', conversationId);
        }
    };

    const leaveConversation = (conversationId) => {
        if (socket && connected) {
            socket.emit('leaveConversation', conversationId);
        }
    };

    const markMessageAsRead = (messageId, conversationId, senderId) => {
        if (socket && connected) {
            socket.emit('message:read', { messageId, conversationId, senderId });
        }
    };

    const getOnlineStatus = (userIds, callback) => {
        if (socket && connected) {
            socket.emit('users:getOnlineStatus', { userIds }, callback);
        }
    };

    const isUserOnline = (userId) => {
        return onlineUsers.has(userId);
    };

    const value = {
        socket,
        connected,
        onlineUsers,
        emitTypingStart,
        emitTypingStop,
        joinConversation,
        leaveConversation,
        markMessageAsRead,
        getOnlineStatus,
        isUserOnline,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
