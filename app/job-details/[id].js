import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import { getJobById, applyToJob } from '../../services/jobService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';

export default function JobDetailScreen() {
    const { id } = useLocalSearchParams();
    const { user } = useAuth();
    const { t } = useLanguage();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

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

    const isAssigned = job.workers?.some(w => w.workerId === user?._id);
    const hasApplied = job.userApplicationStatus || job.applicants?.some(a => (a._id || a.worker?._id || a).toString() === user?._id?.toString());
    const isEmployer = user?.role === 'employer';
    const isMyJob = job.employer?._id === user?._id || job.employer === user?._id;

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
                                {job.location?.city || t('location')}
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

                {/* Action Button */}
                <View style={styles.actionContainer}>
                    {isMyJob ? (
                        <Button
                            title={`${t('view_applicants')} (${job.applicants?.length || 0})`}
                            onPress={() => router.push(`/job/${id}/applicants`)}
                            style={styles.primaryButton}
                        />
                    ) : isAssigned ? (
                        <View style={styles.successBadge}>
                            <Ionicons name="checkmark-circle" size={24} color={COLORS.white} />
                            <Text style={styles.successText}>{t('hired_msg')}</Text>
                        </View>
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
        marginTop: -50, // Adjusted overlap
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
});
