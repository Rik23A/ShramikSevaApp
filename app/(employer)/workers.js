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
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { searchWorkers } from '../../services/userService';
import { getMyJobs } from '../../services/jobService';
import WorkerCard from '../../components/WorkerCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import WorkerFilterModal from '../../components/WorkerFilterModal';

export default function WorkersScreen() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [deviceCoords, setDeviceCoords] = useState(null);

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

    // Fetch device coordinates for distance calculation
    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    if (isMounted && loc?.coords) {
                        setDeviceCoords({
                            latitude: loc.coords.latitude,
                            longitude: loc.coords.longitude,
                        });
                    }
                }
            } catch (err) {
                console.log('Location fetch error in workers screen:', err);
            }
        })();
        return () => { isMounted = false; };
    }, []);

    const getReferenceCoords = useCallback(() => {
        if (filters.jobId) {
            const selectedJob = jobs.find(j => j._id === filters.jobId);
            if (selectedJob?.location?.coordinates && selectedJob.location.coordinates.length === 2) {
                return {
                    longitude: selectedJob.location.coordinates[0],
                    latitude: selectedJob.location.coordinates[1],
                };
            }
        }
        if (deviceCoords) {
            return deviceCoords;
        }
        if (user?.location?.coordinates && user.location.coordinates.length === 2) {
            return {
                longitude: user.location.coordinates[0],
                latitude: user.location.coordinates[1],
            };
        }
        return null;
    }, [filters.jobId, jobs, deviceCoords, user]);

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

            // Include coordinates for distance calculation and proximity sorting
            const refCoords = getReferenceCoords();
            if (refCoords) {
                params.lat = refCoords.latitude;
                params.lng = refCoords.longitude;
            }

            const data = await searchWorkers(params);
            setWorkers(data?.workers || data || []);
        } catch (error) {
            console.error('Failed to fetch workers:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchLatestRef = useRef();

    useEffect(() => {
        fetchLatestRef.current = () => {
            fetchJobs();
            fetchWorkers(searchQuery, filters);
        };
    });

    useFocusEffect(
        useCallback(() => {
            if (fetchLatestRef.current) fetchLatestRef.current();
        }, [])
    );

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
        return <LoadingSpinner fullScreen message={t('finding_workers')} />;
    }

    return (
        <View style={styles.container}>
            {/* Search Bar & Filter Button */}
            <View style={styles.headerContainer}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={COLORS.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('search_workers_placeholder')}
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
                        ✨ {t('showing_recommendations')} <Text style={{ fontWeight: '700' }}>{jobs.find(j => j._id === filters.jobId)?.title}</Text>
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
                        employerCoords={getReferenceCoords()}
                        onPress={() => router.push(`/worker/${item._id}`)}
                        onWorkerUpdated={(updatedWorker) => {
                            setWorkers(prev => prev.map(w => w._id === updatedWorker._id ? updatedWorker : w));
                        }}
                    />
                )}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={60} color={COLORS.textSecondary} />
                        <Text style={styles.emptyTitle}>{t('no_workers_found')}</Text>
                        <Text style={styles.emptySubtitle}>{t('no_jobs_sub')}</Text>
                        {activeFiltersCount > 0 && (
                            <TouchableOpacity style={styles.clearFiltersBtn} onPress={() => setFilters({
                                jobId: '', workerType: '', location: '', availability: ''
                            })}>
                                <Text style={styles.clearFiltersText}>{t('clear_all')}</Text>
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
