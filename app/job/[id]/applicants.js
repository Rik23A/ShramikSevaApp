import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
    Image,
    Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS } from '../../../constants/config';
import { getJobById, hireWorker, rejectApplicant } from '../../../services/jobService';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { getFullImageUrl } from '../../../utils/imageUtil';

export default function JobApplicantsScreen() {
    const { id } = useLocalSearchParams();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        fetchJobDetails();
    }, [id]);

    const fetchJobDetails = async () => {
        try {
            const data = await getJobById(id);
            setJob(data);
        } catch (error) {
            console.error('Failed to fetch job:', error);
            Alert.alert('Error', 'Failed to load job details');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleHire = async (workerId, workerName) => {
        Alert.alert(
            'Confirm Hire',
            `Are you sure you want to hire ${workerName} for this job?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Hire',
                    onPress: async () => {
                        try {
                            setActionLoading(workerId);
                            await hireWorker(id, workerId);
                            Alert.alert('Success', `${workerName} has been hired!`);
                            fetchJobDetails();
                        } catch (error) {
                            Alert.alert('Error', error.response?.data?.message || 'Failed to hire worker');
                        } finally {
                            setActionLoading(null);
                        }
                    }
                }
            ]
        );
    };

    const handleReject = async (applicantId, workerName) => {
        Alert.alert(
            'Confirm Rejection',
            `Are you sure you want to reject ${workerName}'s application?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setActionLoading(applicantId);
                            await rejectApplicant(id, applicantId);
                            Alert.alert('Done', 'Application rejected');
                            fetchJobDetails();
                        } catch (error) {
                            Alert.alert('Error', error.response?.data?.message || 'Failed to reject applicant');
                        } finally {
                            setActionLoading(null);
                        }
                    }
                }
            ]
        );
    };

    const renderStars = (rating) => {
        const stars = [];
        const fullStars = Math.floor(rating || 0);
        for (let i = 0; i < 5; i++) {
            stars.push(
                <Ionicons
                    key={i}
                    name={i < fullStars ? "star" : "star-outline"}
                    size={12}
                    color="#FFD700"
                />
            );
        }
        return stars;
    };

    const getWorkerId = (workerOrId) => {
        if (!workerOrId) return null;
        return workerOrId._id || workerOrId;
    };

    const handleCall = (mobile) => {
        if (!mobile) {
            Alert.alert('Info', 'Mobile number not available');
            return;
        }
        Linking.openURL(`tel:${mobile}`);
    };

    const handleWhatsApp = (mobile) => {
        if (!mobile) {
            Alert.alert('Info', 'Mobile number not available');
            return;
        }
        Linking.openURL(`whatsapp://send?phone=${mobile}`);
    };

    const renderApplicant = ({ item, index }) => {
        const worker = item.worker || item;

        // Robust check for Hired status
        const isHired = job?.workers?.some(hw => {
            const hiredWorkerId = getWorkerId(hw.workerId)?.toString();
            const currentWorkerId = worker._id?.toString();
            return hiredWorkerId && currentWorkerId && hiredWorkerId === currentWorkerId;
        });

        return (
            <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
                <View style={styles.applicantCard}>
                    <View style={styles.cardHeader}>
                        <TouchableOpacity
                            style={styles.applicantInfo}
                            onPress={() => router.push(`/worker/${worker._id}`)}
                        >
                            <View style={styles.avatar}>
                                {worker.profilePicture ? (
                                    <Image source={{ uri: getFullImageUrl(worker.profilePicture) }} style={styles.avatarImage} />
                                ) : (
                                    <Ionicons name="person" size={24} color={COLORS.textSecondary} />
                                )}
                            </View>
                            <View style={styles.workerDetails}>
                                <Text style={styles.workerName}>{worker.name || 'Worker'}</Text>
                                <View style={styles.ratingRow}>
                                    {renderStars(worker.rating)}
                                    <Text style={styles.ratingText}>({worker.rating?.toFixed(1) || '0.0'})</Text>
                                </View>
                                {worker.workerType && worker.workerType.length > 0 && (
                                    <Text style={styles.workerType} numberOfLines={1}>
                                        {worker.workerType.slice(0, 2).join(', ')}
                                    </Text>
                                )}
                                <Text style={styles.experience}>
                                    {worker.isFresher ? 'Fresher' : `${worker.experience || 0} yrs exp`}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.contactContainer}>
                            <TouchableOpacity
                                style={[styles.contactButton, { backgroundColor: '#25D366' }]} // WhatsApp Green
                                onPress={() => handleWhatsApp(worker.mobile)}
                            >
                                <Ionicons name="logo-whatsapp" size={20} color={COLORS.white} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.contactButton, { backgroundColor: COLORS.success }]}
                                onPress={() => handleCall(worker.mobile)}
                            >
                                <Ionicons name="call" size={20} color={COLORS.white} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {isHired ? (
                        <View style={styles.hiredBadge}>
                            <Ionicons name="checkmark-circle" size={16} color={COLORS.white} />
                            <Text style={styles.hiredText}>Hired</Text>
                        </View>
                    ) : (
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={styles.hireButton}
                                onPress={() => handleHire(worker._id, worker.name)}
                                disabled={actionLoading === worker._id}
                            >
                                {actionLoading === worker._id ? (
                                    <Text style={styles.hireButtonText}>...</Text>
                                ) : (
                                    <>
                                        <Ionicons name="checkmark" size={16} color={COLORS.white} />
                                        <Text style={styles.hireButtonText}>Hire</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.rejectButton}
                                onPress={() => handleReject(item._id, worker.name)}
                                disabled={actionLoading === item._id}
                            >
                                <Ionicons name="close" size={16} color={COLORS.danger} />
                                <Text style={styles.rejectButtonText}>Reject</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Animated.View>
        );
    };

    if (loading) {
        return <LoadingSpinner fullScreen message="Loading applicants..." />;
    }

    const applicants = job?.applicants || [];

    const renderHeader = () => (
        <View>
            <View style={styles.headerBackground}>
                <View style={[styles.headerContent, { marginBottom: 20 }]}>
                    <Text style={styles.title}>{job?.title}</Text>
                    <View style={styles.subtitleRow}>
                        <Ionicons name="business" size={16} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.subtitleText}>
                            {job?.employer?.companyName || 'Company'}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.overlapCard}>
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{applicants.length}</Text>
                        <Text style={styles.statLabel}>Applicants</Text>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{job?.workers?.length || 0}</Text>
                        <Text style={styles.statLabel}>Hired</Text>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{job?.totalOpenings || 1}</Text>
                        <Text style={styles.statLabel}>Openings</Text>
                    </View>
                </View>
            </View>

            <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Candidates ({applicants.length})</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Stack.Screen
                options={{
                    title: 'Applicants',
                    headerShown: true,
                    headerStyle: { backgroundColor: COLORS.primary },
                    headerTintColor: COLORS.white,
                    headerShadowVisible: false,
                }}
            />
            <FlatList
                data={applicants}
                keyExtractor={(item) => item._id || item.worker?._id}
                renderItem={renderApplicant}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={renderHeader()}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={60} color={COLORS.textSecondary} />
                        <Text style={styles.emptyTitle}>No Applicants Yet</Text>
                        <Text style={styles.emptySubtitle}>Workers who apply will appear here</Text>
                    </View>
                }
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchJobDetails(); }}
                        colors={[COLORS.primary]}
                        progressViewOffset={20}
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
    headerBackground: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingBottom: 70,
        paddingTop: 16,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerContent: {
        marginBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.white,
        marginBottom: 8,
    },
    subtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    subtitleText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
    },
    overlapCard: {
        marginHorizontal: 16,
        marginTop: -40,
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        marginBottom: 20,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    verticalDivider: {
        width: 1,
        height: 30,
        backgroundColor: COLORS.border,
    },
    statNumber: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    sectionTitleRow: {
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    listContent: {
        paddingBottom: 40,
    },
    applicantCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16, // Added margin for list items
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    applicantInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.infoLight,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    avatarImage: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    workerDetails: {
        flex: 1,
        marginLeft: 14,
    },
    workerName: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    ratingText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginLeft: 6,
        fontWeight: '500',
    },
    workerType: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: '600',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginBottom: 4,
        overflow: 'hidden',
    },
    experience: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    contactContainer: {
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 12,
    },
    contactButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
    },
    actionButtons: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 16,
        gap: 12,
    },
    hireButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: COLORS.success,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 1,
    },
    hireButtonText: {
        color: COLORS.white,
        fontWeight: '600',
        marginLeft: 8,
        fontSize: 15,
    },
    rejectButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.danger,
    },
    rejectButtonText: {
        color: COLORS.danger,
        fontWeight: '600',
        marginLeft: 8,
        fontSize: 15,
    },
    hiredBadge: {
        flexDirection: 'row',
        backgroundColor: '#E8F5E9',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        borderWidth: 1,
        borderColor: COLORS.success,
    },
    hiredText: {
        color: COLORS.success,
        fontWeight: '700',
        marginLeft: 8,
        fontSize: 15,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 15,
        color: COLORS.textSecondary,
        marginTop: 8,
    },
});
