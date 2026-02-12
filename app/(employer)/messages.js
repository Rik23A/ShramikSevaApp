import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    Image,
    TouchableOpacity
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, API_URL } from '../../constants/config';
import { getConversations } from '../../services/messageService';
import { useAuth } from '../../context/AuthContext';
import { timeAgo } from '../../utils/dateUtils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { getFullImageUrl } from '../../utils/imageUtil';

export default function EmployerMessagesScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchConversations = async () => {
        try {
            if (user?._id) {
                const data = await getConversations(user._id);
                setConversations(data || []);
            }
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, [user]);

    const renderItem = ({ item }) => {
        const otherUser = item.members?.find(m => m._id !== user?._id) || {};
        const lastMsg = item.lastMessage;
        const hasLastMessage = !!lastMsg;
        const isUnread = hasLastMessage && lastMsg.sender !== user?._id && lastMsg.status !== 'read';

        return (
            <TouchableOpacity
                onPress={() => router.push(`/chat/${item._id}`)}
                style={styles.conversationCard}
                activeOpacity={0.7}
            >
                <View style={styles.avatarContainer}>
                    {otherUser.profilePicture ? (
                        <Image
                            source={{ uri: getFullImageUrl(otherUser.profilePicture) }}
                            style={styles.avatarImage}
                        />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: COLORS.secondary + '20' }]}>
                            <Text style={[styles.avatarText, { color: COLORS.secondary }]}>
                                {otherUser.name ? otherUser.name.charAt(0).toUpperCase() : 'W'}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.contentContainer}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.userName, isUnread && styles.unreadText]} numberOfLines={1}>
                            {otherUser.name || 'Worker'}
                        </Text>
                        {hasLastMessage && (
                            <View style={styles.timeContainer}>
                                <Text style={[styles.timeText, isUnread && styles.unreadTime]}>
                                    {timeAgo(lastMsg.createdAt)}
                                </Text>
                                {isUnread && <View style={styles.unreadDot} />}
                            </View>
                        )}
                    </View>

                    <Text style={[
                        styles.lastMessage,
                        isUnread && styles.unreadMessage,
                        !hasLastMessage && styles.italicText
                    ]} numberOfLines={1}>
                        {hasLastMessage ? lastMsg.text : 'Start a conversation'}
                    </Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
        );
    };

    if (loading) {
        return <LoadingSpinner fullScreen message="Loading messages..." />;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={conversations}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchConversations(); }}
                        colors={[COLORS.secondary]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubbles-outline" size={60} color={COLORS.textSecondary} />
                        <Text style={styles.emptyTitle}>No Conversations</Text>
                        <Text style={styles.emptySubtitle}>Messages from workers will appear here</Text>
                    </View>
                }
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    listContent: {
        paddingVertical: 10,
    },
    conversationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: COLORS.white,
    },
    avatarContainer: {
        marginRight: 16,
    },
    avatarImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    contentContainer: {
        flex: 1,
        marginRight: 10,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        flex: 1,
        marginRight: 8,
    },
    timeText: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    lastMessage: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    italicText: {
        fontStyle: 'italic',
        color: COLORS.textLight,
    },
    separator: {
        height: 1,
        backgroundColor: COLORS.border,
        marginLeft: 82,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 8,
    },
    unreadText: {
        fontWeight: 'bold',
        color: COLORS.text,
    },
    unreadMessage: {
        fontWeight: '600',
        color: COLORS.text,
    },
    timeContainer: {
        alignItems: 'flex-end',
    },
    unreadTime: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
        marginTop: 4,
    },
});
