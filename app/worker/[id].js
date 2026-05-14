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
    Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { COLORS } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import { getPublicProfile, unlockWorkerProfile } from '../../services/userService';
import { getCurrentSubscription } from '../../services/subscriptionService';
import { getHiredJobs, getCompletedJobs, getJobById, getApplicationsForJob, hireWorker } from '../../services/jobService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { getFullImageUrl } from '../../utils/imageUtil';
import DirectHireModal from '../../components/employer/DirectHireModal';
import { useLanguage } from '../../context/LanguageContext';

export default function WorkerDetailsScreen() {
    const { id, jobId, context } = useLocalSearchParams();
    const { user } = useAuth();
    const { t } = useLanguage();
    const [worker, setWorker] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isHired, setIsHired] = useState(false);
    const [showHireModal, setShowHireModal] = useState(false);
    const [completedJobs, setCompletedJobs] = useState([]);
    const [loadingCompletedJobs, setLoadingCompletedJobs] = useState(false);
    const [contextJob, setContextJob] = useState(null);
    const [applicationStatus, setApplicationStatus] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [showAllJobsModal, setShowAllJobsModal] = useState(false);

    useEffect(() => {
        fetchWorkerDetails();
    }, [id, jobId, context]);

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

            // Fetch Completed Jobs
            try {
                setLoadingCompletedJobs(true);
                const pastJobs = await getCompletedJobs(id);
                setCompletedJobs(pastJobs);
            } catch (err) {
                console.log('Error fetching completed jobs:', err);
            } finally {
                setLoadingCompletedJobs(false);
            }

            // Fetch Context Job if from applicants page
            if (jobId && context === 'applicant') {
                try {
                    const jobData = await getJobById(jobId);
                    setContextJob(jobData);

                    const appsData = await getApplicationsForJob(jobId);
                    const relevantApp = appsData.find(app => (app.worker._id || app.worker) === id);
                    if (relevantApp) {
                        setApplicationStatus(relevantApp.status);
                    }
                } catch (err) {
                    console.log('Error fetching context job:', err);
                }
            }
        } catch (error) {
            console.error('Failed to fetch worker details:', error);
            Alert.alert(t('error_title'), t('error_loading_worker_profile') || 'Failed to load worker profile');
        } finally {
            setLoading(false);
        }
    };

    const handleDirectHire = () => {
        Alert.alert(
            t('confirm_hire') || 'Confirm Hire',
            (t('confirm_hire_msg') || `Are you sure you want to hire {name} for this job?`).replace('{name}', worker?.name || ''),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('hire'),
                    onPress: async () => {
                        try {
                            setActionLoading(true);
                            await hireWorker(jobId, id);
                            setApplicationStatus('hired');
                            Alert.alert(t('success') || 'Success', (t('hire_success_msg') || `{name} has been hired!`).replace('{name}', worker?.name || ''));
                            fetchWorkerDetails();
                        } catch (error) {
                            Alert.alert('Error', error.response?.data?.message || 'Failed to hire worker');
                        } finally {
                            setActionLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleUnlock = async () => {
        const credits = subscription ? (subscription.maxDatabaseUnlocks - (subscription.databaseUnlocksUsed || 0)) : 0;

        Alert.alert(
            t('unlock_profile_title'),
            t('unlock_profile_confirm').replace('{credits}', credits),
            [
                { text: t('cancel'), style: "cancel" },
                {
                    text: t('unlock'),
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const response = await unlockWorkerProfile(id);
                            if (response.worker) {
                                setWorker(response.worker);
                                // Refresh subscription data locally
                                const newSub = await getCurrentSubscription();
                                setSubscription(newSub);
                                Alert.alert(t('success'), t('worker_profile_unlocked') || "Worker profile unlocked!");
                            }
                        } catch (error) {
                            console.error("Unlock error:", error);
                            if (error.response && error.response.status === 403) {
                                Alert.alert(
                                    t('limit_reached'),
                                    error.response.data.message || t('unlock_limit_reached'),
                                    [
                                        { text: t('cancel'), style: "cancel" },
                                        { text: t('upgrade_plan'), onPress: () => router.push('/(employer)/subscription-plans') }
                                    ]
                                );
                            } else {
                                Alert.alert(t('error_title'), t('failed_to_unlock') || "Failed to unlock profile. Please try again.");
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
            Alert.alert(t('info') || 'Info', t('mobile_not_available') || 'Mobile number not available');
            return;
        }
        Linking.openURL(`tel:${mobile}`);
    };

    const handleWhatsApp = (mobile) => {
        if (!mobile) {
            Alert.alert(t('info') || 'Info', t('mobile_not_available') || 'Mobile number not available');
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
        return <LoadingSpinner fullScreen message={t('loading_worker_profile')} />;
    }

    if (!worker) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={60} color={COLORS.danger} />
                <Text style={styles.errorText}>{t('worker_not_found')}</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>{t('go_back')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Stack.Screen
                options={{
                    title: t('my_profile'),
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

                    <Text style={styles.name}>{worker.name || t('nav_profile')}</Text>

                    <View style={styles.ratingRow}>
                        {renderStars(worker.rating)}
                        <Text style={styles.ratingText}>{worker.rating?.toFixed(1) || '0.0'}</Text>
                        <Text style={styles.reviewCount}>({worker.reviewCount || 0} {t('reviews') || 'reviews'})</Text>
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
                                <Text style={styles.contactBtnText}>{t('whatsapp')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.contactBtn, styles.callBtn]}
                                onPress={() => handleCall(worker.mobile)}
                            >
                                <Ionicons name="call" size={20} color={COLORS.white} />
                                <Text style={styles.contactBtnText}>{t('call')}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : user?.role === 'employer' ? (
                        <TouchableOpacity
                            style={styles.unlockBtn}
                            onPress={handleUnlock}
                        >
                            <Ionicons name="lock-open" size={20} color={COLORS.white} />
                            <Text style={styles.unlockBtnText}>{t('unlock_contact_details')}</Text>
                        </TouchableOpacity>
                    ) : null}
                </Animated.View>

                {/* Key Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <Ionicons name="briefcase-outline" size={22} color={COLORS.primary} />
                        <Text style={[styles.statValue, worker.isFresher && { fontSize: 14 }]}>
                            {worker.isFresher ? t('fresher') : `${worker.experience}+`}
                        </Text>
                        <Text style={styles.statLabel}>{worker.isFresher ? t('experience') : t('exp_years')}</Text>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.statItem}>
                        <Ionicons name="checkmark-done-circle-outline" size={22} color={COLORS.success} />
                        <Text style={styles.statValue}>{worker.completedJobs || 0}</Text>
                        <Text style={styles.statLabel}>{t('jobs_done')}</Text>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.statItem}>
                        <Ionicons name="location-outline" size={22} color={COLORS.warning} />
                        <Text style={styles.statValue} numberOfLines={1}>
                            {worker.locationName?.split(',')[0] || (typeof worker.location === 'string' ? worker.location.split(',')[0] : t('any'))}
                        </Text>
                        <Text style={styles.statLabel}>{t('location')}</Text>
                    </View>
                </View>

                {/* Bio Section */}
                {worker.bio ? (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>{t('about_me')}</Text>
                        <Text style={styles.bioText}>{worker.bio}</Text>
                    </View>
                ) : null}

                {/* Skills Section */}
                {worker.skills && worker.skills.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>{t('skills_expertise')}</Text>
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
                        <Text style={styles.sectionTitle}>{t('experience_docs')}</Text>
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
                                        <Text style={styles.documentType}>{t('tap_to_view_pdf')}</Text>
                                    </View>
                                    <Ionicons name="open-outline" size={20} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            ))}
                    </View>
                )}

                {/* Previous Hires Section */}
                {completedJobs && completedJobs.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeaderRow}>
                            <Ionicons name="briefcase-outline" size={20} color={COLORS.text} />
                            <Text style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 8 }]}>
                                Previous Hires ({completedJobs.length})
                            </Text>
                        </View>

                        {loadingCompletedJobs ? (
                            <LoadingSpinner />
                        ) : (
                            <View style={styles.completedJobsContainer}>
                                {completedJobs.slice(0, 3).map((job) => (
                                    <View key={job._id} style={styles.completedJobCard}>
                                        <View style={styles.completedJobHeader}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.completedJobTitle}>{job.title}</Text>
                                                <Text style={styles.completedJobEmployer}>
                                                    <Ionicons name="briefcase" size={12} /> {job.employer?.name}
                                                </Text>
                                            </View>
                                            {job.rating && (
                                                <View style={styles.ratingBadge}>
                                                    <Ionicons name="star" size={12} color="#FFD700" />
                                                    <Text style={styles.ratingBadgeText}>{job.rating.rating.toFixed(1)}</Text>
                                                </View>
                                            )}
                                        </View>

                                        {job.rating?.review && (
                                            <View style={styles.reviewBox}>
                                                <Text style={styles.reviewText}>"{job.rating.review}"</Text>
                                            </View>
                                        )}

                                        <View style={styles.completedJobFooter}>
                                            <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                                            <Text style={styles.completedJobStatus}>
                                                {job.status === 'completed' ? 'Completed' : 'In Progress'}
                                            </Text>
                                        </View>
                                    </View>
                                ))}

                                {completedJobs.length > 3 && (
                                    <TouchableOpacity
                                        style={styles.viewAllBtn}
                                        onPress={() => setShowAllJobsModal(true)}
                                    >
                                        <Text style={styles.viewAllBtnText}>View All ({completedJobs.length})</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* Hire Action Footer */}
                <View style={styles.footerAction}>
                    {context === 'applicant' && jobId ? (
                        applicationStatus === 'hired' || applicationStatus === 'offerAccepted' ? (
                            <View style={[styles.mainHireBtn, styles.disabledStateBtn]}>
                                <Text style={styles.mainHireBtnText}>{applicationStatus === 'hired' ? 'Already Hired' : 'Offer Accepted'}</Text>
                            </View>
                        ) : applicationStatus === 'pending' ? (
                            <TouchableOpacity
                                style={styles.mainHireBtn}
                                onPress={handleDirectHire}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <Text style={styles.mainHireBtnText}>...</Text>
                                ) : (
                                    <>
                                        <Ionicons name="briefcase" size={20} color={COLORS.white} />
                                        <Text style={styles.mainHireBtnText}>
                                            Hire for "{contextJob?.title || 'this job'}"
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <View style={[styles.mainHireBtn, styles.disabledStateBtn]}>
                                <Text style={styles.mainHireBtnText}>Status: {applicationStatus || 'Unknown'}</Text>
                            </View>
                        )
                    ) : (
                        <TouchableOpacity
                            style={[styles.mainHireBtn, isHired && styles.hiredStateBtn]}
                            onPress={() => {
                                if (!isHired) {
                                    setShowHireModal(true);
                                }
                            }}
                            disabled={isHired}
                        >
                            <Ionicons
                                name={isHired ? "checkmark-circle" : "briefcase"}
                                size={20}
                                color={COLORS.white}
                            />
                            <Text style={styles.mainHireBtnText}>
                                {isHired ? t('already_hired') : t('hire_this_worker')}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

            </ScrollView>

            {user?.role === 'employer' && worker && (
                <DirectHireModal
                    visible={showHireModal}
                    onClose={(success) => {
                        setShowHireModal(false);
                        if (success) fetchWorkerDetails();
                    }}
                    workerId={worker._id}
                    workerName={worker.name}
                />
            )}

            {/* View All Jobs Modal */}
            <Modal
                visible={showAllJobsModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowAllJobsModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Previous Hires ({completedJobs.length})</Text>
                        <TouchableOpacity onPress={() => setShowAllJobsModal(false)}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.modalScrollContent}>
                        {completedJobs.map((job) => (
                            <View key={`modal-${job._id}`} style={styles.completedJobCard}>
                                <View style={styles.completedJobHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.completedJobTitle}>{job.title}</Text>
                                        <Text style={styles.completedJobEmployer}>
                                            <Ionicons name="briefcase" size={12} /> {job.employer?.name}
                                        </Text>
                                    </View>
                                    {job.rating && (
                                        <View style={styles.ratingBadge}>
                                            <Ionicons name="star" size={12} color="#FFD700" />
                                            <Text style={styles.ratingBadgeText}>{job.rating.rating.toFixed(1)}</Text>
                                        </View>
                                    )}
                                </View>

                                {job.rating?.review && (
                                    <View style={styles.reviewBox}>
                                        <Text style={styles.reviewText}>"{job.rating.review}"</Text>
                                    </View>
                                )}

                                <View style={styles.completedJobFooter}>
                                    <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                                    <Text style={styles.completedJobStatus}>
                                        {job.status === 'completed' ? 'Completed' : 'In Progress'}
                                    </Text>
                                    {job.completedAt && (
                                        <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginLeft: 10 }}>
                                            Completed: {new Date(job.completedAt).toLocaleDateString()}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </Modal>
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
    bioText: {
        fontSize: 15,
        color: COLORS.text,
        lineHeight: 22,
    },
    disabledStateBtn: {
        backgroundColor: COLORS.textSecondary,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    completedJobsContainer: {
        gap: 12,
    },
    completedJobCard: {
        backgroundColor: COLORS.white,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    completedJobHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    completedJobTitle: {
        fontWeight: '600',
        fontSize: 15,
        color: COLORS.text,
    },
    completedJobEmployer: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 12,
        gap: 4,
    },
    ratingBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.text,
    },
    reviewBox: {
        backgroundColor: COLORS.background,
        padding: 8,
        borderRadius: 8,
        marginTop: 8,
    },
    reviewText: {
        fontSize: 13,
        fontStyle: 'italic',
        color: COLORS.textSecondary,
    },
    completedJobFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 4,
    },
    completedJobStatus: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    viewAllBtn: {
        paddingVertical: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        marginTop: 12,
    },
    viewAllBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
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
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    modalScrollContent: {
        padding: 20,
        gap: 12,
    },
});
