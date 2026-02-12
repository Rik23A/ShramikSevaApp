import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TextInput,
    TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import { searchWorkers } from '../../services/userService';
import { getMyJobs } from '../../services/jobService';
import WorkerCard from '../../components/WorkerCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import WorkerFilterModal from '../../components/WorkerFilterModal';

export default function WorkersScreen() {
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Advanced Filters State
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [filters, setFilters] = useState({
        jobId: '',
        workerType: '',
        location: '',
        availability: '',
    });
    const [activeFiltersCount, setActiveFiltersCount] = useState(0);

    // Jobs for Smart Recommendations
    const [jobs, setJobs] = useState([]);

    const fetchJobs = async () => {
        try {
            const data = await getMyJobs();
            // Filter only active jobs (open or in-progress)
            const activeJobs = (data.jobs || data || []).filter(
                job => job.status === 'open' || job.status === 'in-progress'
            );
            setJobs(activeJobs);
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
        }
    };

    const fetchWorkers = async (query = '', currentFilters = filters) => {
        try {
            // Prepare params based on filters
            const params = {
                keyword: query || undefined,
            };

            // If a job is selected, use it for smart recommendations
            if (currentFilters.jobId) {
                params.jobId = currentFilters.jobId;
            } else {
                // Otherwise apply manual filters
                if (currentFilters.workerType) params.workerType = currentFilters.workerType;
                if (currentFilters.location) params.location = currentFilters.location;
            }

            // Availability always applies
            if (currentFilters.availability) params.availability = currentFilters.availability;

            const data = await searchWorkers(params);
            setWorkers(data?.workers || data || []);
        } catch (error) {
            console.error('Failed to fetch workers:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchJobs();
        fetchWorkers();
    }, []);

    // Calculate active filters count for badge
    useEffect(() => {
        let count = 0;
        if (filters.jobId) count++;
        if (filters.workerType) count++;
        if (filters.location) count++;
        if (filters.availability) count++;
        setActiveFiltersCount(count);
    }, [filters]);

    // Real-time debounced search
    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            fetchWorkers(searchQuery, filters);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, filters]);

    const handleSearch = () => {
        setLoading(true);
        fetchWorkers(searchQuery, filters);
    };

    const handleApplyFilters = (newFilters) => {
        setFilters(newFilters);
        setIsFilterVisible(false);
        setLoading(true);
    };

    if (loading && workers.length === 0) {
        return <LoadingSpinner fullScreen message="Finding workers..." />;
    }

    return (
        <View style={styles.container}>
            {/* Search Bar & Filter Button */}
            <View style={styles.headerContainer}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={COLORS.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by skill or name..."
                        placeholderTextColor={COLORS.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.filterButton, activeFiltersCount > 0 && styles.activeFilterButton]}
                    onPress={() => setIsFilterVisible(true)}
                >
                    <Ionicons
                        name={activeFiltersCount > 0 ? "filter" : "filter-outline"}
                        size={24}
                        color={activeFiltersCount > 0 ? COLORS.white : COLORS.primary}
                    />
                    {activeFiltersCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{activeFiltersCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Active Filters Summary (Optional) */}
            {filters.jobId && (
                <View style={styles.recommendationBanner}>
                    <Text style={styles.recommendationText}>
                        ✨ Showing recommendations for job: <Text style={{ fontWeight: '700' }}>{jobs.find(j => j._id === filters.jobId)?.title}</Text>
                    </Text>
                    <TouchableOpacity onPress={() => setFilters(prev => ({ ...prev, jobId: '' }))}>
                        <Ionicons name="close-circle" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>
            )}

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
                        <Text style={styles.emptySubtitle}>Try adjusting your search or filters</Text>
                        {activeFiltersCount > 0 && (
                            <TouchableOpacity style={styles.clearFiltersBtn} onPress={() => setFilters({
                                jobId: '', workerType: '', location: '', availability: ''
                            })}>
                                <Text style={styles.clearFiltersText}>Clear All Filters</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchJobs(); fetchWorkers(searchQuery, filters); }}
                    />
                }
            />

            <WorkerFilterModal
                visible={isFilterVisible}
                onClose={() => setIsFilterVisible(false)}
                onApply={handleApplyFilters}
                initialFilters={filters}
                jobs={jobs}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        gap: 12,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 50,
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
        height: '100%',
    },
    filterButton: {
        width: 50,
        height: 50,
        backgroundColor: COLORS.card,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        position: 'relative',
    },
    activeFilterButton: {
        backgroundColor: COLORS.primary,
    },
    badge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: COLORS.danger,
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.background,
    },
    badgeText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    recommendationBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#E3F2FD',
        marginHorizontal: 16,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#BBDEFB',
        marginBottom: 8,
    },
    recommendationText: {
        fontSize: 13,
        color: COLORS.primary,
        flex: 1,
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
    clearFiltersBtn: {
        marginTop: 16,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: COLORS.backgroundDark,
        borderRadius: 20,
    },
    clearFiltersText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 14,
    },
});
