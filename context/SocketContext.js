import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import { API_URL } from '../constants/config';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getToken } from '../utils/storage';
import * as Notifications from 'expo-notifications';
import { getUnreadCount } from '../services/notificationService';
import { getWorkerWorkLogs } from '../services/worklogService';
import { registerForPushNotificationsAsync, showLocalNotification, syncBadgeCount } from '../services/pushNotificationService';

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
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeWorkLog, setActiveWorkLog] = useState(null);
    const [activeConversationId, setActiveConversationId] = useState(null);
    const activeConversationRef = useRef(null);
    const { user } = useAuth();
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;

    // Keep ref in sync for socket listener closures
    useEffect(() => {
        activeConversationRef.current = activeConversationId;
    }, [activeConversationId]);

    // Automatically sync app launcher icon badge count
    useEffect(() => {
        syncBadgeCount(unreadCount);
    }, [unreadCount]);

    // Refresh global data (unread count and active work logs)
    const refreshGlobalData = async () => {
        if (!user) return;
        try {
            console.log('[SocketContext] Refreshing global data...');
            // 1. Fetch unread notification count
            const countData = await getUnreadCount();
            const count = countData.count || 0;
            setUnreadCount(count);
            syncBadgeCount(count);

            // 2. Fetch active work log for workers
            if (user.role === 'worker') {
                const logs = await getWorkerWorkLogs();
                // Filter for "active" work logs (in-progress or assigned/not started)
                const active = logs.find(log =>
                    log.status === 'in-progress' || (log.status === 'assigned' && !log.startTime)
                );
                setActiveWorkLog(active || null);
                if (active) {
                    console.log('[SocketContext] Active work log found:', active._id);
                }
            }
        } catch (error) {
            if (error.code !== 'ERR_NETWORK' && error.message !== 'Network Error') {
                console.error('[SocketContext] Error refreshing global data:', error.message);
            }
        }
    };

    useEffect(() => {
        console.log('Socket Context: User state changed:', user ? user._id : 'No User');

        let activeSocket = null;

        if (!user) {
            // Disconnect socket if user logs out
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setConnected(false);
            }
            setUnreadCount(0);
            syncBadgeCount(0);
            setActiveWorkLog(null);
            setActiveConversationId(null);
            return;
        }

        const initializeSocket = async () => {
            try {
                // Get auth token
                const token = await getToken();

                // Check if effect is still active (user might have changed while getting token)
                if (!user) return;

                console.log('Socket Context: Token retrieved:', token ? 'Yes' : 'No');

                if (!token) {
                    console.log('No token found, skipping socket connection');
                    return;
                }

                // Create socket connection - use base URL without /api
                const socketUrl = API_URL.replace('/api', '');
                console.log('Socket Context: Connecting to:', socketUrl);

                activeSocket = io(socketUrl, {
                    path: '/api/socket.io',
                    auth: { token },
                    transports: ['websocket', 'polling'], // Prefer native WebSocket in React Native
                    reconnection: true,
                    reconnectionDelay: 1000,
                    reconnectionDelayMax: 5000,
                    reconnectionAttempts: maxReconnectAttempts,
                });

                // Independent of socket connection: Register for push notifications
                // as soon as we have a valid authenticated session
                registerForPushNotificationsAsync().then(pushToken => {
                    if (pushToken) {
                        console.log('🚀 [SocketContext] Push registration successful:', pushToken.substring(0, 10) + '...');
                    }
                }).catch(err => {
                    console.error('❌ [SocketContext] Push registration failed:', err.message);
                });

                // Connection events
                activeSocket.on('connect', () => {
                    console.log('✅ Socket connected:', activeSocket.id);
                    setConnected(true);
                    reconnectAttempts.current = 0;

                    // Join user's personal room
                    activeSocket.emit('joinUserRoom', `user:${user._id}`);

                    // Initial data fetch once connected
                    refreshGlobalData();
                });

                activeSocket.on('connect_error', (error) => {
                    console.warn('⚠️  Socket connection error:', error.message);
                    setConnected(false);
                    reconnectAttempts.current++;
                    
                    if (reconnectAttempts.current >= maxReconnectAttempts) {
                        console.error('❌ Max socket reconnection attempts reached');
                        activeSocket.disconnect();
                    }
                });

                activeSocket.on('disconnect', (reason) => {
                    console.log('❌ Socket disconnected:', reason);
                    setConnected(false);
                });


                // Listen for new notifications
                activeSocket.on('notification:new', async (notification) => {
                    console.log('🔔 Socket Notification Received:', notification);
                    setUnreadCount(prev => {
                        const newCount = prev + 1;
                        syncBadgeCount(newCount);
                        return newCount;
                    });

                    const type = notification.type || '';
                    const notifTitle = notification.title || (type === 'new_message' ? 'New Message' : 'New Notification');
                    const relatedConvId = notification.relatedId?.toString();

                    // SMART SUPPRESSION: If user is actively viewing this specific conversation, suppress alert
                    if (type === 'new_message' && relatedConvId && relatedConvId === activeConversationRef.current?.toString()) {
                        console.log('🔇 Suppressing notification popup (user is actively inside chat):', relatedConvId);
                        return;
                    }

                    // 1. Show sleek In-App Toast if app is currently in foreground
                    if (AppState.currentState === 'active') {
                        let toastType = 'info';

                        if (type.includes('success') || type.includes('hired') || type.includes('accepted') || type.includes('otp') || type.includes('approved') || type.includes('verified')) toastType = 'success';
                        else if (type.includes('error') || type.includes('rejected') || type.includes('expired')) toastType = 'error';
                        else if (type.includes('warning') || type.includes('pending')) toastType = 'warning';

                        showToast({
                            type: toastType,
                            title: notifTitle,
                            message: notification.message,
                            action: notification.actionUrl ? {
                                label: (type === 'new_message' || type === 'new_conversation') ? 'Reply' : 'View',
                                url: notification.actionUrl
                            } : undefined
                        });
                    }

                    // 2. ALWAYS trigger native device status bar notification / push notification for all in-app notifications
                    showLocalNotification({
                        title: notifTitle,
                        message: notification.message || '',
                        data: {
                            _id: notification._id?.toString(),
                            notificationId: notification._id?.toString(),
                            actionUrl: notification.actionUrl,
                            relatedId: notification.relatedId,
                            type: notification.type,
                        },
                    });
                });

                // Listen for unread count updates
                activeSocket.on('notification:read', () => {
                    console.log('[SocketContext] Notification read, refreshing count...');
                    refreshGlobalData();
                });

                activeSocket.on('notification:allRead', () => {
                    setUnreadCount(0);
                    syncBadgeCount(0);
                });

                // Listen for work log updates
                activeSocket.on('workLogUpdated', ({ workLog }) => {
                    console.log('[SocketContext] Work log updated:', workLog._id);
                    if (user.role === 'worker') {
                        const isActive = workLog.status === 'in-progress' || (workLog.status === 'assigned' && !workLog.startTime);
                        if (isActive) {
                            setActiveWorkLog(workLog);
                        } else {
                            setActiveWorkLog(prev => prev?._id === workLog._id ? null : prev);
                        }
                    }
                });

                // Listen for new messages globally
                activeSocket.on('receiveMessage', async (message) => {
                    console.log('📩 Global Message Received (ReceiveMessage):', message);

                    // Emit delivered event back to sender
                    if (message.sender !== user._id) {
                        activeSocket.emit('message:delivered', {
                            messageId: message._id,
                            conversationId: message.conversationId
                        });
                    }

                    if (AppState.currentState === 'active') {
                        if (message.sender !== user._id) {
                            // Toast handled by notification:new listener to avoid duplication
                        }
                    }
                });

                activeSocket.on('message:new', async (message) => {
                    console.log('📩 Global Message Received (Message:New):', message);

                    // Emit delivered event back to sender
                    if (message.sender !== user._id) {
                        activeSocket.emit('message:delivered', {
                            messageId: message._id,
                            conversationId: message.conversationId
                        });
                    }
                });

                activeSocket.on('reconnect', (attemptNumber) => {
                    console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
                    reconnectAttempts.current = 0;
                    refreshGlobalData();
                });

                // Online status events
                activeSocket.on('user:online', ({ userId }) => {
                    setOnlineUsers(prev => new Set([...prev, userId]));
                });

                activeSocket.on('user:offline', ({ userId }) => {
                    setOnlineUsers(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(userId);
                        return newSet;
                    });
                });

                setSocket(activeSocket);
            } catch (error) {
                console.error('Error initializing socket:', error);
            }
        };

        initializeSocket();

        // Cleanup function - this is the critical fix
        return () => {
            if (activeSocket) {
                console.log('🔌 Cleaning up socket connection');
                activeSocket.disconnect();
                setSocket(null);
                setConnected(false);
            }
        };
    }, [user?._id]); // Use user._id to avoid redundant triggers if user object changes but ID is same

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

    const updateOnlineStatus = (userId, isOnline) => {
        setOnlineUsers(prev => {
            const newSet = new Set(prev);
            if (isOnline) {
                newSet.add(userId);
            } else {
                newSet.delete(userId);
            }
            return newSet;
        });
    };

    const value = {
        socket,
        connected,
        onlineUsers,
        unreadCount,
        activeWorkLog,
        activeConversationId,
        setActiveConversationId,
        refreshGlobalData,
        emitTypingStart,
        emitTypingStop,
        joinConversation,
        leaveConversation,
        markMessageAsRead,
        getOnlineStatus,
        isUserOnline,
        updateOnlineStatus,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};
