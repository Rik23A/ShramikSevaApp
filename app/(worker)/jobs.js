import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, WORKER_TYPES, WORKER_SKILLS, SALARY_RANGES, EXPERIENCE_RANGES } from '../../constants/config';
import { getJobs, getWorkerApplications } from '../../services/jobService';
import JobCard from '../../components/JobCard';
import AppliedJobCard from '../../components/AppliedJobCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

export default function JobsScreen() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [recommendedJobs, setRecommendedJobs] = useState([]);
    const [appliedJobs, setAppliedJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingRecommended, setLoadingRecommended] = useState(false);
    const [loadingApplied, setLoadingApplied] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        location: '',
        workerType: '',
        skills: [],
        workType: '',
        salaryRange: 'any',
        experienceRange: 'any',
        minSalary: '',
        maxSalary: '',
        minExperience: '',
        maxExperience: '',
    });
    const [showFilters, setShowFilters] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const isFirstRender = useRef(true);

    const fetchRecommendedJobs = async () => {
        if (!user || user.role !== 'worker') return;

        const hasPreferences = (user.skills?.length > 0) || (user.workerType?.length > 0);

        try {
            setLoadingRecommended(true);
            const params = {
                skills: user.skills?.length > 0 ? user.skills.join(",") : undefined,
                workerType: user.workerType?.length > 0 ? user.workerType.join(",") : undefined,
                pageNumber: 1,
                limit: 10,
            };

            const data = await getJobs(params);
            setRecommendedJobs(data.jobs || []);
        } catch (error) {
            console.error('Failed to fetch recommended jobs:', error);
        } finally {
            setLoadingRecommended(false);
        }
    };

    const fetchAppliedJobs = async () => {
        if (!user || user.role !== 'worker') return;
        try {
            setLoadingApplied(true);
            const data = await getWorkerApplications();
            setAppliedJobs(data || []);
        } catch (error) {
            console.error('Failed to fetch applied jobs:', error);
        } finally {
            setLoadingApplied(false);
        }
    };

    const fetchJobs = async (pageNum = 1, isRefresh = false) => {
        try {
            // Get salary range values
            const salaryRange = SALARY_RANGES.find(r => r.key === filters.salaryRange);
            const minSalary = filters.salaryRange === 'any' ? undefined : (salaryRange?.min || filters.minSalary);
            const maxSalary = filters.salaryRange === 'any' ? undefined : (salaryRange?.max || filters.maxSalary);

            // Get experience range values
            const expRange = EXPERIENCE_RANGES.find(r => r.key === filters.experienceRange);
            const minExperience = filters.experienceRange === 'any' ? undefined : (expRange?.min || filters.minExperience);
            const maxExperience = filters.experienceRange === 'any' ? undefined : (expRange?.max || filters.maxExperience);

            const params = {
                pageNumber: pageNum,
                keyword: searchQuery || undefined,
                location: filters.location || undefined,
                workerType: filters.workerType || undefined,
                skills: filters.skills?.length > 0 ? filters.skills.join(',') : undefined,
                workType: filters.workType || undefined,
                minSalary,
                maxSalary,
                minExperience,
                maxExperience,
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
        fetchRecommendedJobs();
        fetchAppliedJobs();
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
        Promise.all([
            fetchJobs(1, true),
            fetchRecommendedJobs(),
            fetchAppliedJobs()
        ]).finally(() => setRefreshing(false));
    }, [searchQuery, filters]);

    const handleSearch = () => {
        setLoading(true);
        setPage(1);
        fetchJobs(1, true);
        setShowFilters(false);
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            fetchJobs(page + 1);
        }
    };

    // Check if any filters are active
    const hasActiveFilters = filters.location || filters.workerType || filters.skills?.length > 0 ||
        filters.workType || filters.salaryRange !== 'any' || filters.experienceRange !== 'any';

    // Remove individual filter
    const removeFilter = (filterKey) => {
        setFilters({ ...filters, [filterKey]: '' });
        setLoading(true);
        setPage(1);
        fetchJobs(1, true);
    };

    // Clear all filters
    const clearAllFilters = () => {
        setFilters({
            location: '',
            workerType: '',
            skills: [],
            workType: '',
            salaryRange: 'any',
            experienceRange: 'any',
            minSalary: '',
            maxSalary: '',
            minExperience: '',
            maxExperience: ''
        });
        setLoading(true);
        setPage(1);
        fetchJobs(1, true);
    };

    const renderHeader = () => (
        <View>
            {/* Search Bar */}
            <View style={styles.headerContainer}>
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
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.filterButton}
                        onPress={() => setShowFilters(true)}
                    >
                        <Ionicons
                            name="options"
                            size={20}
                            color={COLORS.primary}
                        />
                        {hasActiveFilters && <View style={styles.filterBadge} />}
                    </TouchableOpacity>
                </View>

                {/* Active Filter Chips */}
                {hasActiveFilters && (
                    <View style={styles.activeFiltersContainer}>
                        {filters.location && (
                            <View style={styles.filterChip}>
                                <Text style={styles.filterChipText}>📍 {filters.location}</Text>
                                <TouchableOpacity onPress={() => removeFilter('location')}>
                                    <Ionicons name="close-circle" size={16} color={COLORS.white} />
                                </TouchableOpacity>
                            </View>
                        )}
                        {filters.workerType && (
                            <View style={styles.filterChip}>
                                <Text style={styles.filterChipText}>{filters.workerType}</Text>
                                <TouchableOpacity onPress={() => removeFilter('workerType')}>
                                    <Ionicons name="close-circle" size={16} color={COLORS.white} />
                                </TouchableOpacity>
                            </View>
                        )}
                        {filters.skills && filters.skills.length > 0 && (
                            <View style={styles.filterChip}>
                                <Text style={styles.filterChipText} numberOfLines={1}>
                                    {filters.skills.length} skill{filters.skills.length > 1 ? 's' : ''}
                                </Text>
                                <TouchableOpacity onPress={() => removeFilter('skills')}>
                                    <Ionicons name="close-circle" size={16} color={COLORS.white} />
                                </TouchableOpacity>
                            </View>
                        )}
                        {filters.workType && (
                            <View style={styles.filterChip}>
                                <Text style={styles.filterChipText}>{t(`filter_${filters.workType}`)}</Text>
                                <TouchableOpacity onPress={() => removeFilter('workType')}>
                                    <Ionicons name="close-circle" size={16} color={COLORS.white} />
                                </TouchableOpacity>
                            </View>
                        )}
                        {filters.salaryRange && filters.salaryRange !== 'any' && (
                            <View style={styles.filterChip}>
                                <Text style={styles.filterChipText}>
                                    {SALARY_RANGES.find(r => r.key === filters.salaryRange)?.label}
                                </Text>
                                <TouchableOpacity onPress={() => setFilters({ ...filters, salaryRange: 'any' })}>
                                    <Ionicons name="close-circle" size={16} color={COLORS.white} />
                                </TouchableOpacity>
                            </View>
                        )}
                        {filters.experienceRange && filters.experienceRange !== 'any' && (
                            <View style={styles.filterChip}>
                                <Text style={styles.filterChipText}>
                                    {EXPERIENCE_RANGES.find(r => r.key === filters.experienceRange)?.label}
                                </Text>
                                <TouchableOpacity onPress={() => setFilters({ ...filters, experienceRange: 'any' })}>
                                    <Ionicons name="close-circle" size={16} color={COLORS.white} />
                                </TouchableOpacity>
                            </View>
                        )}
                        <TouchableOpacity onPress={clearAllFilters}>
                            <Text style={styles.clearAllText}>Clear All</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Recommended Jobs */}
            {recommendedJobs.length > 0 && (
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="sparkles" size={18} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>{t('recommended_jobs') || "Recommended for You"}</Text>
                    </View>
                    <FlatList
                        horizontal
                        data={recommendedJobs}
                        keyExtractor={(item) => `rec-${item._id}`}
                        renderItem={({ item }) => (
                            <View style={{ width: 300, marginRight: 12 }}>
                                <JobCard
                                    job={item}
                                    onPress={() => router.push(`/job-details/${item._id}`)}
                                    isRecommended={true}
                                />
                            </View>
                        )}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalListContent}
                    />
                </View>
            )}

            {/* Applied Jobs */}
            {appliedJobs.length > 0 && (
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="briefcase" size={18} color="#2196F3" />
                        <Text style={styles.sectionTitle}>{t('applied_jobs') || "Applied Jobs"}</Text>
                    </View>
                    <FlatList
                        horizontal
                        data={appliedJobs}
                        keyExtractor={(item) => `app-${item._id}`}
                        renderItem={({ item }) => (
                            <AppliedJobCard
                                application={item}
                                onPress={() => router.push({ pathname: '/(worker)/my-work', params: { tab: 'applications' } })}
                            />
                        )}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalListContent}
                    />
                </View>
            )}

            <View style={[styles.sectionHeader, { paddingHorizontal: 16, marginTop: 16, marginBottom: 8 }]}>
                <Text style={styles.sectionTitle}>{searchQuery ? 'Search Results' : 'All Jobs'}</Text>
            </View>
        </View>
    );

    const FilterModal = () => {
        // Local state to prevent input lag
        const [localFilters, setLocalFilters] = useState(filters);
        const [showDropdown, setShowDropdown] = useState(false);
        const [dropdownType, setDropdownType] = useState('');
        const [dropdownOptions, setDropdownOptions] = useState([]);
        const [dropdownTitle, setDropdownTitle] = useState('');
        const [isMultiSelect, setIsMultiSelect] = useState(false);

        // Sync with parent filters when modal opens
        useEffect(() => {
            if (showFilters) {
                setLocalFilters(filters);
            }
        }, [showFilters]);

        const openDropdown = (type, title, options, multiSelect = false) => {
            setDropdownType(type);
            setDropdownTitle(title);
            setDropdownOptions(options);
            setIsMultiSelect(multiSelect);
            setShowDropdown(true);
        };

        const handleDropdownSelect = (value) => {
            if (dropdownType === 'workerType') {
                setLocalFilters({ ...localFilters, workerType: value, skills: [] });
                setShowDropdown(false);
            } else if (dropdownType === 'skills') {
                const currentSkills = localFilters.skills || [];
                const newSkills = currentSkills.includes(value)
                    ? currentSkills.filter(s => s !== value)
                    : [...currentSkills, value];
                setLocalFilters({ ...localFilters, skills: newSkills });
            } else if (dropdownType === 'salaryRange') {
                setLocalFilters({ ...localFilters, salaryRange: value });
                setShowDropdown(false);
            } else if (dropdownType === 'experienceRange') {
                setLocalFilters({ ...localFilters, experienceRange: value });
                setShowDropdown(false);
            }
        };

        const handleApply = () => {
            setFilters(localFilters);
            setShowFilters(false);
            handleSearch();
        };

        const handleReset = () => {
            const resetFilters = {
                location: '',
                workerType: '',
                skills: [],
                workType: '',
                salaryRange: 'any',
                experienceRange: 'any',
                minSalary: '',
                maxSalary: '',
                minExperience: '',
                maxExperience: ''
            };
            setLocalFilters(resetFilters);
        };

        const availableSkills = localFilters.workerType ? (WORKER_SKILLS[localFilters.workerType] || []) : [];

        return (
            <>
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={showFilters}
                    onRequestClose={() => setShowFilters(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{t('filters')}</Text>
                                <TouchableOpacity onPress={() => setShowFilters(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                                {/* Location Filter */}
                                <View style={styles.filterSection}>
                                    <Text style={styles.filterLabel}>{t('location') || 'Location'}</Text>
                                    <TextInput
                                        style={styles.filterInput}
                                        placeholder={t('location_placeholder') || 'Enter city or area'}
                                        placeholderTextColor={COLORS.textSecondary}
                                        value={localFilters.location}
                                        onChangeText={(text) => setLocalFilters({ ...localFilters, location: text })}
                                    />
                                </View>

                                {/* Worker Type Dropdown */}
                                <View style={styles.filterSection}>
                                    <Text style={styles.filterLabel}>{t('worker_type') || 'Worker Type'}</Text>
                                    <TouchableOpacity
                                        style={styles.dropdownButton}
                                        onPress={() => openDropdown('workerType', t('worker_type') || 'Worker Type', WORKER_TYPES, false)}
                                    >
                                        <Text style={[styles.dropdownText, !localFilters.workerType && styles.placeholderText]}>
                                            {localFilters.workerType || (t('select_worker_type') || 'Select worker type')}
                                        </Text>
                                        <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                                    </TouchableOpacity>
                                </View>

                                {/* Skills Multi-Select */}
                                <View style={styles.filterSection}>
                                    <Text style={styles.filterLabel}>{t('skills') || 'Skills'}</Text>
                                    <TouchableOpacity
                                        style={styles.dropdownButton}
                                        onPress={() => {
                                            if (availableSkills.length > 0) {
                                                openDropdown('skills', t('skills') || 'Skills', availableSkills, true);
                                            }
                                        }}
                                        disabled={!localFilters.workerType}
                                    >
                                        <Text style={[styles.dropdownText, (!localFilters.skills || localFilters.skills.length === 0) && styles.placeholderText]} numberOfLines={2}>
                                            {localFilters.skills && localFilters.skills.length > 0
                                                ? localFilters.skills.join(', ')
                                                : (localFilters.workerType ? (t('select_skills') || 'Select skills') : (t('select_worker_type_first') || 'Select worker type first'))}
                                        </Text>
                                        <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                                    </TouchableOpacity>
                                </View>

                                {/* Work Type Chips */}
                                <View style={styles.filterSection}>
                                    <Text style={styles.filterLabel}>{t('filter_work_type')}</Text>
                                    <View style={styles.filterOptions}>
                                        {['', 'permanent', 'temporary'].map((type) => (
                                            <TouchableOpacity
                                                key={type}
                                                style={[styles.filterOption, localFilters.workType === type && styles.filterOptionActive]}
                                                onPress={() => setLocalFilters({ ...localFilters, workType: type })}
                                            >
                                                <Text style={[styles.filterOptionText, localFilters.workType === type && styles.filterOptionTextActive]}>
                                                    {type === '' ? t('filter_all') : t(`filter_${type}`)}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                {/* Salary Range Dropdown */}
                                <View style={styles.filterSection}>
                                    <Text style={styles.filterLabel}>{t('salary_range') || 'Salary Range'}</Text>
                                    <TouchableOpacity
                                        style={styles.dropdownButton}
                                        onPress={() => openDropdown('salaryRange', t('salary_range') || 'Salary Range', SALARY_RANGES.map(r => ({ key: r.key, label: r.label })), false)}
                                    >
                                        <Text style={[styles.dropdownText, localFilters.salaryRange === 'any' && styles.placeholderText]}>
                                            {SALARY_RANGES.find(r => r.key === localFilters.salaryRange)?.label || 'Any'}
                                        </Text>
                                        <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                                    </TouchableOpacity>
                                </View>

                                {/* Experience Range Dropdown */}
                                <View style={styles.filterSection}>
                                    <Text style={styles.filterLabel}>{t('experience_range') || 'Experience Range'}</Text>
                                    <TouchableOpacity
                                        style={styles.dropdownButton}
                                        onPress={() => openDropdown('experienceRange', t('experience_range') || 'Experience Range', EXPERIENCE_RANGES.map(r => ({ key: r.key, label: r.label })), false)}
                                    >
                                        <Text style={[styles.dropdownText, localFilters.experienceRange === 'any' && styles.placeholderText]}>
                                            {EXPERIENCE_RANGES.find(r => r.key === localFilters.experienceRange)?.label || 'Any'}
                                        </Text>
                                        <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>

                            <View style={styles.modalFooter}>
                                <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                                    <Text style={styles.resetButtonText}>Reset</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.applyFilterButton} onPress={handleApply}>
                                    <Text style={styles.applyFilterText}>{t('apply_filters')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Dropdown Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={showDropdown}
                    onRequestClose={() => setShowDropdown(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.dropdownModal}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{dropdownTitle}</Text>
                                <TouchableOpacity onPress={() => setShowDropdown(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.text} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={styles.dropdownList}>
                                {dropdownOptions.map((option) => {
                                    const optionKey = typeof option === 'string' ? option : option.key;
                                    const optionLabel = typeof option === 'string' ? option : option.label;
                                    const isSelected = isMultiSelect
                                        ? (localFilters.skills || []).includes(optionKey)
                                        : (dropdownType === 'workerType' ? localFilters.workerType === optionKey :
                                            dropdownType === 'salaryRange' ? localFilters.salaryRange === optionKey :
                                                localFilters.experienceRange === optionKey);

                                    return (
                                        <TouchableOpacity
                                            key={optionKey}
                                            style={[styles.dropdownOption, isSelected && styles.dropdownOptionSelected]}
                                            onPress={() => handleDropdownSelect(optionKey)}
                                        >
                                            <Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextSelected]}>
                                                {optionLabel}
                                            </Text>
                                            {isSelected && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                            {isMultiSelect && (
                                <View style={styles.modalFooter}>
                                    <TouchableOpacity style={styles.applyFilterButton} onPress={() => setShowDropdown(false)}>
                                        <Text style={styles.applyFilterText}>Done</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                </Modal>
            </>
        );
    };


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
                    !loading && (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="briefcase-outline" size={60} color={COLORS.textSecondary} />
                            <Text style={styles.emptyTitle}>{t('no_jobs_found')}</Text>
                            <Text style={styles.emptySubtitle}>{t('no_jobs_sub')}</Text>
                        </View>
                    )
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
            <FilterModal />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    listContent: {
        paddingBottom: 20,
    },
    headerContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        marginBottom: 16,
    },
    sectionContainer: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    horizontalListContent: {
        paddingHorizontal: 16,
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
        position: 'relative',
    },
    filterBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF5252',
    },
    clearButton: {
        padding: 4,
    },
    activeFiltersContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginTop: 12,
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    filterChipText: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: '500',
    },
    clearAllText: {
        color: COLORS.primary,
        fontSize: 13,
        fontWeight: '600',
        textDecorationLine: 'underline',
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
    },
    modalBody: {
        padding: 20,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
        marginTop: 16,
    },
    filterOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8, // Gap support in React Native is limited, might need margin
    },
    filterOption: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.background,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    filterOptionActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    filterOptionText: {
        fontSize: 13,
        color: COLORS.text,
    },
    filterOptionTextActive: {
        color: COLORS.white,
        fontWeight: '500',
    },
    filterInput: {
        backgroundColor: COLORS.background,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        gap: 16,
    },
    resetButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    resetButtonText: {
        color: COLORS.text,
        fontWeight: '600',
        fontSize: 16,
    },
    applyFilterButton: {
        flex: 2,
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    applyFilterText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 16,
    },
    filterSection: {
        marginBottom: 20,
    },
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        minHeight: 50,
    },
    dropdownText: {
        fontSize: 16,
        color: COLORS.text,
        flex: 1,
        marginRight: 8,
    },
    placeholderText: {
        color: COLORS.textSecondary,
    },
    dropdownModal: {
        backgroundColor: COLORS.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '70%',
        width: '100%',
        position: 'absolute',
        bottom: 0,
    },
    dropdownList: {
        maxHeight: 400,
        paddingHorizontal: 20,
    },
    dropdownOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    dropdownOptionSelected: {
        backgroundColor: COLORS.primaryLight + '10',
    },
    dropdownOptionText: {
        fontSize: 16,
        color: COLORS.text,
        flex: 1,
    },
    dropdownOptionTextSelected: {
        color: COLORS.primary,
        fontWeight: '600',
    },
});
