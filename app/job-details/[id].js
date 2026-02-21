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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { COLORS } from '../../constants/config';
import { getJobById, applyToJob } from '../../services/jobService';
import { calculateRoute } from '../../services/geolocationService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import WorkLogHistoryModal from '../../components/worklog/WorkLogHistoryModal';

export default function JobDetailScreen() {
    const { id } = useLocalSearchParams();
    const { user } = useAuth();
    const { t } = useLanguage();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showWorkHistory, setShowWorkHistory] = useState(false);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [locationPermission, setLocationPermission] = useState(null);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const mapRef = React.useRef(null);

    const fetchJob = async () => {
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

    const getLocation = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(status);
        if (status !== 'granted') {
            Alert.alert('Permission to access location was denied');
            return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setCurrentLocation(location.coords);
    };

    const isAssigned = job?.workers?.some(w => {
        const id = w.workerId?._id || w.workerId;
        return id?.toString() === user?._id?.toString() && ['hired', 'in-progress', 'completed'].includes(w.status);
    });

    useEffect(() => {
        if (id) {
            fetchJob();
        }
    }, [id]);

    useEffect(() => {
        if (isAssigned) {
            getLocation();
        }
    }, [isAssigned]);

    useEffect(() => {
        const fetchRoute = async () => {
            if (currentLocation && job?.location?.coordinates) {
                try {
                    const origin = {
                        latitude: currentLocation.latitude,
                        longitude: currentLocation.longitude
                    };
                    const destination = {
                        latitude: job.location.coordinates[1],
                        longitude: job.location.coordinates[0]
                    };
                    const route = await calculateRoute(origin, destination);
                    if (route && route.length > 0) {
                        setRouteCoordinates(route);

                        // Fit map to show the whole route
                        if (mapRef.current) {
                            mapRef.current.fitToCoordinates([origin, destination], {
                                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                                animated: true,
                            });
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch route:', error);
                    // Fallback to straight line if API fails
                    setRouteCoordinates([
                        { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
                        { latitude: job.location.coordinates[1], longitude: job.location.coordinates[0] }
                    ]);
                }
            }
        };

        fetchRoute();
    }, [currentLocation, job?.location?.coordinates]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchJob();
        if (isAssigned) {
            getLocation();
        }
    };

    const handleApply = async () => {
        try {
            setApplying(true);
            await applyToJob(id);
            Alert.alert(t('success'), t('success_apply'));
            fetchJob();
        } catch (error) {
            console.error('Failed to apply:', error);
            Alert.alert(t('error_title'), error.response?.data?.message || 'Failed to apply');
        } finally {
            setApplying(false);
        }
    };

    const handleGetDirections = () => {
        if (!job?.location?.coordinates) {
            Alert.alert('Error', 'Job location not available');
            return;
        }
        const [lng, lat] = job.location.coordinates;
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${lat},${lng}`;
        const label = job.title || 'Job Location';
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
                        <Text style={styles.title}>{job.title}</Text>
                        <View style={[
                            styles.statusBadge,
                            job.status === 'open' && styles.statusOpen,
                            job.status === 'closed' && styles.statusClosed,
                            job.status === 'in-progress' && styles.statusProgress,
                        ]}>
                            <Text style={styles.statusText}>{job.status}</Text>
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
                                {job.employer?.companyName || job.employer?.name || 'Company'}
                            </Text>
                            <Text style={styles.companyType}>
                                {job.employer?.businessType || 'Employer'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.keyStatsRow}>
                        <View style={styles.keyStatItem}>
                            <Ionicons name="cash-outline" size={18} color={COLORS.success} />
                            <Text style={styles.keyStatText} numberOfLines={1}>₹{job.salary}/day</Text>
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
                            <Ionicons name="time-outline" size={18} color={COLORS.warning} />
                            <Text style={styles.keyStatText} numberOfLines={1}>
                                {job.workType === 'permanent' ? t('full_time') : t('contract')}
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
                            <Ionicons name="briefcase-outline" size={20} color={COLORS.primary} />
                        </View>
                        <Text style={styles.gridLabel}>{t('role')}</Text>
                        <Text style={styles.gridValue}>{job.category || 'General'}</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <View style={[styles.gridIcon, { backgroundColor: '#E8F5E9' }]}>
                            <Ionicons name="people-outline" size={20} color={COLORS.success} />
                        </View>
                        <Text style={styles.gridLabel}>{t('openings')}</Text>
                        <Text style={styles.gridValue}>{job.totalOpenings} {t('vacancies')}</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <View style={[styles.gridIcon, { backgroundColor: '#FFF3E0' }]}>
                            <Ionicons name="calendar-outline" size={20} color={COLORS.warning} />
                        </View>
                        <Text style={styles.gridLabel}>{t('duration')}</Text>
                        <Text style={styles.gridValue}>{job.durationDays || 'N/A'} {t('days')}</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <View style={[styles.gridIcon, { backgroundColor: '#F3E5F5' }]}>
                            <Ionicons name="transgender-outline" size={20} color="#9C27B0" />
                        </View>
                        <Text style={styles.gridLabel}>{t('gender')}</Text>
                        <Text style={styles.gridValue}>{job.gender || t('any')}</Text>
                    </View>
                </View>

                {/* Description */}
                {job.description && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('description')}</Text>
                        <Text style={styles.description}>{job.description}</Text>
                    </View>
                )}

                {/* Requirements */}
                {job.requirements && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('requirements')}</Text>
                        <Text style={styles.description}>{job.requirements}</Text>
                    </View>
                )}

                {/* Skills */}
                {job.skills && job.skills.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('required_skills')}</Text>
                        <View style={styles.skillsContainer}>
                            {job.skills.map((skill, index) => (
                                <View key={index} style={styles.skillBadge}>
                                    <Text style={styles.skillText}>{skill}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Map Section for Assigned Workers */}
                {isAssigned && job.location?.coordinates && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('location_map')}</Text>
                        <View style={styles.mapContainer}>
                            <MapView
                                ref={mapRef}
                                provider={PROVIDER_GOOGLE}
                                style={styles.map}
                                initialRegion={{
                                    latitude: job.location.coordinates[1],
                                    longitude: job.location.coordinates[0],
                                    latitudeDelta: 0.05,
                                    longitudeDelta: 0.05,
                                }}
                            >
                                <Marker
                                    coordinate={{
                                        latitude: job.location.coordinates[1],
                                        longitude: job.location.coordinates[0],
                                    }}
                                    title={job.title}
                                    description={job.location.address}
                                    anchor={{ x: 0.5, y: 1 }} // Anchor at bottom center (tip of the pin)
                                >
                                    <View style={styles.markerContainer}>
                                        <View style={styles.jobMarkerPin}>
                                            <Ionicons name="briefcase" size={18} color={COLORS.white} />
                                        </View>
                                        <View style={styles.markerTip} />
                                    </View>
                                </Marker>

                                {currentLocation && (
                                    <Marker
                                        coordinate={{
                                            latitude: currentLocation.latitude,
                                            longitude: currentLocation.longitude,
                                        }}
                                        title={t('you_are_here')}
                                        anchor={{ x: 0.5, y: 0.5 }} // Center anchor for user dot
                                    >
                                        <View style={styles.userMarkerContainer}>
                                            <View style={styles.userMarkerPulse} />
                                            <View style={styles.userMarkerDot}>
                                                <Ionicons name="person" size={14} color={COLORS.white} />
                                            </View>
                                        </View>
                                    </Marker>
                                )}

                                {routeCoordinates && routeCoordinates.length > 0 && (
                                    <Polyline
                                        coordinates={routeCoordinates}
                                        strokeColor={COLORS.primary}
                                        strokeWidth={4}
                                    />
                                )}
                            </MapView>
                            {/* Overlay to intercept gestures if needed, or put buttons over map */}
                            <TouchableOpacity
                                style={styles.mapOverlayBtn}
                                onPress={handleGetDirections}
                            >
                                <Ionicons name="navigate" size={20} color={COLORS.white} />
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
    mapContainer: {
        height: 250,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
        position: 'relative',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    jobMarkerPin: {
        backgroundColor: COLORS.danger,
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 3,
        borderColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    markerTip: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 7,
        borderRightWidth: 7,
        borderTopWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: COLORS.white,
        marginTop: -2, // Slight overlap
    },
    userMarkerContainer: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userMarkerPulse: {
        position: 'absolute',
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        opacity: 0.2,
    },
    userMarkerDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        borderWidth: 2,
        borderColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    mapOverlayBtn: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: COLORS.primary,
        padding: 12,
        borderRadius: 30,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    }
});
