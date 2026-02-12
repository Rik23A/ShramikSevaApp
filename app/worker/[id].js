import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    Alert,
    Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { COLORS } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import { getPublicProfile, unlockWorkerProfile } from '../../services/userService';
import { getCurrentSubscription } from '../../services/subscriptionService';
import { getHiredJobs } from '../../services/jobService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { getFullImageUrl } from '../../utils/imageUtil';

export default function WorkerDetailsScreen() {
    const { id } = useLocalSearchParams();
    const { user } = useAuth();
    const [worker, setWorker] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isHired, setIsHired] = useState(false);

    useEffect(() => {
        fetchWorkerDetails();
    }, [id]);

    const fetchWorkerDetails = async () => {
        try {
            setLoading(true);
            const [profileData, subData] = await Promise.all([
                getPublicProfile(id),
                getCurrentSubscription()
            ]);

            setWorker(profileData);
            setSubscription(subData);

            // Check if already hired by this employer
            if (user?.role === 'employer') {
                try {
                    const hiredJobs = await getHiredJobs();
                    const hired = hiredJobs.some(job =>
                        job.workers.some(w =>
                            (w.workerId._id || w.workerId) === id &&
                            (w.status === 'hired' || w.status === 'in-progress' || w.status === 'completed')
                        )
                    );
                    setIsHired(hired);
                } catch (err) {
                    console.log('Error checking hire status:', err);
                }
            }
        } catch (error) {
            console.error('Failed to fetch worker details:', error);
            Alert.alert('Error', 'Failed to load worker profile');
        } finally {
            setLoading(false);
        }
    };

    const handleUnlock = async () => {
        const credits = subscription ? (subscription.maxDatabaseUnlocks - (subscription.databaseUnlocksUsed || 0)) : 0;

        Alert.alert(
            "Unlock Worker Profile",
            `This will use 1 database unlock credit. You have ${credits} credits remaining. Do you want to proceed?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Unlock",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const response = await unlockWorkerProfile(id);
                            if (response.worker) {
                                setWorker(response.worker);
                                // Refresh subscription data locally
                                const newSub = await getCurrentSubscription();
                                setSubscription(newSub);
                                Alert.alert("Success", "Worker profile unlocked!");
                            }
                        } catch (error) {
                            console.error("Unlock error:", error);
                            if (error.response && error.response.status === 403) {
                                Alert.alert(
                                    "Limit Reached",
                                    error.response.data.message || "You have reached your database unlock limit.",
                                    [
                                        { text: "Cancel", style: "cancel" },
                                        { text: "Upgrade Plan", onPress: () => router.push('/(employer)/subscription-plans') }
                                    ]
                                );
                            } else {
                                Alert.alert("Error", "Failed to unlock profile. Please try again.");
                            }
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
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

    const renderStars = (rating) => {
        const stars = [];
        const fullStars = Math.floor(rating || 0);
        const hasHalfStar = (rating || 0) % 1 >= 0.5;

        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars.push(<Ionicons key={i} name="star" size={18} color="#FFD700" />);
            } else if (i === fullStars && hasHalfStar) {
                stars.push(<Ionicons key={i} name="star-half" size={18} color="#FFD700" />);
            } else {
                stars.push(<Ionicons key={i} name="star-outline" size={18} color="#FFD700" />);
            }
        }
        return stars;
    };

    if (loading) {
        return <LoadingSpinner fullScreen message="Loading worker profile..." />;
    }

    if (!worker) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={60} color={COLORS.danger} />
                <Text style={styles.errorText}>Worker not found</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Stack.Screen
                options={{
                    title: 'Worker Profile',
                    headerShown: true,
                    headerStyle: { backgroundColor: COLORS.primary },
                    headerTintColor: COLORS.white,
                    headerShadowVisible: false,
                }}
            />
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Background */}
                <View style={styles.headerBackground} />

                {/* Overlapping Profile Card */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        {worker.profilePicture ? (
                            <Image
                                source={{ uri: getFullImageUrl(worker.profilePicture) }}
                                style={styles.avatarImage}
                                onLoad={() => console.log('Image Loaded Success:', getFullImageUrl(worker.profilePicture))}
                                onError={(e) => console.error('Image Load Error:', e.nativeEvent.error, getFullImageUrl(worker.profilePicture))}
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="person" size={40} color={COLORS.primary} />
                            </View>
                        )}
                        <View style={[styles.availabilityDot, worker.availability === 'available' ? styles.onlineDot : styles.offlineDot]} />
                    </View>

                    <Text style={styles.name}>{worker.name || 'Worker'}</Text>

                    <View style={styles.ratingRow}>
                        {renderStars(worker.rating)}
                        <Text style={styles.ratingText}>{worker.rating?.toFixed(1) || '0.0'}</Text>
                        <Text style={styles.reviewCount}>({worker.reviewCount || 0} reviews)</Text>
                    </View>

                    {worker.workerType && (
                        <View style={styles.tagContainer}>
                            {worker.workerType.slice(0, 3).map((type, index) => (
                                <Text key={index} style={styles.roleTag}>{type}</Text>
                            ))}
                        </View>
                    )}

                    {/* Contact Actions Row */}
                    {worker.mobile ? (
                        <View style={styles.contactRow}>
                            <TouchableOpacity
                                style={[styles.contactBtn, styles.whatsappBtn]}
                                onPress={() => handleWhatsApp(worker.mobile)}
                            >
                                <Ionicons name="logo-whatsapp" size={20} color={COLORS.white} />
                                <Text style={styles.contactBtnText}>WhatsApp</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.contactBtn, styles.callBtn]}
                                onPress={() => handleCall(worker.mobile)}
                            >
                                <Ionicons name="call" size={20} color={COLORS.white} />
                                <Text style={styles.contactBtnText}>Call</Text>
                            </TouchableOpacity>
                        </View>
                    ) : user?.role === 'employer' ? (
                        <TouchableOpacity
                            style={styles.unlockBtn}
                            onPress={handleUnlock}
                        >
                            <Ionicons name="lock-open" size={20} color={COLORS.white} />
                            <Text style={styles.unlockBtnText}>Unlock Contact Details</Text>
                        </TouchableOpacity>
                    ) : null}
                </Animated.View>

                {/* Key Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <Ionicons name="briefcase-outline" size={22} color={COLORS.primary} />
                        <Text style={styles.statValue}>
                            {worker.isFresher ? 'Fr' : `${worker.experience}+`}
                        </Text>
                        <Text style={styles.statLabel}>Exp (Yrs)</Text>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.statItem}>
                        <Ionicons name="checkmark-done-circle-outline" size={22} color={COLORS.success} />
                        <Text style={styles.statValue}>{worker.completedJobs || 0}</Text>
                        <Text style={styles.statLabel}>Jobs Done</Text>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.statItem}>
                        <Ionicons name="location-outline" size={22} color={COLORS.warning} />
                        <Text style={styles.statValue} numberOfLines={1}>
                            {worker.locationName?.split(',')[0] || (typeof worker.location === 'string' ? worker.location.split(',')[0] : 'Any')}
                        </Text>
                        <Text style={styles.statLabel}>Location</Text>
                    </View>
                </View>

                {/* Skills Section */}
                {worker.skills && worker.skills.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Skills & Expertise</Text>
                        <View style={styles.skillsWrapper}>
                            {worker.skills.map((skill, index) => (
                                <View key={index} style={styles.skillChip}>
                                    <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                                    <Text style={styles.skillChipText}>{skill}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Documents Section */}
                {worker.documents && worker.documents.some(doc => doc.type === 'biodata') && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Experience Documents (Bio-data)</Text>
                        {worker.documents
                            .filter(doc => doc.type === 'biodata')
                            .map((doc, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.documentItem}
                                    onPress={() => Linking.openURL(getFullImageUrl(doc.url))}
                                >
                                    <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
                                    <View style={styles.documentInfo}>
                                        <Text style={styles.documentName}>{doc.name || 'CV / Resume'}</Text>
                                        <Text style={styles.documentType}>Tap to view PDF</Text>
                                    </View>
                                    <Ionicons name="open-outline" size={20} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            ))}
                    </View>
                )}

                {/* Hire Action Footer */}
                <View style={styles.footerAction}>
                    <TouchableOpacity
                        style={[styles.mainHireBtn, isHired && styles.hiredStateBtn]}
                        onPress={() => !isHired && Alert.alert('Coming Soon', 'Direct hiring feature will be available soon!')}
                        disabled={isHired}
                    >
                        <Ionicons
                            name={isHired ? "checkmark-circle" : "briefcase"}
                            size={20}
                            color={COLORS.white}
                        />
                        <Text style={styles.mainHireBtnText}>
                            {isHired ? 'Already Hired' : 'Hire This Worker'}
                        </Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    contentContainer: {
        paddingBottom: 40,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    errorText: {
        fontSize: 18,
        color: COLORS.text,
        marginTop: 16,
        marginBottom: 24,
    },
    backButton: {
        backgroundColor: COLORS.secondary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    backButtonText: {
        color: COLORS.white,
        fontWeight: '600',
    },
    headerBackground: {
        backgroundColor: COLORS.primary,
        height: 120, // Background height behind card
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        marginBottom: -60, // Pull contents up
    },
    profileCard: {
        backgroundColor: COLORS.white,
        marginHorizontal: 20,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        marginBottom: 24,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    avatarImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: COLORS.background,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.background,
    },
    availabilityDot: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    onlineDot: { backgroundColor: COLORS.success },
    offlineDot: { backgroundColor: COLORS.textSecondary },

    name: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 6,
        textAlign: 'center',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 4,
    },
    ratingText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
    },
    reviewCount: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    tagContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 20,
    },
    roleTag: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary,
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        overflow: 'hidden',
    },
    contactRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    contactBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    whatsappBtn: { backgroundColor: '#25D366' },
    callBtn: { backgroundColor: COLORS.success },
    contactBtnText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 14,
    },
    unlockBtn: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.warning,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    unlockBtnText: {
        color: COLORS.white,
        fontWeight: '700',
        fontSize: 16,
    },

    statsGrid: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        marginHorizontal: 20,
        borderRadius: 16,
        padding: 20,
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    verticalDivider: {
        width: 1,
        height: 30,
        backgroundColor: COLORS.border,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginTop: 4,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },

    sectionContainer: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 12,
    },
    skillsWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    skillChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 6,
    },
    skillChipText: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },

    footerAction: {
        paddingHorizontal: 20,
        marginTop: 10,
    },
    mainHireBtn: {
        flexDirection: 'row',
        backgroundColor: COLORS.secondary, // Black/Dark
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        elevation: 4,
    },
    hiredStateBtn: {
        backgroundColor: COLORS.success,
    },
    mainHireBtnText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '700',
    },
    documentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 10,
    },
    documentInfo: {
        flex: 1,
        marginLeft: 12,
    },
    documentName: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    documentType: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    noDataText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
        marginLeft: 4,
    },
});
