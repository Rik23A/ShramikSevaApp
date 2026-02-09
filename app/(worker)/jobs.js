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
import { COLORS, WORKER_TYPES } from '../../constants/config';
import { getJobs } from '../../services/jobService';
import JobCard from '../../components/JobCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';

export default function JobsScreen() {
    const { t } = useLanguage();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        workerType: '',
        workType: '',
        minSalary: '',
    });
    const [showFilters, setShowFilters] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const isFirstRender = useRef(true);

    const fetchJobs = async (pageNum = 1, isRefresh = false) => {
        try {
            const params = {
                pageNumber: pageNum,
                keyword: searchQuery || undefined,
                workerType: filters.workerType || undefined,
                workType: filters.workType || undefined,
                minSalary: filters.minSalary || undefined,
            };

            const data = await getJobs(params);

            if (isRefresh || pageNum === 1) {
                setJobs(data.jobs || []);
            } else {
                setJobs(prev => [...prev, ...(data.jobs || [])]);
            }

            setHasMore(data.page < data.pages);
            setPage(pageNum);
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            setPage(1);
            fetchJobs(1, true);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setPage(1);
        fetchJobs(1, true);
    }, [searchQuery, filters]);

    const handleSearch = () => {
        setLoading(true);
        setPage(1);
        fetchJobs(1, true);
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            fetchJobs(page + 1);
        }
    };

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={COLORS.textSecondary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={t('search_jobs_placeholder')}
                    placeholderTextColor={COLORS.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                />
                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setShowFilters(!showFilters)}
                >
                    <Ionicons
                        name="options"
                        size={20}
                        color={showFilters ? COLORS.primary : COLORS.textSecondary}
                    />
                </TouchableOpacity>
            </View>

            {/* Filters */}
            {showFilters && (
                <View style={styles.filtersContainer}>
                    <Text style={styles.filterLabel}>{t('filter_work_type')}</Text>
                    <View style={styles.filterOptions}>
                        <TouchableOpacity
                            style={[styles.filterOption, !filters.workType && styles.filterOptionActive]}
                            onPress={() => setFilters({ ...filters, workType: '' })}
                        >
                            <Text style={[styles.filterOptionText, !filters.workType && styles.filterOptionTextActive]}>{t('filter_all')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterOption, filters.workType === 'permanent' && styles.filterOptionActive]}
                            onPress={() => setFilters({ ...filters, workType: 'permanent' })}
                        >
                            <Text style={[styles.filterOptionText, filters.workType === 'permanent' && styles.filterOptionTextActive]}>{t('filter_permanent')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterOption, filters.workType === 'temporary' && styles.filterOptionActive]}
                            onPress={() => setFilters({ ...filters, workType: 'temporary' })}
                        >
                            <Text style={[styles.filterOptionText, filters.workType === 'temporary' && styles.filterOptionTextActive]}>{t('filter_temporary')}</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.applyFilterButton} onPress={handleSearch}>
                        <Text style={styles.applyFilterText}>{t('apply_filters')}</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    if (loading && jobs.length === 0) {
        return <LoadingSpinner fullScreen message={t('loading')} />;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={jobs}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <JobCard
                        job={item}
                        onPress={() => router.push(`/job-details/${item._id}`)}
                    />
                )}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={renderHeader()}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="briefcase-outline" size={60} color={COLORS.textSecondary} />
                        <Text style={styles.emptyTitle}>{t('no_jobs_found')}</Text>
                        <Text style={styles.emptySubtitle}>{t('no_jobs_sub')}</Text>
                    </View>
                }
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                }
                onEndReached={loadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={
                    loading && jobs.length > 0 ? <LoadingSpinner /> : null
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
    },
    headerContainer: {
        marginBottom: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: COLORS.text,
        paddingVertical: 8,
    },
    filterButton: {
        padding: 8,
    },
    filtersContainer: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 16,
        marginTop: 12,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    filterOptions: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    filterOption: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.background,
        marginRight: 8,
    },
    filterOptionActive: {
        backgroundColor: COLORS.primary,
    },
    filterOptionText: {
        fontSize: 13,
        color: COLORS.text,
    },
    filterOptionTextActive: {
        color: COLORS.white,
        fontWeight: '500',
    },
    applyFilterButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    applyFilterText: {
        color: COLORS.white,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
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
