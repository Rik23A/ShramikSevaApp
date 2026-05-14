import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    RefreshControl,
    Linking,
    Platform,
    Image,
    ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import { getJobById, applyToJob } from '../../services/jobService';
import { createConversation } from '../../services/messageService';
import { calculateRoute } from '../../services/geolocationService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import WorkLogHistoryModal from '../../components/worklog/WorkLogHistoryModal';
import ResumeUploadModal from '../../components/ResumeUploadModal';

export default function JobDetailScreen() {
    const { id } = useLocalSearchParams();
    const { user } = useAuth();
    const { t } = useLanguage();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [startingChat, setStartingChat] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showWorkHistory, setShowWorkHistory] = useState(false);
    const [showCVModal, setShowCVModal] = useState(false);
    const [mapLoading, setMapLoading] = useState(true);

    const getStaticMapUrl = (lng, lat) => {
        // Using staticmaps.cloud.osm.be which is an OSM-based static map service
        // Format: https://staticmaps.cloud.osm.be/staticmap?center={lat},{lng}&zoom=15&size=600x300&maptype=mapnik&markers={lat},{lng},red-pushpin
        return `https://staticmaps.cloud.osm.be/staticmap?center=${lat},${lng}&zoom=15&size=600x300&maptype=mapnik&markers=${lat},${lng},red-pushpin`;
    };

    const fetchJob = async () => {
        try {
            const data = await getJobById(id);
            setJob(data);
        } catch (error) {
            console.error('Failed to fetch job:', error);
            Alert.alert(t('error_title'), t('failed_to_load_job_details'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const isAssigned = job?.workers?.some(w => {
        const id = w?.workerId?._id || w?.workerId;
        return id?.toString() === user?._id?.toString() && ['hired', 'in-progress', 'completed'].includes(w?.status);
    });

    useEffect(() => {
        if (id) {
            fetchJob();
        }
    }, [id]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchJob();
    };

    const handleApply = async () => {
        if (!user) {
            router.push('/auth/login');
            return;
        }

        if (user.role === 'worker') {
            setShowCVModal(true);
            return;
        }

        // For non-workers if status badge shows apply
        performApply();
    };

    const performApply = async (cvId) => {
        try {
            setApplying(true);
            await applyToJob(id, cvId);
            Alert.alert(t('success'), t('success_apply'));
            fetchJob();
        } catch (error) {
            console.error('Failed to apply:', error);
            Alert.alert(t('error_title'), error.response?.data?.message || t('failed_to_apply'));
        } finally {
            setApplying(false);
            setShowCVModal(false);
        }
    };

    const handleContactEmployer = async () => {
        if (!user) {
            router.push('/auth/login');
            return;
        }

        try {
            setStartingChat(true);
            const employerId = job.employer?._id || job.employer;
            const conversation = await createConversation(user._id, employerId);
            router.push(`/chat/${conversation._id}`);
        } catch (error) {
            console.error('Failed to start chat:', error);
            Alert.alert(t('error_title') || 'Error', t('failed_to_start_chat') || 'Failed to start conversation');
        } finally {
            setStartingChat(false);
        }
    };

    const handleGetDirections = () => {
        if (!job?.location?.coordinates) {
            Alert.alert(t('error_title'), t('location_not_available'));
            return;
        }
        const [lng, lat] = job.location.coordinates;
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${lat},${lng}`;
        const label = job.title || t('job_location');
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });
        Linking.openURL(url);
    };

    if (loading) {
        return <LoadingSpinner fullScreen message={t('loading')} />;
    }

    if (!job) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={64} color={COLORS.danger} />
                <Text style={styles.errorText}>{t('job_not_found')}</Text>
                <Button title={t('go_back')} onPress={() => router.back()} />
            </View>
        );
    }





    const hasApplied = job?.userApplicationStatus || job?.applicants?.some(a => {
        const applicantId = a.worker?._id || a.worker || a._id || a;
        return applicantId?.toString() === user?._id?.toString();
    });

    const isEmployer = user?.role === 'employer';
    const isMyJob = (job?.employer?._id || job?.employer)?.toString() === user?._id?.toString();

    // Debugging
    if (job) {
        console.log('JOB DEBUG:', {
            jobId: job._id,
            userId: user?._id,
            isAssigned,
            workerCount: job.workers?.length,
            workers: job.workers?.map(w => ({ id: w.workerId, status: w.status }))
        });
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Stack.Screen
                options={{
                    title: t('job_details'),
                    headerShown: true,
                    headerStyle: { backgroundColor: COLORS.primary },
                    headerTintColor: COLORS.white,
                    headerShadowVisible: false,
                }}
            />
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.white]} />
                }
            >
                {/* Header Background */}
                <View style={styles.headerBackground}>
                    <View style={[styles.headerContent, { marginBottom: 20 }]}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                                <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                    <Text style={styles.statusText}>{job.workType}</Text>
                                </View>
                                {Array.isArray(job.workerType) && job.workerType.length > 0 && (
                                    <View style={[styles.statusBadge, { backgroundColor: 'rgba(33, 150, 243, 0.2)' }]}>
                                        <Text style={[styles.statusText, { color: '#E3F2FD' }]}>{job.workerType.join(', ')}</Text>
                                    </View>
                                )}
                                {job.isUrgent && (
                                    <View style={[styles.statusBadge, { backgroundColor: 'rgba(244, 67, 54, 0.3)' }]}>
                                        <Text style={[styles.statusText, { color: '#FFEBEE' }]}>{t('urgent_badge')}</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.title}>{job.title}</Text>
                        </View>
                    </View>
                </View>

                {/* Overlapping Company Card */}
                <View style={styles.overlapCard}>
                    <View style={styles.companyRow}>
                        <View style={styles.companyAvatar}>
                            <Ionicons name="business" size={28} color={COLORS.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.companyName}>
                                {job.employer?.companyName || job.employer?.name || t('company')}
                            </Text>
                            <Text style={styles.companyType}>
                                {job.employer?.businessType || t('employer')} • {job.employer?.rating || t('new')} ⭐
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.keyStatsRow}>
                        <View style={styles.keyStatItem}>
                            <Ionicons name="cash-outline" size={18} color={COLORS.success} />
                            <Text style={styles.keyStatText} numberOfLines={1}>
                                ₹{job.salary} {job.workType === 'temporary' ? t('per_day') : t('per_month')}
                            </Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.keyStatItem}>
                            <Ionicons name="location-outline" size={18} color={COLORS.primary} />
                            <Text style={styles.keyStatText} numberOfLines={1}>
                                {job.location?.address || t('location')}
                            </Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.keyStatItem}>
                            <Ionicons name="school-outline" size={18} color={COLORS.warning} />
                            <Text style={styles.keyStatText} numberOfLines={1}>
                                {job.minExperience === 0 && job.maxExperience === 0 ? t('fresher') : `${job.minExperience}-${job.maxExperience} Yrs`}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Job Overview Grid */}
                <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionTitle}>{t('overview')}</Text>
                </View>

                <View style={styles.gridContainer}>
                    <View style={styles.gridItem}>
                        <View style={[styles.gridIcon, { backgroundColor: '#E3F2FD' }]}>
                            <Ionicons name="people-outline" size={20} color={COLORS.primary} />
                        </View>
                        <Text style={styles.gridLabel}>{t('worker_type')}</Text>
                        <Text style={styles.gridValue}>{Array.isArray(job.workerType) ? job.workerType.join(', ') : (job.workerType || t('general'))}</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <View style={[styles.gridIcon, { backgroundColor: '#E8F5E9' }]}>
                            <Ionicons name="briefcase-outline" size={20} color={COLORS.success} />
                        </View>
                        <Text style={styles.gridLabel}>{t('openings')}</Text>
                        <Text style={styles.gridValue}>{job.totalOpenings || 1}</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <View style={[styles.gridIcon, { backgroundColor: '#FFF3E0' }]}>
                            <Ionicons name="calendar-outline" size={20} color={COLORS.warning} />
                        </View>
                        <Text style={styles.gridLabel}>{t('duration')}</Text>
                        <Text style={styles.gridValue}>{job.workType === 'permanent' ? t('permanent') : (job.durationDays ? `${job.durationDays} ${t('days')}` : 'N/A')}</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <View style={[styles.gridIcon, { backgroundColor: '#F3E5F5' }]}>
                            <Ionicons name="document-text-outline" size={20} color="#9C27B0" />
                        </View>
                        <Text style={styles.gridLabel}>{t('applicants')}</Text>
                        <Text style={styles.gridValue}>{job.applicants?.length || 0}</Text>
                    </View>
                </View>

                {/* Description */}
                {job.description && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('description')}</Text>
                        <Text style={styles.description}>{job.description}</Text>
                    </View>
                )}



                {/* Skills */}
                {job.skills && job.skills.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('required_skills')}</Text>
                        <View style={styles.skillsContainer}>
                            {Array.isArray(job.skills) && job.skills.map((skill, index) => (
                                <View key={index} style={styles.skillBadge}>
                                    <Text style={styles.skillText}>{skill}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Location Card (Replacement for Inline Map) */}
                {job.location && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('location')}</Text>
                        <View style={styles.locationCard}>
                            {job.location?.coordinates?.length === 2 && (
                                <View style={styles.staticMapContainer}>
                                    <Image
                                        source={{ uri: getStaticMapUrl(job.location.coordinates[0], job.location.coordinates[1]) }}
                                        style={styles.staticMapImage}
                                        onLoadStart={() => setMapLoading(true)}
                                        onLoadEnd={() => setMapLoading(false)}
                                    />
                                    {mapLoading && (
                                        <View style={styles.mapLoader}>
                                            <ActivityIndicator color={COLORS.primary} />
                                        </View>
                                    )}
                                    <View style={styles.mapMarkerOverlay}>
                                        <Ionicons name="location" size={32} color={COLORS.danger} />
                                    </View>
                                </View>
                            )}
                            
                            <View style={styles.locationInfoMain}>
                                <View style={styles.locationIconBg}>
                                    <Ionicons name="map" size={24} color={COLORS.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.locationAddressMain}>
                                        {job.location?.address || t('location')}
                                    </Text>
                                    {job.location?.coordinates && (
                                        <Text style={styles.locationCoords}>
                                            {job.location.coordinates[1].toFixed(5)}, {job.location.coordinates[0].toFixed(5)}
                                        </Text>
                                    )}
                                </View>
                            </View>
                            
                            <TouchableOpacity 
                                style={styles.mapActionBtn}
                                onPress={handleGetDirections}
                            >
                                <Ionicons name="navigate-circle" size={24} color={COLORS.white} />
                                <Text style={styles.mapActionBtnText}>{t('view_on_maps')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Action Button */}
                <View style={styles.actionContainer}>
                    {isMyJob ? (
                        <Button
                            title={`${t('view_applicants')} (${job.applicants?.length || 0})`}
                            onPress={() => router.push(`/job/${id}/applicants`)}
                            style={styles.primaryButton}
                        />
                    ) : isAssigned ? (
                        <>
                            <View style={styles.successBadge}>
                                <Ionicons name="checkmark-circle" size={24} color={COLORS.white} />
                                <Text style={styles.successText}>{t('hired_msg')}</Text>
                            </View>
                            <Button
                                title={t('get_directions')}
                                onPress={handleGetDirections}
                                style={[styles.primaryButton, { marginTop: 12, backgroundColor: COLORS.primary }]}
                                icon={<Ionicons name="map" size={20} color={COLORS.white} style={{ marginRight: 8 }} />}
                            />
                            <Button
                                title={t('work_history')}
                                onPress={() => setShowWorkHistory(true)}
                                style={[styles.primaryButton, { marginTop: 12, backgroundColor: COLORS.secondary }]}
                                icon={<Ionicons name="time" size={20} color={COLORS.white} style={{ marginRight: 8 }} />}
                            />
                            <WorkLogHistoryModal
                                visible={showWorkHistory}
                                jobId={id}
                                onClose={() => setShowWorkHistory(false)}
                            />
                        </>
                    ) : hasApplied ? (
                        <View style={styles.warningBadge}>
                            <Ionicons name="time" size={24} color={COLORS.white} />
                            <Text style={styles.warningText}>{t('application_pending')}</Text>
                        </View>
                    ) : isEmployer ? (
                        <View style={styles.disabledBadge}>
                            <Text style={styles.disabledText}>{t('employer_view_only')}</Text>
                        </View>
                    ) : job.status === 'open' ? (
                        <Button
                            title={t('apply_now')}
                            onPress={handleApply}
                            loading={applying}
                            style={styles.primaryButton}
                        />
                    ) : (
                        <View style={styles.disabledBadge}>
                            <Text style={styles.disabledText}>{t('applications_closed')}</Text>
                        </View>
                    )}

                    {!isEmployer && !isMyJob && user?.role === 'worker' && (
                        <Button
                            title={t('contact_employer')}
                            onPress={handleContactEmployer}
                            loading={startingChat}
                            style={[styles.primaryButton, { marginTop: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border }]}
                            textStyle={{ color: COLORS.text }}
                            icon={<Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />}
                        />
                    )}
                </View>
            </ScrollView>
            <ResumeUploadModal
                visible={showCVModal}
                onClose={() => setShowCVModal(false)}
                onUploadSuccess={(cvId) => performApply(cvId)}
                onSkip={() => performApply()}
            />
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
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        color: COLORS.text,
        marginVertical: 16,
    },
    headerBackground: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingBottom: 100, // Increased space to prevent overlap
        paddingTop: 16,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.white,
        flex: 1,
        marginRight: 10,
        lineHeight: 32,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    statusOpen: { backgroundColor: 'rgba(76, 175, 80, 0.25)' },
    statusClosed: { backgroundColor: 'rgba(244, 67, 54, 0.25)' },
    statusProgress: { backgroundColor: 'rgba(255, 152, 0, 0.25)' },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.white,
        textTransform: 'uppercase',
    },
    overlapCard: {
        marginHorizontal: 16,
        marginTop: -100, // Adjusted overlap
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        marginBottom: 24,
    },
    companyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    companyAvatar: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#E3F2FD',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    companyName: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    companyType: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginBottom: 16,
    },
    keyStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    keyStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    verticalDivider: {
        width: 1,
        height: 24,
        backgroundColor: COLORS.border,
        marginHorizontal: 8,
    },
    keyStatText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text,
        marginLeft: 6,
    },
    sectionTitleRow: {
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 8,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        marginBottom: 24,
    },
    gridItem: {
        width: '46%',
        backgroundColor: COLORS.card,
        margin: '2%',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    gridIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    gridLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    gridValue: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    description: {
        fontSize: 15,
        lineHeight: 24,
        color: COLORS.text,
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    skillBadge: {
        backgroundColor: COLORS.background,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    skillText: {
        fontSize: 14,
        color: COLORS.secondary,
        fontWeight: '500',
    },
    actionContainer: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    primaryButton: {
        borderRadius: 16,
        paddingVertical: 16,
        backgroundColor: COLORS.secondary,
        elevation: 4,
    },
    successBadge: {
        backgroundColor: COLORS.success,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
    },
    successText: {
        color: COLORS.white,
        fontWeight: '700',
        fontSize: 16,
    },
    warningBadge: {
        backgroundColor: COLORS.warning,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
    },
    warningText: {
        color: COLORS.white,
        fontWeight: '700',
        fontSize: 16,
    },
    disabledBadge: {
        backgroundColor: COLORS.border,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    disabledText: {
        color: COLORS.textSecondary,
        fontWeight: '600',
        fontSize: 15,
    },
    locationCard: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        overflow: 'hidden', // Contain the map image
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    staticMapContainer: {
        height: 160,
        width: '100%',
        backgroundColor: '#E0E0E0',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    staticMapImage: {
        width: '100%',
        height: '100%',
    },
    mapLoader: {
        position: 'absolute',
        zIndex: 1,
    },
    mapMarkerOverlay: {
        position: 'absolute',
        zIndex: 2,
        top: '40%', // Adjust to center visually on the static map center
    },
    locationInfoMain: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    locationIconBg: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    locationAddressMain: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        lineHeight: 20,
    },
    locationCoords: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    mapActionBtn: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        margin: 16,
        marginTop: 0,
        borderRadius: 12,
        gap: 10,
    },
    mapActionBtnText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: '700',
    }
});
