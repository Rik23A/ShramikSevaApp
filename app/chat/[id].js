import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import { getFullImageUrl } from '../../utils/imageUtil';
import {
    getMessages,
    sendMessage,
    markMessagesAsRead as markMessagesAsReadApi,
    getConversationById,
    translateText,
} from '../../services/messageService';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

// ─── Message status ticks ──────────────────────────────────────────────────────
const renderMessageStatus = (status) => {
    if (!status) return null;
    switch (status) {
        case 'sending':
            return <Ionicons name="time-outline" size={14} color="rgba(0,0,0,0.4)" style={{ marginLeft: 4 }} />;
        case 'sent':
            return <Ionicons name="checkmark" size={14} color="rgba(0,0,0,0.4)" style={{ marginLeft: 4 }} />;
        case 'delivered':
            return <Ionicons name="checkmark-done" size={14} color="rgba(0,0,0,0.4)" style={{ marginLeft: 4 }} />;
        case 'read':
            return <Ionicons name="checkmark-done" size={14} color="#34B7F1" style={{ marginLeft: 4 }} />;
        case 'failed':
            return <Ionicons name="alert-circle" size={14} color="#FF5252" style={{ marginLeft: 4 }} />;
        default:
            return null;
    }
};

// ─── Message bubble ────────────────────────────────────────────────────────────
// NOTE: With inverted FlatList, item[0] is the NEWEST message (rendered at bottom).
// "showTail" is true when the message AFTER this one (index+1 in reversed data = older)
// is from a different sender — meaning this is the first in a consecutive group visually.
const MessageItem = React.memo(function MessageItem({ item, isMyMessage, showTail }) {
    return (
        <View
            style={[
                styles.messageContainer,
                isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
                !showTail && styles.consecutiveMessage,
            ]}
        >
            <View
                style={[
                    styles.messageBubble,
                    isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
                    // Tail at the BOTTOM corner (WhatsApp style)
                    showTail && (isMyMessage ? styles.myBubbleTail : styles.otherBubbleTail),
                ]}
            >
                <Text
                    style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}
                    selectable
                >
                    {item.text}
                </Text>
                <View style={[styles.messageFooter, isMyMessage ? styles.myMessageFooter : styles.otherMessageFooter]}>
                    <Text style={styles.messageTime}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </Text>
                    {isMyMessage && renderMessageStatus(item.status)}
                </View>
            </View>
        </View>
    );
});

// ─── Animated typing indicator ─────────────────────────────────────────────────
const TypingIndicator = React.memo(function TypingIndicator() {
    const d1 = useRef(new Animated.Value(0)).current;
    const d2 = useRef(new Animated.Value(0)).current;
    const d3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const bounce = (dot, delay) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
                    Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
                    Animated.delay(600 - delay),
                ])
            );
        const a1 = bounce(d1, 0);
        const a2 = bounce(d2, 150);
        const a3 = bounce(d3, 300);
        a1.start(); a2.start(); a3.start();
        return () => { a1.stop(); a2.stop(); a3.stop(); };
    }, []);

    const dot = (anim) => ({
        opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
    });

    return (
        <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
                <Animated.View style={[styles.typingDot, dot(d1)]} />
                <Animated.View style={[styles.typingDot, dot(d2)]} />
                <Animated.View style={[styles.typingDot, dot(d3)]} />
            </View>
        </View>
    );
});

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function ChatScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { locale, t } = require('../../context/LanguageContext').useLanguage();
    const flatListRef = useRef(null);
    const inputRef = useRef(null);
    const insets = useSafeAreaInsets();

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [otherUser, setOtherUser] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [otherUserTyping, setOtherUserTyping] = useState(false);

    // Scroll-to-bottom FAB (when user scrolls up)
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const isNearBottomRef = useRef(true); // inverted list → "bottom" = offset 0

    // Android keyboard: manual listener because adjustResize/KAV fight each other
    // on New Architecture (newArchEnabled:true). We track exact keyboard height
    // and apply it as marginBottom so the input bar is always above the keyboard.
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [keyboardShown, setKeyboardShown] = useState(false);

    const typingTimeoutRef = useRef(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const { socket, connected, isUserOnline, updateOnlineStatus, markMessageAsRead, setActiveConversationId } = useSocket();

    // Register active conversation ID for smart in-chat notification suppression
    useEffect(() => {
        if (id && setActiveConversationId) {
            setActiveConversationId(id);
        }
        return () => {
            if (setActiveConversationId) {
                setActiveConversationId(null);
            }
        };
    }, [id, setActiveConversationId]);

    useEffect(() => {
        if (Platform.OS !== 'android') return;
        const show = Keyboard.addListener('keyboardDidShow', (e) => {
            setKeyboardHeight(e.endCoordinates.height);
            setKeyboardShown(true);
        });
        const hide = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardHeight(0);
            setKeyboardShown(false);
        });
        return () => { show.remove(); hide.remove(); };
    }, []);

    // ── Build grouped messages with date separators ──────────────────────────
    // Result is chronological (oldest first). FlatList will invert it visually.
    const groupedMessages = useMemo(() => {
        const groups = [];
        let lastDate = null;
        messages.forEach((msg) => {
            const date = new Date(msg.createdAt).toDateString();
            if (date !== lastDate) {
                groups.push({ type: 'date', date, _id: `date-${msg.createdAt}` });
                lastDate = date;
            }
            groups.push({ ...msg, type: 'message' });
        });
        return groups;
    }, [messages]);

    // Reverse for inverted FlatList: newest → index 0 → rendered at visual bottom
    const invertedData = useMemo(() => [...groupedMessages].reverse(), [groupedMessages]);

    // ── Fetch conversation info ──────────────────────────────────────────────
    useEffect(() => {
        if (!id || !user) return;
        const fetchConversationDetails = async () => {
            try {
                const convo = await getConversationById(id);
                if (convo) {
                    const other = convo.members.find((m) => m._id !== user._id);
                    setOtherUser(other);
                    if (socket && connected && other) {
                        socket.emit('users:getOnlineStatus', { userIds: [other._id] }, (status) => {
                            updateOnlineStatus(other._id, !!(status && status[other._id]));
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to fetch conversation details:', err);
            }
        };
        fetchConversationDetails();
    }, [id, user, socket, connected]);

    // ── Fetch messages ───────────────────────────────────────────────────────
    const fetchMessages = useCallback(async () => {
        try {
            const data = await getMessages(id);
            setMessages(data || []);
            const hasUnread = data.some((m) => m.sender !== user._id && m.status !== 'read');
            if (hasUnread) {
                await markMessagesAsReadApi(id);
                data.forEach((m) => {
                    if (m.sender !== user._id && m.status !== 'read') {
                        markMessageAsRead(m._id, id, m.sender);
                    }
                });
            }
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        } finally {
            setLoading(false);
        }
    }, [id, user]);

    useEffect(() => {
        if (!id) return;
        fetchMessages();
        if (socket && connected) socket.emit('joinConversation', id);
        return () => { if (socket && connected) socket.emit('leaveConversation', id); };
    }, [id, socket, connected]);

    // ── Real-time socket ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = async (message) => {
            if (message.sender !== user._id) {
                markMessageAsRead(message._id, id, message.sender);
            }
            let finalMessage = message;
            if (message.sender !== user._id && locale !== 'en') {
                const t = await translateText(message.text, locale);
                finalMessage = { ...message, text: t };
            }
            setMessages((prev) => {
                if (finalMessage.sender === user._id && finalMessage.clientMessageId) {
                    const idx = prev.findIndex((m) => m.clientMessageId === finalMessage.clientMessageId);
                    if (idx !== -1) {
                        const next = [...prev];
                        next[idx] = finalMessage;
                        return next;
                    }
                }
                if (prev.some((m) => m._id === finalMessage._id)) return prev;
                return [...prev, finalMessage];
            });
            // Show FAB badge if user has scrolled up
            if (!isNearBottomRef.current && message.sender !== user._id) {
                setUnreadCount((c) => c + 1);
            }
        };

        const updateMessageStatus = (data) => {
            const { messageId, clientMessageId, status } = data;
            const weights = { sending: 0, sent: 1, delivered: 2, read: 3, failed: -1 };
            setMessages((prev) =>
                prev.map((msg) => {
                    const match = msg._id === messageId || (clientMessageId && msg.clientMessageId === clientMessageId);
                    if (match && weights[status] > weights[msg.status || 'sent']) return { ...msg, status };
                    return msg;
                })
            );
        };

        socket.on('receiveMessage', handleNewMessage);
        socket.on('userTyping', ({ userId }) => { if (userId !== user._id) setOtherUserTyping(true); });
        socket.on('userStoppedTyping', ({ userId }) => { if (userId !== user._id) setOtherUserTyping(false); });
        socket.on('messageDelivered', (d) => updateMessageStatus({ ...d, status: 'delivered' }));
        socket.on('message:delivered', (d) => updateMessageStatus({ ...d, status: 'delivered' }));
        socket.on('messageRead', (d) => updateMessageStatus({ ...d, status: 'read' }));
        socket.on('message:read', (d) => updateMessageStatus({ ...d, status: 'read' }));

        return () => {
            socket.off('receiveMessage');
            socket.off('userTyping');
            socket.off('userStoppedTyping');
            socket.off('messageDelivered');
            socket.off('message:delivered');
            socket.off('messageRead');
            socket.off('message:read');
        };
    }, [socket, connected, user]);

    // With inverted FlatList, "bottom" = scrollOffset 0.
    // No scrollToEnd needed — the list STARTS at newest message.
    // When a new message arrives and user is near bottom, scroll back to offset 0.
    useEffect(() => {
        if (messages.length > 0 && isNearBottomRef.current) {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }
    }, [messages]);

    // ── Scroll tracking ──────────────────────────────────────────────────────
    const handleScroll = useCallback((event) => {
        const offset = event.nativeEvent.contentOffset.y;
        const nearBottom = offset < 80; // inverted: bottom = offset 0
        isNearBottomRef.current = nearBottom;
        setShowScrollToBottom(!nearBottom);
        if (nearBottom) setUnreadCount(0);
    }, []);

    const scrollToBottom = useCallback(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        setShowScrollToBottom(false);
        setUnreadCount(0);
        isNearBottomRef.current = true;
    }, []);

    // ── Send message ─────────────────────────────────────────────────────────
    const handleSend = async () => {
        if (!newMessage.trim() || sending) return;
        const messageText = newMessage.trim();
        setSending(true);
        const temporaryId = Date.now().toString();

        const optimisticMessage = {
            _id: temporaryId,
            clientMessageId: temporaryId,
            text: messageText,
            sender: user._id,
            conversationId: id,
            createdAt: new Date().toISOString(),
            status: 'sending',
        };

        setMessages((prev) => [...prev, optimisticMessage]);
        setNewMessage('');
        isNearBottomRef.current = true;
        setShowScrollToBottom(false);

        if (socket && connected && otherUser) {
            socket.emit('typing:stop', { conversationId: id, userId: user._id });
        }

        try {
            const response = await sendMessage(id, user._id, messageText, temporaryId);
            setMessages((prev) => {
                const existingMsg = prev.find(
                    (msg) =>
                        msg._id === response._id ||
                        (response.clientMessageId && msg.clientMessageId === response.clientMessageId && msg._id !== temporaryId)
                );
                if (existingMsg) return prev.filter((msg) => msg._id !== temporaryId);
                return prev.map((msg) =>
                    msg._id === temporaryId ? { ...response, status: response.status || 'sent' } : msg
                );
            });
        } catch (err) {
            console.error('Failed to send message:', err);
            setMessages((prev) => prev.map((msg) => (msg._id === temporaryId ? { ...msg, status: 'failed' } : msg)));
            setNewMessage(messageText);
        } finally {
            setSending(false);
        }
    };

    // ── Date header formatter ────────────────────────────────────────────────
    const formatDateHeader = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        if (date.toDateString() === today.toDateString()) return t('today');
        if (date.toDateString() === yesterday.toDateString()) return t('yesterday');
        return date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
    };

    // ── Typing indicator ─────────────────────────────────────────────────────
    const handleTextChange = (text) => {
        setNewMessage(text);
        if (!socket || !connected || !otherUser) return;
        if (!isTyping && text.length > 0) {
            setIsTyping(true);
            socket.emit('typing', { conversationId: id, userId: user._id });
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            socket.emit('stopTyping', { conversationId: id, userId: user._id });
        }, 2000);
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <View style={styles.rootContainer}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.whatsappGreen} translucent={false} />
            {/* ── Header ── */}
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: COLORS.whatsappGreen },
                    headerTintColor: COLORS.white,
                    headerShadowVisible: false,
                    headerBackVisible: true,
                    headerTitleContainerStyle: { marginLeft: Platform.OS === 'ios' ? -16 : 0 },
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
                                    {otherUser?.name || t('chat')}
                                </Text>
                                <View style={styles.headerStatus}>
                                    <View style={[styles.onlineIndicator, isUserOnline(otherUser?._id) ? styles.online : styles.offline]} />
                                    <Text style={styles.headerStatusText}>
                                        {otherUserTyping ? t('typing') : isUserOnline(otherUser?._id) ? t('online') : t('offline')}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ),
                    headerTitleAlign: 'left',
                }}
            />

            {loading ? (
                <View style={styles.loadingContainer}>
                    <LoadingSpinner message={t('loading_messages')} />
                </View>
            ) : (
                /*
                  ─── KEYBOARD STRATEGY ────────────────────────────────────────────
                  iOS:   KAV behavior="padding". keyboardVerticalOffset = safeArea top + header.
                  Android: KAV DISABLED (enabled=false). we use softwareKeyboardLayoutMode="resize"
                         (in app.json) which handles the resizing of the window automatically.
                         The manual keyboard height tracker provides smooth margin adjustment
                         where needed, but for most screens "resize" is sufficient.
                  ─────────────────────────────────────────────────────────────────
                */
                <KeyboardAvoidingView
                    style={styles.container}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    enabled={Platform.OS === 'ios'}
                    keyboardVerticalOffset={insets.top + (Platform.OS === 'ios' ? 44 : 56)}
                >
                    {/* Android wrapper: manual keyboard offset via marginBottom */}
                    <View style={[
                        styles.innerContainer,
                        Platform.OS === 'android' && { marginBottom: keyboardHeight },
                    ]}>
                        {/* ── Messages ── */}
                        <Animated.View style={[styles.messagesContainer, { opacity: fadeAnim }]}>
                            <FlatList
                                ref={flatListRef}
                                data={invertedData}
                                keyExtractor={(item) => item._id}
                                inverted
                                renderItem={({ item, index }) => {
                                    if (item.type === 'date') {
                                        return (
                                            <View style={styles.dateHeaderContainer}>
                                                <View style={styles.dateHeaderBubble}>
                                                    <Text style={styles.dateHeaderText}>
                                                        {formatDateHeader(item.date)}
                                                    </Text>
                                                </View>
                                            </View>
                                        );
                                    }

                                    const isMyMessage = item.sender === user?._id || item.sender?._id === user?._id;
                                    const nextItem = index < invertedData.length - 1 ? invertedData[index + 1] : null;
                                    const showTail =
                                        !nextItem ||
                                        nextItem.type === 'date' ||
                                        (nextItem.sender?._id || nextItem.sender) !== (item.sender?._id || item.sender);

                                    return (
                                        <MessageItem
                                            item={item}
                                            isMyMessage={isMyMessage}
                                            showTail={showTail}
                                        />
                                    );
                                }}
                                contentContainerStyle={styles.messagesList}
                                showsVerticalScrollIndicator={false}
                                onScroll={handleScroll}
                                scrollEventThrottle={16}
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <View style={styles.emptyIconContainer}>
                                            <Ionicons name="chatbubbles-outline" size={60} color={COLORS.textSecondary} />
                                        </View>
                                        <Text style={styles.emptyText}>{t('no_messages_yet')}</Text>
                                        <Text style={styles.emptySubtext}>{t('start_conversation')}</Text>
                                    </View>
                                }
                                keyboardDismissMode="on-drag"
                                keyboardShouldPersistTaps="handled"
                                initialNumToRender={20}
                                maxToRenderPerBatch={10}
                                windowSize={10}
                                removeClippedSubviews={Platform.OS === 'android'}
                            />

                            {/* Scroll-to-bottom FAB with unread badge */}
                            {showScrollToBottom && (
                                <TouchableOpacity style={styles.scrollToBottomFab} onPress={scrollToBottom} activeOpacity={0.85}>
                                    {unreadCount > 0 && (
                                        <View style={styles.unreadBadge}>
                                            <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                                        </View>
                                    )}
                                    <Ionicons name="chevron-down" size={22} color={COLORS.whatsappGreen} />
                                </TouchableOpacity>
                            )}
                        </Animated.View>

                        {/* Typing indicator — pinned above input bar (outside FlatList, always visible) */}
                        {otherUserTyping && <TypingIndicator />}

                        {/* Input bar */}
                        <SafeAreaView
                            edges={['bottom']}
                            style={[
                                styles.inputSafeArea,
                                Platform.OS === 'android' && keyboardShown && { paddingBottom: 0 },
                            ]}
                        >
                            <View style={styles.inputContainer}>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        ref={inputRef}
                                        style={styles.input}
                                        value={newMessage}
                                        onChangeText={handleTextChange}
                                        placeholder={t('type_message_placeholder')}
                                        placeholderTextColor={COLORS.textLight}
                                        multiline
                                        maxLength={1000}
                                        blurOnSubmit={false}
                                        returnKeyType="default"
                                    />
                                    <TouchableOpacity
                                        onPress={handleSend}
                                        style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
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
                        </SafeAreaView>
                    </View>
                </KeyboardAvoidingView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    rootContainer: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    container: {
        flex: 1,
        backgroundColor: '#ECE5DD',
    },
    innerContainer: {
        flex: 1,
        backgroundColor: '#ECE5DD',
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

    // ── Header ───────────────────────────────────────────────────────────────
    headerUserInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        marginLeft: -10,
    },
    headerAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        marginRight: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    headerAvatarPlaceholder: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    headerInfo: { flex: 1 },
    headerName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
        marginTop: 2,
        flexShrink: 1,
    },
    headerStatus: { flexDirection: 'row', alignItems: 'center' },
    onlineIndicator: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    online: { backgroundColor: '#4CAF50' },
    offline: { backgroundColor: '#9E9E9E' },
    headerStatusText: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },

    // ── Message list ─────────────────────────────────────────────────────────
    messagesList: {
        paddingHorizontal: 8,
        paddingVertical: 12,
        flexGrow: 1,
    },
    messageContainer: {
        marginVertical: 1,
        maxWidth: '82%',
    },
    consecutiveMessage: {
        marginVertical: 1,
    },
    myMessageContainer: { alignSelf: 'flex-end' },
    otherMessageContainer: { alignSelf: 'flex-start' },

    // ── Bubbles ──────────────────────────────────────────────────────────────
    messageBubble: {
        paddingHorizontal: 10,
        paddingTop: 6,
        paddingBottom: 4,
        borderRadius: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 1.5,
        elevation: 1,
    },
    myMessageBubble: {
        backgroundColor: '#DCF8C6',
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
    },
    otherMessageBubble: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
    },
    // Tail at the BOTTOM corner (WhatsApp style)
    myBubbleTail: {
        borderBottomRightRadius: 4,
        marginBottom: 4,
    },
    otherBubbleTail: {
        borderBottomLeftRadius: 4,
        marginBottom: 4,
    },

    // ── Text & footer ─────────────────────────────────────────────────────────
    messageText: { fontSize: 15, lineHeight: 20 },
    myMessageText: { color: '#000' },
    otherMessageText: { color: '#000' },
    messageFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    myMessageFooter: { justifyContent: 'flex-end' },
    otherMessageFooter: { justifyContent: 'flex-start' },
    messageTime: { fontSize: 11, color: 'rgba(0,0,0,0.45)', marginRight: 2 },

    // ── Date divider ─────────────────────────────────────────────────────────
    dateHeaderContainer: { alignItems: 'center', marginVertical: 12 },
    dateHeaderBubble: {
        backgroundColor: '#D1E4F4',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 8,
        elevation: 1,
    },
    dateHeaderText: {
        fontSize: 12,
        color: '#50616E',
        fontWeight: '600',
        textTransform: 'uppercase',
    },

    // ── Typing indicator (pinned above input, outside FlatList) ──────────────
    typingContainer: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignItems: 'flex-start',
    },
    typingBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 18,
        borderBottomLeftRadius: 4,
        paddingHorizontal: 14,
        paddingVertical: 10,
        elevation: 1,
    },
    typingDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#999',
        marginHorizontal: 2,
    },

    // ── Scroll-to-bottom FAB ─────────────────────────────────────────────────
    scrollToBottomFab: {
        position: 'absolute',
        right: 14,
        bottom: 14,
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    unreadBadge: {
        position: 'absolute',
        top: -6,
        right: -4,
        backgroundColor: COLORS.whatsappGreen,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    unreadBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },

    // ── Input bar ─────────────────────────────────────────────────────────────
    inputSafeArea: { backgroundColor: '#F0F0F0' },
    inputContainer: {
        backgroundColor: '#F0F0F0',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#DDD',
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: 8,
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
    sendButtonDisabled: { backgroundColor: '#BDBDBD' },

    // ── Empty state ───────────────────────────────────────────────────────────
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
    emptyText: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 8 },
    emptySubtext: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
});
