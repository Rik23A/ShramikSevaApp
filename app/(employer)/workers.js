import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import { searchWorkers } from '../../services/userService';
import WorkerCard from '../../components/WorkerCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function WorkersScreen() {
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchWorkers = async (query = '') => {
        try {
            const data = await searchWorkers({ keyword: query || undefined });
            setWorkers(data?.workers || data || []);
        } catch (error) {
            console.error('Failed to fetch workers:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchWorkers();
    }, []);

    // Real-time debounced search
    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            fetchWorkers(searchQuery);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleSearch = () => {
        setLoading(true);
        fetchWorkers(searchQuery);
    };

    if (loading && workers.length === 0) {
        return <LoadingSpinner fullScreen message="Finding workers..." />;
    }

    return (
        <View style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={COLORS.textSecondary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by skill or worker type..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                />
            </View>

            <FlatList
                data={workers}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <WorkerCard
                        worker={item}
                        onPress={() => router.push(`/worker/${item._id}`)}
                    />
                )}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={60} color={COLORS.textSecondary} />
                        <Text style={styles.emptyTitle}>No Workers Found</Text>
                        <Text style={styles.emptySubtitle}>Try adjusting your search</Text>
                    </View>
                }
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchWorkers(searchQuery); }}
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        margin: 16,
        marginBottom: 8,
        borderRadius: 12,
        paddingHorizontal: 12,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        color: COLORS.text,
        paddingVertical: 12,
    },
    listContent: {
        padding: 16,
        paddingTop: 8,
        flexGrow: 1,
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
