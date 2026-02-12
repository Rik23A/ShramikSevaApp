import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    SafeAreaView,
    Dimensions,
    Alert,
    Platform,
    Linking
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { COLORS } from '../../constants/config';
import { getJobById } from '../../services/jobService';
import { getWorkLogsByJob } from '../../services/worklogService';
import { getCurrentSubscription } from '../../services/subscriptionService';
import LiveTrackingMap from '../../components/LiveTrackingMap';
import { getFullImageUrl } from '../../utils/imageUtil';
import WorklogAccessModal from '../../components/worklog/WorklogAccessModal';
import NotificationBell from '../../components/NotificationBell';

const { width } = Dimensions.get('window');

export default function HiredJobDetailsScreen() {
    const { id: jobId, workerId } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { socket, connected } = useSocket();
    const { showToast } = useToast();

    const [job, setJob] = useState(null);
    const [selectedWorkerObj, setSelectedWorkerObj] = useState(null);
    const [workLogs, setWorkLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasWorklogAccess, setHasWorklogAccess] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [showAccessModal, setShowAccessModal] = useState(false);

    const fetchData = useCallback(async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);
        try {
            // Fetch Job
            const jobData = await getJobById(jobId);
            setJob(jobData);

            // Find selected worker
            const workerObj = jobData.workers?.find(w => w.workerId._id === workerId);
            setSelectedWorkerObj(workerObj);

            // Check subscription locally
            const sub = await getCurrentSubscription();
            const hasAccess = sub && (
                sub.planType === 'premium' ||
                (sub.worklogAccessExpiry && new Date(sub.worklogAccessExpiry) > new Date()) ||
                (sub.status === 'active' && new Date(sub.endDate) > new Date() && sub.planType === 'premium')
            );
            setHasWorklogAccess(!!hasAccess);

            if (hasAccess) {
                // Fetch work logs
                const logs = await getWorkLogsByJob(jobId);
                // Filter logs for this specific worker and sort by date descending
                const workerLogs = logs
                    .filter(log => {
                        const targetWorkerId = typeof log.worker === 'object' ? log.worker._id : log.worker;
                        return targetWorkerId === workerId;
                    })
                    .sort((a, b) => new Date(b.workDate) - new Date(a.workDate));
                setWorkLogs(workerLogs);
            }

            setError(null);
        } catch (err) {
            console.error('Error fetching hired job details:', err);
            setError('Failed to load details. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [jobId, workerId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Socket listeners for real-time tracking
    useEffect(() => {
        if (socket && connected && jobId && selectedWorkerObj?.workerId?._id) {
            console.log(`Socket: Joining job room for real-time tracking: job:${jobId}`);
            socket.emit('joinJobRoom', jobId);

            const handleLocationUpdate = (data) => {
                console.log('Real-time location update received:', data);
                if (data.workerId === selectedWorkerObj.workerId._id) {
                    setSelectedWorkerObj(prev => ({
                        ...prev,
                        workerId: {
                            ...prev.workerId,
                            location: {
                                type: 'Point',
                                coordinates: [data.longitude, data.latitude]
                            }
                        }
                    }));
                    showToast({
                        type: 'info',
                        title: 'Live Update',
                        message: `${data.workerName} location updated.`
                    });
                }
            };

            socket.on('workerLocationUpdated', handleLocationUpdate);

            const handleWorkLogUpdate = (data) => {
                console.log('⚡ JobDetails: Received workLogUpdated event:', data);
                // Only refresh if the update is for this worker and job
                if (data.jobId === jobId && data.workerId === selectedWorkerObj.workerId._id) {
                    fetchData();
                    showToast({
                        type: 'info',
                        title: 'Work Log Updated',
                        message: 'The work log has been updated in real-time.'
                    });
                }
            };

            socket.on('workLogUpdated', handleWorkLogUpdate);

            return () => {
                console.log(`Socket: Leaving job room: job:${jobId}`);
                socket.emit('leaveJobRoom', jobId);
                socket.off('workerLocationUpdated', handleLocationUpdate);
                socket.off('workLogUpdated', handleWorkLogUpdate);
            };
        }
    }, [socket, connected, jobId, selectedWorkerObj?.workerId?._id, showToast, fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData(true);
    };

    const handleOpenMaps = (lat, lng, label) => {
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${lat},${lng}`;
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });

        Linking.openURL(url).catch(err => {
            console.error('Error opening maps:', err);
            Alert.alert('Error', 'Could not open Google Maps.');
        });
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (error || !job || !selectedWorkerObj) {
        return (
            <View style={styles.centerContainer}>
                <Ionicons name="alert-circle-outline" size={64} color={COLORS.primary} style={{ opacity: 0.5 }} />
                <Text style={styles.errorText}>{error || 'Post/Worker data not found.'}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => fetchData()}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const { workerId: worker } = selectedWorkerObj;

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen
                options={{
                    headerTitle: job.title,
                    headerRight: () => <NotificationBell iconColor={COLORS.white} />,
                }}
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                }
            >
                {/* Worker Profile Header */}
                <View style={styles.profileCard}>
                    <View style={styles.profileHeader}>
                        {worker.profilePicture ? (
                            <Image
                                source={{ uri: getFullImageUrl(worker.profilePicture) }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center' }]}>
                                <Ionicons name="person" size={40} color={COLORS.textSecondary} />
                            </View>
                        )}
                        <View style={styles.profileInfo}>
                            <Text style={styles.name}>{worker.name}</Text>
                            <Text style={styles.role}>{worker.workerType || 'General Worker'}</Text>
                            <View style={styles.contactRow}>
                                <Ionicons name="call" size={14} color={COLORS.textSecondary} />
                                <Text style={styles.contactText}>{worker.mobile}</Text>
                            </View>
                            {worker?.location?.coordinates && worker.location.coordinates.length === 2 && (
                                <TouchableOpacity
                                    style={styles.liveLocationButton}
                                    onPress={() => {
                                        console.log('Opening maps for worker:', worker.name, worker.location.coordinates);
                                        handleOpenMaps(worker.location.coordinates[1], worker.location.coordinates[0], worker.name + "'s Current Location");
                                    }}
                                >
                                    <View style={styles.liveDot} />
                                    <Ionicons name="location" size={12} color={COLORS.white} />
                                    <Text style={styles.liveLocationText}>Live Location</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={[
                            styles.jobStatusBadge,
                            { backgroundColor: selectedWorkerObj.status === 'completed' ? '#E8F5E9' : '#FFF3E0' }
                        ]}>
                            <Text style={[
                                styles.jobStatusText,
                                { color: selectedWorkerObj.status === 'completed' ? '#2E7D32' : '#EF6C00' }
                            ]}>
                                {selectedWorkerObj.status.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* In-App Live Tracking Map (Uber Style) */}
                <View style={{ paddingHorizontal: 16 }}>
                    <LiveTrackingMap
                        workerLocation={worker?.location?.coordinates?.length === 2 ? {
                            latitude: worker.location.coordinates[1],
                            longitude: worker.location.coordinates[0]
                        } : null}
                        jobLocation={job?.location?.coordinates?.length === 2 ? {
                            latitude: job.location.coordinates[1],
                            longitude: job.location.coordinates[0]
                        } : null}
                        workerName={worker?.name}
                    />
                </View>

                {/* Work Verification Log Section */}
                <View style={styles.sectionHeader}>
                    <Ionicons name="time" size={24} color={COLORS.primary} />
                    <Text style={styles.sectionTitle}>Work Verification Logs</Text>
                </View>

                {!hasWorklogAccess ? (
                    <View style={styles.lockedContainer}>
                        <View style={styles.blurOverlay}>
                            <Ionicons name="lock-closed" size={48} color={COLORS.primary} />
                            <Text style={styles.lockedTitle}>Log Access Locked</Text>
                            <Text style={styles.lockedDescription}>
                                Unlock work logs to see attendance history, OTPs, and photo verification.
                            </Text>
                            <TouchableOpacity
                                style={styles.unlockButton}
                                onPress={() => setShowAccessModal(true)}
                            >
                                <Text style={styles.unlockButtonText}>Unlock Work Logs</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Fake background content for visual effect */}
                        <View style={styles.fakeLogs}>
                            {[1, 2, 3].map(i => (
                                <View key={i} style={styles.fakeLogItem} />
                            ))}
                        </View>
                    </View>
                ) : (
                    <View style={styles.logsContainer}>
                        {workLogs.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="calendar-outline" size={48} color={COLORS.textSecondary} style={{ opacity: 0.3 }} />
                                <Text style={styles.emptyText}>No logs found for this worker.</Text>
                            </View>
                        ) : (
                            workLogs.map((log, index) => (
                                <View key={log._id} style={styles.logItem}>
                                    {/* Timeline connector */}
                                    {index !== workLogs.length - 1 && <View style={styles.timelineLine} />}
                                    <View style={styles.timelineDot} />

                                    <View style={styles.logCard}>
                                        <View style={styles.logDateHeader}>
                                            <Text style={styles.logDate}>
                                                {new Date(log.workDate).toLocaleDateString(undefined, {
                                                    weekday: 'short',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </Text>
                                            <View style={[
                                                styles.statusSmallBadge,
                                                { backgroundColor: log.status === 'completed' ? '#E8F5E9' : '#FFF3E0' }
                                            ]}>
                                                <Text style={[
                                                    styles.statusSmallText,
                                                    { color: log.status === 'completed' ? '#2E7D32' : '#EF6C00' }
                                                ]}>
                                                    {log.status.toUpperCase()}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.logDetails}>
                                            <View style={styles.logColumn}>
                                                <Text style={styles.columnLabel}>START SHIFT</Text>
                                                <Text style={styles.timeText}>
                                                    {log.startTime ? new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                </Text>
                                                <View style={styles.verificationRow}>
                                                    <Ionicons
                                                        name={log.startOtpVerified ? "checkmark-circle" : "close-circle"}
                                                        size={14}
                                                        color={log.startOtpVerified ? "#2E7D32" : "#D32F2F"}
                                                    />
                                                    <Text style={styles.verificationText}>OTP Verified</Text>
                                                </View>
                                                <View style={styles.verificationRow}>
                                                    <Ionicons
                                                        name={log.startPhoto ? "camera" : "camera-outline"}
                                                        size={14}
                                                        color={log.startPhoto ? "#2E7D32" : "#D32F2F"}
                                                    />
                                                    <Text style={styles.verificationText}>
                                                        {log.startPhoto ? "Photo Done" : "No Photo"}
                                                    </Text>
                                                </View>
                                                {log.startPhoto && log.startPhotoLocation?.latitude && (
                                                    <TouchableOpacity
                                                        style={styles.mapLink}
                                                        onPress={() => {
                                                            console.log('Opening maps for start photo:', log.startPhotoLocation);
                                                            handleOpenMaps(log.startPhotoLocation.latitude, log.startPhotoLocation.longitude, "Start Shift Photo Location");
                                                        }}
                                                    >
                                                        <Text style={styles.mapLinkText} numberOfLines={1}>
                                                            {log.startPhotoAddress || "View on Map"}
                                                        </Text>
                                                        <Ionicons name="open-outline" size={10} color={COLORS.primary} />
                                                    </TouchableOpacity>
                                                )}
                                                {log.startOtp && !log.startOtpVerified && (
                                                    <View style={styles.otpBox}>
                                                        <Text style={styles.otpLabel}>START OTP</Text>
                                                        <Text style={styles.otpText}>{log.startOtp}</Text>
                                                    </View>
                                                )}
                                            </View>

                                            <View style={styles.logColumn}>
                                                <Text style={styles.columnLabel}>END SHIFT</Text>
                                                <Text style={styles.timeText}>
                                                    {log.endTime ? new Date(log.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'ACTIVE'}
                                                </Text>
                                                <View style={styles.verificationRow}>
                                                    <Ionicons
                                                        name={log.endOtpVerified ? "checkmark-circle" : "close-circle"}
                                                        size={14}
                                                        color={log.endOtpVerified ? "#2E7D32" : "#D32F2F"}
                                                    />
                                                    <Text style={styles.verificationText}>OTP Verified</Text>
                                                </View>
                                                <View style={styles.verificationRow}>
                                                    <Ionicons
                                                        name={log.endPhoto ? "camera" : "camera-outline"}
                                                        size={14}
                                                        color={log.endPhoto ? "#2E7D32" : "#D32F2F"}
                                                    />
                                                    <Text style={styles.verificationText}>
                                                        {log.endPhoto ? "Photo Done" : "No Photo"}
                                                    </Text>
                                                </View>
                                                {log.endPhoto && log.endPhotoLocation?.latitude && (
                                                    <TouchableOpacity
                                                        style={styles.mapLink}
                                                        onPress={() => {
                                                            console.log('Opening maps for end photo:', log.endPhotoLocation);
                                                            handleOpenMaps(log.endPhotoLocation.latitude, log.endPhotoLocation.longitude, "End Shift Photo Location");
                                                        }}
                                                    >
                                                        <Text style={styles.mapLinkText} numberOfLines={1}>
                                                            {log.endPhotoAddress || "View on Map"}
                                                        </Text>
                                                        <Ionicons name="open-outline" size={10} color={COLORS.primary} />
                                                    </TouchableOpacity>
                                                )}
                                                {log.endOtp && !log.endOtpVerified && (
                                                    <View style={styles.otpBox}>
                                                        <Text style={styles.otpLabel}>END OTP</Text>
                                                        <Text style={styles.otpText}>{log.endOtp}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>

                                        {log.hoursWorked > 0 && (
                                            <View style={styles.hoursRibbon}>
                                                <Text style={styles.hoursText}>{log.hoursWorked.toFixed(1)} hrs worked</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}
            </ScrollView>

            <WorklogAccessModal
                visible={showAccessModal}
                onClose={() => setShowAccessModal(false)}
                onSuccess={async () => {
                    setShowAccessModal(false);
                    fetchData();
                }}
            />
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
        padding: 24,
    },
    scrollContent: {
        padding: 16,
    },
    profileCard: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: COLORS.background,
    },
    profileInfo: {
        flex: 1,
        marginLeft: 16,
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    role: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginVertical: 4,
    },
    liveLocationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginTop: 8,
    },
    liveLocationText: {
        color: COLORS.white,
        fontSize: 11,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#4CAF50',
        marginRight: 4,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    contactText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginLeft: 6,
    },
    jobStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    jobStatusText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginLeft: 10,
    },
    lockedContainer: {
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#EEE',
        minHeight: 300,
        position: 'relative',
    },
    blurOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    lockedTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        marginTop: 16,
        marginBottom: 8,
    },
    lockedDescription: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    unlockButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    unlockButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
    fakeLogs: {
        padding: 16,
        opacity: 0.1,
    },
    fakeLogItem: {
        height: 100,
        backgroundColor: '#CCC',
        borderRadius: 12,
        marginBottom: 16,
    },
    logsContainer: {
        paddingLeft: 8,
    },
    logItem: {
        flexDirection: 'row',
        marginBottom: 20,
        position: 'relative',
    },
    timelineLine: {
        position: 'absolute',
        top: 24,
        left: 10,
        bottom: -20,
        width: 2,
        backgroundColor: COLORS.border,
        zIndex: 0,
    },
    timelineDot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: COLORS.white,
        borderWidth: 4,
        borderColor: COLORS.primary,
        zIndex: 1,
        marginTop: 4,
    },
    logCard: {
        flex: 1,
        marginLeft: 16,
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    logDateHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    logDate: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    statusSmallBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusSmallText: {
        fontSize: 9,
        fontWeight: 'bold',
    },
    logDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    logColumn: {
        flex: 1,
    },
    columnLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    timeText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    verificationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    verificationText: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginLeft: 4,
    },
    otpBox: {
        marginTop: 12,
        padding: 8,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E9ECEF',
        alignSelf: 'flex-start',
    },
    otpLabel: {
        fontSize: 9,
        color: COLORS.textSecondary,
        fontWeight: 'bold',
    },
    otpText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
        letterSpacing: 2,
    },
    hoursRibbon: {
        marginTop: 16,
        backgroundColor: '#F1F7FF',
        padding: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    hoursText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    mapLink: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        backgroundColor: '#F0F7FF',
        paddingHorizontal: 6,
        paddingVertical: 4,
        borderRadius: 4,
        maxWidth: '100%',
    },
    mapLinkText: {
        fontSize: 10,
        color: COLORS.primary,
        marginRight: 4,
        flex: 1,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        marginTop: 12,
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    errorText: {
        color: '#D32F2F',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 16,
        marginTop: 16,
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
});
