import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    SafeAreaView
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import { getHiredJobs } from '../../services/jobService';
import { getFullImageUrl } from '../../utils/imageUtil';
import NotificationBell from '../../components/NotificationBell';

export default function HiredJobsScreen() {
    const router = useRouter();
    const [hiredJobs, setHiredJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState(null);

    const fetchData = useCallback(async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);
        try {
            const data = await getHiredJobs();
            setHiredJobs(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching hired jobs:', err);
            setError('Failed to load hired workers. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData(true);
    };

    const filteredJobs = hiredJobs.filter(job => {
        const matchesJobTitle = job.title?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesWorkerName = job.workers?.some(w =>
            w.workerId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return matchesJobTitle || matchesWorkerName;
    });

    const renderJobItem = ({ item }) => (
        <View style={styles.jobCard}>
            <View style={styles.jobHeader}>
                <View style={styles.jobTitleContainer}>
                    <Ionicons name="briefcase" size={20} color={COLORS.primary} />
                    <Text style={styles.jobTitle}>{item.title}</Text>
                </View>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.workers?.length || 0} Hired</Text>
                </View>
            </View>

            <View style={styles.workersList}>
                {item.workers?.map((workerObj, index) => {
                    const worker = workerObj.workerId;
                    if (!worker) return null;

                    return (
                        <TouchableOpacity
                            key={worker._id || index}
                            style={styles.workerItem}
                            onPress={() => router.push({
                                pathname: `/hired-job-details/${item._id}`,
                                params: { workerId: worker._id }
                            })}
                        >
                            {worker.profilePicture ? (
                                <Image
                                    source={{ uri: getFullImageUrl(worker.profilePicture) }}
                                    style={styles.workerAvatar}
                                />
                            ) : (
                                <View style={[styles.workerAvatar, { justifyContent: 'center', alignItems: 'center' }]}>
                                    <Ionicons name="person" size={24} color={COLORS.textSecondary} />
                                </View>
                            )}
                            <View style={styles.workerInfo}>
                                <Text style={styles.workerName}>{worker.name}</Text>
                                <Text style={styles.workerType}>{worker.workerType || 'General Worker'}</Text>
                            </View>
                            <View style={[
                                styles.statusBadge,
                                { backgroundColor: workerObj.status === 'completed' ? '#E8F5E9' : '#FFF3E0' }
                            ]}>
                                <Text style={[
                                    styles.statusText,
                                    { color: workerObj.status === 'completed' ? '#2E7D32' : '#EF6C00' }
                                ]}>
                                    {workerObj.status === 'completed' ? 'COMPLETED' : 'IN PROGRESS'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen
                options={{
                    headerTitle: 'Hired Workers',
                    headerRight: () => <NotificationBell iconColor={COLORS.white} />,
                }}
            />

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by Job or Worker Name..."
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                />
                {searchTerm !== '' && (
                    <TouchableOpacity onPress={() => setSearchTerm('')}>
                        <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            {loading && !refreshing ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : error ? (
                <View style={styles.centerContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => fetchData()}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : filteredJobs.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Ionicons name="people-outline" size={64} color={COLORS.textSecondary} style={{ opacity: 0.5 }} />
                    <Text style={styles.noDataText}>
                        {searchTerm ? 'No hired workers match your search.' : 'You haven\'t hired any workers yet.'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredJobs}
                    renderItem={renderJobItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
        height: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
    },
    listContainer: {
        padding: 16,
        paddingTop: 0,
    },
    jobCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    jobHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F1F7FF',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    jobTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    jobTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginLeft: 8,
        flex: 1,
    },
    badge: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    badgeText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: 'bold',
    },
    workersList: {
        padding: 8,
    },
    workerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#FCFDFF',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#EDF2F7',
    },
    workerAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.background,
    },
    workerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    workerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    workerType: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginRight: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    errorText: {
        color: '#D32F2F',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryText: {
        color: COLORS.white,
        fontWeight: 'bold',
    },
    noDataText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 16,
    },
});
