import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image,
    Animated,
    StatusBar,
    Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import { getFullImageUrl } from '../../utils/imageUtil';
import { getMessages, sendMessage, markMessagesAsRead, getConversationById } from '../../services/messageService';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export default function ChatScreen() {
    const { id } = useLocalSearchParams(); // conversation ID
    const router = useRouter();
    const { user } = useAuth();
    const flatListRef = useRef(null);
    const inputRef = useRef(null);

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [otherUser, setOtherUser] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [otherUserTyping, setOtherUserTyping] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const typingTimeoutRef = useRef(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const { socket, connected, isUserOnline, updateOnlineStatus } = useSocket();

    // Keyboard event listeners for Android
    useEffect(() => {
        if (Platform.OS === 'android') {
            const keyboardDidShowListener = Keyboard.addListener(
                'keyboardDidShow',
                (e) => {
                    setKeyboardHeight(e.endCoordinates.height);
                }
            );
            const keyboardDidHideListener = Keyboard.addListener(
                'keyboardDidHide',
                () => {
                    setKeyboardHeight(0);
                }
            );

            return () => {
                keyboardDidShowListener.remove();
                keyboardDidHideListener.remove();
            };
        }
    }, []);

    // Fetch conversation details for header
    useEffect(() => {
        const fetchConversationDetails = async () => {
            if (id && user) {
                try {
                    const convo = await getConversationById(id);
                    if (convo) {
                        const other = convo.members.find(m => m._id !== user._id);
                        setOtherUser(other);
                        // Fetch initial online status
                        if (socket && connected && other) {
                            console.log('Fetching online status for:', other._id);
                            socket.emit('users:getOnlineStatus', { userIds: [other._id] }, (status) => {
                                console.log('Online status response:', status);
                                if (status && status[other._id]) {
                                    console.log('User is online, updating status');
                                    updateOnlineStatus(other._id, true);
                                } else {
                                    console.log('User is offline');
                                    updateOnlineStatus(other._id, false);
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch conversation details:', error);
                }
            }
        };
        fetchConversationDetails();
    }, [id, user, socket, connected]);

    // Fetch messages
    const fetchMessages = async () => {
        try {
            const data = await getMessages(id);
            setMessages(data || []);

            // Mark messages as read
            await markMessagesAsRead(id);

            // Fade in animation
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchMessages();

            // Join conversation room
            if (socket && connected) {
                socket.emit('joinConversation', id);
            }

            return () => {
                if (socket && connected) {
                    socket.emit('leaveConversation', id);
                }
            };
        }
    }, [id, socket, connected]);

    // Real-time message listener
    useEffect(() => {
        if (!socket) {
            console.log('❌ Socket not initialized in ChatScreen');
            return;
        }

        if (!connected) {
            console.log('⚠️ Socket initialized but not connected in ChatScreen');
        } else {
            console.log('✅ Socket connected and listening in ChatScreen');
        }

        const handleNewMessage = (message) => {
            console.log('📨 New message received:', message);
            setMessages(prev => {
                // Avoid duplicates
                if (prev.some(m => m._id === message._id)) {
                    return prev;
                }
                return [...prev, message];
            });
        };

        const handleTypingStart = ({ userId }) => {
            if (userId !== user._id) {
                setOtherUserTyping(true);
            }
        };

        const handleTypingStop = ({ userId }) => {
            if (userId !== user._id) {
                setOtherUserTyping(false);
            }
        };

        const handleMessageRead = ({ messageId }) => {
            setMessages(prev => prev.map(msg =>
                msg._id === messageId ? { ...msg, status: 'read' } : msg
            ));
        };

        const handleMessageDelivered = ({ messageId }) => {
            setMessages(prev => prev.map(msg =>
                msg._id === messageId ? { ...msg, status: 'delivered' } : msg
            ));
        };

        socket.on('receiveMessage', handleNewMessage);
        socket.on('userTyping', handleTypingStart);
        socket.on('userStoppedTyping', handleTypingStop);
        socket.on('messageRead', handleMessageRead);
        socket.on('messageDelivered', handleMessageDelivered);

        return () => {
            socket.off('receiveMessage', handleNewMessage);
            socket.off('userTyping', handleTypingStart);
            socket.off('userStoppedTyping', handleTypingStop);
            socket.off('messageRead', handleMessageRead);
            socket.off('messageDelivered', handleMessageDelivered);
        };
    }, [socket, connected, user]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messages.length > 0 && flatListRef.current) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    const handleSend = async () => {
        if (!newMessage.trim() || sending) return;

        const messageText = newMessage.trim();
        setNewMessage('');
        setSending(true);

        // Stop typing indicator
        if (socket && connected && otherUser) {
            socket.emit('stopTyping', { conversationId: id, userId: user._id });
        }

        try {
            await sendMessage(id, user._id, messageText);
            // Don't add here - let socket event handle it to avoid duplicates
        } catch (error) {
            console.error('Failed to send message:', error);
            setNewMessage(messageText);
        } finally {
            setSending(false);
        }
    };

    // Handle typing
    const handleTextChange = (text) => {
        setNewMessage(text);

        if (!socket || !connected || !otherUser) return;

        // Start typing indicator
        if (!isTyping && text.length > 0) {
            setIsTyping(true);
            socket.emit('typing', { conversationId: id, userId: user._id });
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing after 2 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            socket.emit('stopTyping', { conversationId: id, userId: user._id });
        }, 2000);
    };

    const handleInputFocus = () => {
        setTimeout(() => {
            if (flatListRef.current && messages.length > 0) {
                flatListRef.current.scrollToEnd({ animated: true });
            }
        }, 300);
    };

    const insets = useSafeAreaInsets();

    const renderMessageStatus = (status) => {
        if (!status) return null;

        switch (status) {
            case 'sent':
                return <Ionicons name="checkmark" size={14} color="rgba(0,0,0,0.45)" style={{ marginLeft: 4 }} />;
            case 'delivered':
                return <Ionicons name="checkmark-done" size={14} color="rgba(0,0,0,0.45)" style={{ marginLeft: 4 }} />;
            case 'read':
                return <Ionicons name="checkmark-done" size={14} color="#53BDEB" style={{ marginLeft: 4 }} />;
            default:
                return null;
        }
    };

    const renderMessage = ({ item, index }) => {
        const isMyMessage = item.sender === user?._id || item.sender?._id === user?._id;
        const showAvatar = !isMyMessage && (index === 0 || messages[index - 1].sender !== item.sender);

        return (
            <View
                style={[
                    styles.messageContainer,
                    isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
                ]}
            >
                <View style={[styles.messageRow, isMyMessage && styles.myMessageRow]}>
                    {!isMyMessage && showAvatar && (
                        <TouchableOpacity
                            style={styles.avatarContainer}
                            onPress={() => otherUser && router.push(`/profile/${otherUser._id}`)}
                        >
                            {otherUser?.profilePicture ? (
                                <Image
                                    source={{ uri: getFullImageUrl(otherUser.profilePicture) }}
                                    style={styles.avatarImage}
                                />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Ionicons name="person" size={16} color={COLORS.white} />
                                </View>
                            )}
                        </TouchableOpacity>
                    )}

                    {!isMyMessage && !showAvatar && (
                        <View style={styles.avatarSpacer} />
                    )}

                    <View
                        style={[
                            styles.messageBubble,
                            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
                            showAvatar ? styles.withAvatar : styles.withoutAvatar,
                        ]}
                    >
                        <Text
                            style={[
                                styles.messageText,
                                isMyMessage ? styles.myMessageText : styles.otherMessageText,
                            ]}
                            selectable
                        >
                            {item.text}
                        </Text>

                        <View style={[
                            styles.messageFooter,
                            isMyMessage ? styles.myMessageFooter : styles.otherMessageFooter,
                        ]}>
                            <Text style={styles.messageTime}>
                                {new Date(item.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </Text>
                            {isMyMessage && renderMessageStatus(item.status)}
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.whatsappGreen} />
                <ActivityIndicator size="large" color={COLORS.whatsappGreen} />
                <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
        );
    }

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.whatsappGreen} />
            <View style={styles.rootContainer}>


                <Stack.Screen
                    options={{
                        headerShown: true,
                        headerStyle: {
                            backgroundColor: COLORS.whatsappGreen,
                        },
                        headerTintColor: COLORS.white,
                        headerShadowVisible: false,
                        headerBackVisible: true,
                        headerTitleContainerStyle: {
                            marginLeft: Platform.OS === 'ios' ? -16 : -20, // Adjust for both platforms
                        },
                        headerTitle: () => (
                            <TouchableOpacity
                                style={styles.headerUserInfo}
                                onPress={() => otherUser && router.push(`/profile/${otherUser._id}`)}
                                activeOpacity={0.7}
                            >
                                {otherUser?.profilePicture ? (
                                    <Image
                                        source={{ uri: getFullImageUrl(otherUser.profilePicture) }}
                                        style={styles.headerAvatar}
                                    />
                                ) : (
                                    <View style={styles.headerAvatarPlaceholder}>
                                        <Ionicons name="person" size={20} color={COLORS.white} />
                                    </View>
                                )}
                                <View style={styles.headerInfo}>
                                    <Text style={styles.headerName} numberOfLines={1} ellipsizeMode="tail">
                                        {otherUser?.name || 'Chat'}
                                    </Text>
                                    <View style={styles.headerStatus}>
                                        <View style={[
                                            styles.onlineIndicator,
                                            isUserOnline(otherUser?._id) ? styles.online : styles.offline
                                        ]} />
                                        <Text style={styles.headerStatusText}>
                                            {isUserOnline(otherUser?._id) ? 'Online' : 'Offline'}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ),
                    }}
                />

                {/* Main content with keyboard handling */}
                <View style={styles.container}>
                    {/* Messages Area */}
                    <Animated.View style={[styles.messagesContainer, { opacity: fadeAnim }]}>
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={(item) => item._id}
                            renderItem={renderMessage}
                            contentContainerStyle={styles.messagesList}
                            showsVerticalScrollIndicator={false}
                            onContentSizeChange={() => {
                                if (messages.length > 0) {
                                    flatListRef.current?.scrollToEnd({ animated: true });
                                }
                            }}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <View style={styles.emptyIconContainer}>
                                        <Ionicons
                                            name="chatbubbles-outline"
                                            size={60}
                                            color={COLORS.textSecondary}
                                        />
                                    </View>
                                    <Text style={styles.emptyText}>No messages yet</Text>
                                    <Text style={styles.emptySubtext}>Start the conversation!</Text>
                                </View>
                            }
                            keyboardDismissMode="interactive"
                            keyboardShouldPersistTaps="handled"
                        />

                        {/* Typing Indicator */}
                        {otherUserTyping && (
                            <View style={styles.typingContainer}>
                                <View style={styles.typingBubble}>
                                    <View style={styles.typingDots}>
                                        <View style={[styles.typingDot]} />
                                        <View style={[styles.typingDot, styles.typingDot2]} />
                                        <View style={[styles.typingDot, styles.typingDot3]} />
                                    </View>
                                </View>
                            </View>
                        )}
                    </Animated.View>

                    {/* Input Area - Fixed at bottom */}
                    <View
                        style={[
                            styles.inputContainer,
                            {
                                paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
                                // Add bottom padding for Android keyboard
                                ...(Platform.OS === 'android' && keyboardHeight > 0
                                    ? { marginBottom: keyboardHeight }
                                    : {})
                            }
                        ]}
                    >
                        <View style={styles.inputWrapper}>
                            <TextInput
                                ref={inputRef}
                                style={styles.input}
                                value={newMessage}
                                onChangeText={handleTextChange}
                                onFocus={handleInputFocus}
                                placeholder="Type a message"
                                placeholderTextColor={COLORS.textLight}
                                multiline
                                maxLength={1000}
                                blurOnSubmit={false}
                                returnKeyType="default"
                            />
                            <TouchableOpacity
                                onPress={handleSend}
                                style={[
                                    styles.sendButton,
                                    (!newMessage.trim() || sending) && styles.sendButtonDisabled,
                                ]}
                                disabled={!newMessage.trim() || sending}
                            >
                                {sending ? (
                                    <ActivityIndicator size="small" color={COLORS.white} />
                                ) : (
                                    <Ionicons name="send" size={20} color={COLORS.white} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    rootContainer: {
        flex: 1,
        backgroundColor: COLORS.whatsappGreen,
    },
    container: {
        flex: 1,
        backgroundColor: '#ECE5DD',
        justifyContent: 'space-between',
    },
    messagesContainer: {
        flex: 1,
        backgroundColor: '#ECE5DD',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ECE5DD',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    // Update the headerUserInfo style in the StyleSheet:

    headerUserInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: Platform.OS === 'ios' ? -4 : -4, // Small padding for Android
        marginLeft: 0,
    },

    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10, // Reduced from 12 to 10
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },

    headerAvatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10, // Reduced from 12 to 10
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    headerInfo: {
        flex: 1,
        maxWidth: '100%',

    },
    headerName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
        marginTop: 2,
        flexShrink: 1,
    },
    headerStatus: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    onlineIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    online: {
        backgroundColor: '#4CAF50',
    },
    offline: {
        backgroundColor: '#9E9E9E',
    },
    headerStatusText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
    },
    messagesList: {
        paddingHorizontal: 12,
        paddingVertical: 16,
        flexGrow: 1,
    },
    messageContainer: {
        marginBottom: 12,
        maxWidth: '85%',
        width: 'auto',
    },
    myMessageContainer: {
        alignSelf: 'flex-end',
    },
    otherMessageContainer: {
        alignSelf: 'flex-start',
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        maxWidth: '100%',
    },
    myMessageRow: {
        justifyContent: 'flex-end',
    },
    avatarContainer: {
        marginRight: 8,
    },
    avatarPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    avatarSpacer: {
        width: 40,
    },
    messageBubble: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        maxWidth: '100%',
    },
    withAvatar: {
        borderBottomLeftRadius: 4,
    },
    withoutAvatar: {
        borderBottomLeftRadius: 20,
    },
    myMessageBubble: {
        backgroundColor: '#DCF8C6',
        borderTopRightRadius: 4,
        borderTopLeftRadius: 20,
        borderBottomRightRadius: 20,
        borderBottomLeftRadius: 20,
    },
    otherMessageBubble: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 20,
        borderBottomRightRadius: 20,
        borderBottomLeftRadius: 20,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
        flexWrap: 'wrap',
    },
    myMessageText: {
        color: '#000',
    },
    otherMessageText: {
        color: '#000',
    },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        justifyContent: 'flex-end',
    },
    myMessageFooter: {
        justifyContent: 'flex-end',
    },
    otherMessageFooter: {
        justifyContent: 'flex-start',
    },
    messageTime: {
        fontSize: 11,
        color: 'rgba(0,0,0,0.45)',
        marginRight: 4,
    },
    typingContainer: {
        paddingHorizontal: 12,
        paddingBottom: 8,
    },
    typingBubble: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        alignSelf: 'flex-start',
        marginLeft: 44,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    typingDots: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    typingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#999',
        marginHorizontal: 1.5,
        opacity: 0.6,
    },
    typingDot2: {
        opacity: 0.8,
    },
    typingDot3: {
        opacity: 1,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginTop: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    inputContainer: {
        backgroundColor: '#F0F0F0',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#DDD',
        paddingHorizontal: 12,
        paddingTop: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: COLORS.white,
        borderRadius: 24,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#DDD',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        maxHeight: 100,
        minHeight: 36,
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.whatsappGreen,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
        marginBottom: 2,
    },
    sendButtonDisabled: {
        backgroundColor: '#BDBDBD',
    },
});