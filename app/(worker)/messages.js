import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import { getConversations } from '../../services/messageService';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function MessagesScreen() {
    const { user } = useAuth();
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

    if (loading) {
        return <LoadingSpinner fullScreen message="Loading messages..." />;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={conversations}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => {
                    const otherUser = item.members?.find(m => m._id !== user?._id) || {};
                    return (
                        <Card
                            onPress={() => router.push(`/chat/${item._id}`)}
                            style={styles.conversationCard}
                        >
                            <View style={styles.avatar}>
                                <Ionicons name="person" size={24} color={COLORS.textSecondary} />
                            </View>
                            <View style={styles.conversationInfo}>
                                <Text style={styles.userName}>{otherUser.name || 'User'}</Text>
                                <Text style={styles.lastMessage} numberOfLines={1}>
                                    Tap to view conversation
                                </Text>
                            </View>
                        </Card>
                    );
                }}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubbles-outline" size={60} color={COLORS.textSecondary} />
                        <Text style={styles.emptyTitle}>No Conversations</Text>
                        <Text style={styles.emptySubtitle}>Start chatting with employers</Text>
                    </View>
                }
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchConversations(); }}
                    />
                }
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
        padding: 16,
        flexGrow: 1,
    },
    conversationCard: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    conversationInfo: {
        flex: 1,
        marginLeft: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    lastMessage: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 2,
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
});
