import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import LocationPicker from '../../components/LocationPicker';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AnimatedModal from '../../components/ui/AnimatedModal';
import SelectionModal from '../../components/ui/SelectionModal';
import { useLanguage } from '../../context/LanguageContext';
import { COLORS, WORKER_TYPES, WORK_TYPES, WORKER_SKILLS } from '../../constants/config';
import { createJob, getJobById, updateJob } from '../../services/jobService';
import { canPostJob, getSubscriptionPlans } from '../../services/subscriptionService';

const INITIAL_FORM_DATA = {
    status: 'open',
    title: '',
    description: '',
    skills: '',
    workerType: [],
    salary: '',
    location: '',
    city: '',
    state: '',
    coordinates: null,
    workType: 'temporary',
    durationDays: '',
    totalOpenings: '1',
    minExperience: '',
    maxExperience: '',
    otpVerificationRequired: false,
    geoTaggingRequired: false,
};

export default function PostJobScreen() {
    const { jobId } = useLocalSearchParams();
    const { t } = useLanguage();
    const isEditing = !!jobId;
    const [loading, setLoading] = useState(false);
    const [fetchingJob, setFetchingJob] = useState(isEditing);
    const [checkingSubscription, setCheckingSubscription] = useState(true);
    const [subscriptionInfo, setSubscriptionInfo] = useState(null);
    const [availablePlans, setAvailablePlans] = useState([]);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        type: 'subscription',
        title: '',
        message: '',
        primaryButtonText: '',
        tabToOpen: 'plans',
    });
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);
    const [errors, setErrors] = useState({});
    const [showWorkerModal, setShowWorkerModal] = useState(false);
    const [showSkillsModal, setShowSkillsModal] = useState(false);

    // Check subscription status on mount
    useEffect(() => {
        checkSubscription();
        fetchPlans();
        if (isEditing) {
            fetchJobDetails();
        } else {
            // Reset form when not editing (fixes state leak from previous edits)
            setFormData(INITIAL_FORM_DATA);
            setErrors({});
        }
    }, [jobId]);

    const fetchJobDetails = async () => {
        try {
            setFetchingJob(true);
            const job = await getJobById(jobId);
            if (job) {
                setFormData({
                    title: job.title || '',
                    description: job.description || '',
                    skills: job.skills ? job.skills.join(', ') : '',
                    workerType: job.workerType || [],
                    salary: job.salary ? String(job.salary) : '',
                    location: job.location?.address || '',
                    city: job.location?.city || '',
                    state: job.location?.state || '',
                    coordinates: job.location?.coordinates ? {
                        latitude: job.location.coordinates[1],
                        longitude: job.location.coordinates[0]
                    } : null,
                    workType: job.workType || 'temporary',
                    durationDays: job.durationDays ? String(job.durationDays) : '',
                    totalOpenings: job.totalOpenings ? String(job.totalOpenings) : '1',
                    minExperience: job.minExperience ? String(job.minExperience) : '',
                    maxExperience: job.maxExperience ? String(job.maxExperience) : '',
                    status: job.status || 'open',
                    otpVerificationRequired: job.otpVerificationRequired || false,
                    geoTaggingRequired: job.geoTaggingRequired || false,
                });
            }
        } catch (error) {
            console.error('Error fetching job details:', error);
            Alert.alert(t('error'), t('failed_to_load_job_details'));
            router.back();
        } finally {
            setFetchingJob(false);
        }
    };

    const fetchPlans = async () => {
        try {
            const plans = await getSubscriptionPlans();
            // Filter out addons for quick selection
            setAvailablePlans(plans.filter(p => !p.isAddon));
        } catch (error) {
            console.error('Error fetching plans:', error);
        }
    };

    const checkSubscription = async () => {
        try {
            const result = await canPostJob();
            setSubscriptionInfo(result);

            if (!result.canPostJob && !isEditing) {
                const isNoSubscription = result.reason === 'no_subscription';
                const isExpired = result.reason === 'expired';
                const isLimitReached = result.reason === 'limit_reached';

                let modalType = 'subscription';
                let title = t('subscription_required');
                let buttonText = t('view_plans');
                let tabToOpen = 'plans';

                if (isExpired) {
                    modalType = 'expired';
                    title = t('subscription_expired');
                    buttonText = t('renew_now');
                    tabToOpen = 'myplan';
                } else if (isLimitReached) {
                    modalType = 'limit';
                    title = t('job_limit_reached');
                    buttonText = t('upgrade_plan');
                    tabToOpen = 'plans';
                }

                setModalConfig({
                    type: modalType,
                    title,
                    message: result.message,
                    primaryButtonText: buttonText,
                    tabToOpen,
                });
                setShowSubscriptionModal(true);
            }
        } catch (error) {
            console.error('Error checking subscription:', error);
            // Allow posting if check fails (fallback to backend check)
            setSubscriptionInfo({ canPostJob: true });
        } finally {
            setCheckingSubscription(false);
        }
    };

    const handleModalPrimaryPress = () => {
        setShowSubscriptionModal(false);
        router.push({
            pathname: '/(employer)/subscription-plans',
            params: { tab: modalConfig.tabToOpen }
        });
    };

    const handleModalClose = () => {
        setShowSubscriptionModal(false);
        router.replace('/(employer)/dashboard');
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.title.trim()) newErrors.title = t('validation_title_req');
        if (!formData.description.trim()) newErrors.description = t('validation_desc_req');
        if (!formData.salary || isNaN(formData.salary)) newErrors.salary = t('validation_salary_req');
        if (!formData.location.trim()) newErrors.location = t('validation_loc_req');
        if (formData.workType === 'temporary' && !formData.durationDays) {
            newErrors.durationDays = t('validation_duration_req');
        }
        if (formData.workerType.length === 0) newErrors.workerType = t('validation_worker_type_req');

        if (formData.minExperience && isNaN(formData.minExperience)) newErrors.minExperience = 'Must be a number';
        if (formData.maxExperience && isNaN(formData.maxExperience)) newErrors.maxExperience = 'Must be a number';
        if (formData.minExperience && formData.maxExperience && Number(formData.minExperience) > Number(formData.maxExperience)) {
            newErrors.minExperience = 'Min > Max';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            const jobData = {
                title: formData.title,
                description: formData.description,
                skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
                workerType: formData.workerType,
                salary: Number(formData.salary),
                location: {
                    address: formData.location,
                    city: formData.city || '',
                    state: formData.state || '',
                    latitude: formData.coordinates?.latitude,
                    longitude: formData.coordinates?.longitude
                },
                workType: formData.workType,
                totalOpenings: Number(formData.totalOpenings) || 1,
                minExperience: formData.minExperience ? Number(formData.minExperience) : undefined,
                maxExperience: formData.maxExperience ? Number(formData.maxExperience) : undefined,
                status: formData.status,
                otpVerificationRequired: formData.otpVerificationRequired,
                geoTaggingRequired: formData.geoTaggingRequired,
            };

            if (formData.workType === 'temporary') {
                jobData.durationDays = Number(formData.durationDays);
            }

            if (isEditing) {
                await updateJob(jobId, jobData);
                Alert.alert(t('success'), t('job_updated_success'), [
                    { text: t('ok'), onPress: () => router.push('/(employer)/my-jobs') }
                ]);
            } else {
                await createJob(jobData);
                Alert.alert(t('success'), t('job_posted_success'), [
                    { text: t('ok'), onPress: () => router.push('/(employer)/my-jobs') }
                ]);
            }
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || `Failed to ${isEditing ? 'update' : 'post'} job`);
        } finally {
            setLoading(false);
        }
    };

    const handleWorkerTypeSelect = (type) => {
        setFormData({ ...formData, workerType: [type], skills: '' }); // Clear skills when worker type changes
        setErrors({ ...errors, workerType: '' });
    };

    const handleSkillsSelect = (skills) => {
        setFormData({ ...formData, skills: skills.join(', ') });
    };


    const getSuggestedSkills = () => {
        if (!formData.workerType || formData.workerType.length === 0) return [];

        let suggestions = [];
        formData.workerType.forEach(type => {
            if (WORKER_SKILLS[type]) {
                suggestions = [...suggestions, ...WORKER_SKILLS[type]];
            }
        });

        return [...new Set(suggestions)];
    };

    // Show loading while checking subscription
    if (checkingSubscription || fetchingJob) {
        return <LoadingSpinner fullScreen message={fetchingJob ? t('loading') : t('loading')} />;
    }
    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: isEditing ? t('edit_job_location') : t('post_new_job') }} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Upgrade Plan Card - When no subscription or limit reached (Hidden in edit mode) */}
                    {subscriptionInfo && !subscriptionInfo.canPostJob && !isEditing && (
                        <View style={styles.upgradePlanCard}>
                            <View style={styles.upgradeHeader}>
                                <View style={styles.upgradeIconContainer}>
                                    <Ionicons
                                        name={subscriptionInfo.reason === 'expired' ? 'time' : subscriptionInfo.reason === 'limit_reached' ? 'trending-up' : 'card'}
                                        size={32}
                                        color={COLORS.white}
                                    />
                                </View>
                                <View style={styles.upgradeHeaderText}>
                                    <Text style={styles.upgradeTitle}>
                                        {subscriptionInfo.reason === 'expired'
                                            ? t('subscription_expired')
                                            : subscriptionInfo.reason === 'limit_reached'
                                                ? t('job_limit_reached')
                                                : t('subscription_required')}
                                    </Text>
                                    <Text style={styles.upgradeSubtitle}>
                                        {subscriptionInfo.message}
                                    </Text>
                                </View>
                            </View>

                            {/* Current Status Details if available */}
                            {subscriptionInfo.subscription && (
                                <View style={styles.currentStatusContainer}>
                                    <View style={styles.statusRow}>
                                        <Text style={styles.statusLabel}>{t('current_plan')}</Text>
                                        <Text style={styles.statusValue}>{subscriptionInfo.subscription.name}</Text>
                                    </View>
                                    {subscriptionInfo.reason === 'limit_reached' && (
                                        <View style={styles.statusRow}>
                                            <Text style={styles.statusLabel}>{t('active_jobs_count')}</Text>
                                            <Text style={styles.statusValue}>{subscriptionInfo.subscription.activeJobsCount} / {subscriptionInfo.subscription.maxActiveJobs}</Text>
                                        </View>
                                    )}
                                    <View style={styles.statusRow}>
                                        <Text style={styles.statusLabel}>{t('remaining_time')}</Text>
                                        <Text style={styles.statusValue}>{subscriptionInfo.subscription.daysRemaining} {t('days')}</Text>
                                    </View>

                                    <View style={styles.progressBarWrapper}>
                                        <View
                                            style={[
                                                styles.progressBar,
                                                { width: `${(subscriptionInfo.subscription.activeJobsCount / subscriptionInfo.subscription.maxActiveJobs) * 100}%` }
                                            ]}
                                        />
                                    </View>
                                </View>
                            )}

                            {/* Dynamic Quick Plan Options */}
                            <View style={styles.quickPlansContainer}>
                                {availablePlans.slice(0, 3).map((plan, index) => (
                                    <TouchableOpacity
                                        key={plan.planKey || index}
                                        style={[
                                            styles.quickPlanCard,
                                            plan.planKey === 'pro' && styles.quickPlanCardPopular // Mark 90 days plan as popular
                                        ]}
                                        onPress={() => router.push({ pathname: '/(employer)/subscription-plans', params: { tab: 'plans' } })}
                                    >
                                        {plan.planKey === 'pro' && (
                                            <View style={styles.popularTag}>
                                                <Text style={styles.popularTagText}>{t('best_value_tag')}</Text>
                                            </View>
                                        )}
                                        <Ionicons
                                            name={index === 0 ? 'flash' : index === 1 ? 'star' : 'rocket'}
                                            size={24}
                                            color={plan.planKey === 'pro' ? COLORS.white : COLORS.secondary}
                                        />
                                        <Text style={[styles.quickPlanName, plan.planKey === 'pro' && styles.quickPlanNameWhite]}>
                                            {plan.name.replace(' Plan', '')}
                                        </Text>
                                        <Text style={[styles.quickPlanPrice, plan.planKey === 'pro' && styles.quickPlanPriceWhite]}>
                                            ₹{plan.price}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={styles.viewAllPlansBtn}
                                onPress={() => router.push({ pathname: '/(employer)/subscription-plans', params: { tab: 'plans' } })}
                            >
                                <Text style={styles.viewAllPlansText}>{t('choose_other_plans')}</Text>
                                <Ionicons name="arrow-forward" size={18} color={COLORS.secondary} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Subscription Info Banner - When has active subscription */}
                    {subscriptionInfo?.canPostJob && subscriptionInfo?.subscription && (
                        <View style={styles.subscriptionBanner}>
                            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                            <Text style={styles.subscriptionText}>
                                {subscriptionInfo.subscription.remainingSlots} {t('job_slot_remaining')} • {subscriptionInfo.subscription.daysRemaining} {t('days_left')}
                            </Text>
                        </View>
                    )}

                    <Card>
                        <Input
                            label={t('job_title_label')}
                            placeholder={t('job_title_placeholder')}
                            value={formData.title}
                            onChangeText={(text) => setFormData({ ...formData, title: text })}
                            error={errors.title}
                            editable={!isEditing}
                        />

                        <Input
                            label={t('description')}
                            placeholder={t('job_desc_placeholder')}
                            value={formData.description}
                            onChangeText={(text) => setFormData({ ...formData, description: text })}
                            error={errors.description}
                            multiline
                            numberOfLines={4}
                            editable={!isEditing}
                        />

                        {/* Worker Type Selection */}
                        <View style={[styles.fieldContainer, isEditing && { opacity: 0.7 }]}>
                            <Text style={styles.label}>{t('worker_type_required')}</Text>
                            <TouchableOpacity
                                style={[styles.dropdown, errors.workerType && styles.dropdownError]}
                                onPress={() => !isEditing && setShowWorkerModal(true)}
                                disabled={isEditing}
                            >
                                <Text style={formData.workerType.length > 0 ? styles.dropdownText : styles.dropdownPlaceholder}>
                                    {formData.workerType.length > 0
                                        ? formData.workerType[0]
                                        : t('select_worker_type_placeholder')}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                            {errors.workerType && <Text style={styles.errorText}>{errors.workerType}</Text>}
                        </View>

                        {/* Skills Selection (Dropdown) */}
                        <View style={[styles.fieldContainer, isEditing && { opacity: 0.7 }]}>
                            <Text style={styles.label}>{t('required_skills')}</Text>
                            <TouchableOpacity
                                style={styles.dropdown}
                                onPress={() => {
                                    if (isEditing) return;
                                    if (formData.workerType.length === 0) {
                                        Alert.alert(t('select_worker_type'), t('skills_helper'));
                                        return;
                                    }
                                    setShowSkillsModal(true);
                                }}
                                disabled={isEditing}
                            >
                                <Text style={formData.skills.length > 0 ? styles.dropdownText : styles.dropdownPlaceholder}>
                                    {formData.skills.length > 0
                                        ? formData.skills
                                        : t('select_skills_placeholder')}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Input
                            label={t('daily_salary_label')}
                            placeholder="e.g., 500"
                            value={formData.salary}
                            onChangeText={(text) => setFormData({ ...formData, salary: text.replace(/[^0-9]/g, '') })}
                            keyboardType="numeric"
                            error={errors.salary}
                            editable={!isEditing}
                        />

                        <LocationPicker
                            label={t('location')}
                            placeholder="e.g., Kolkata, West Bengal"
                            value={formData.location}
                            onChangeLocation={(text, coords, place) => {
                                setFormData({
                                    ...formData,
                                    location: text,
                                    city: place?.city || '',
                                    state: place?.state || '',
                                    coordinates: coords || null
                                });
                                setErrors({ ...errors, location: '' });
                            }}
                            error={errors.location}
                        />

                        {/* Work Type */}
                        <View style={[styles.fieldContainer, isEditing && { opacity: 0.7 }]}>
                            <Text style={styles.label}>{t('job_type')}</Text>
                            <View style={styles.workTypeContainer}>
                                {WORK_TYPES.map((type) => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[styles.workTypeOption, formData.workType === type && styles.workTypeSelected]}
                                        onPress={() => !isEditing && setFormData({ ...formData, workType: type })}
                                        disabled={isEditing}
                                    >
                                        <Text style={[styles.workTypeText, formData.workType === type && styles.workTypeTextSelected]}>
                                            {t('filter_' + type)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {formData.workType === 'temporary' && (
                            <Input
                                label={t('duration_days_label')}
                                placeholder="e.g., 7"
                                value={formData.durationDays}
                                onChangeText={(text) => setFormData({ ...formData, durationDays: text.replace(/[^0-9]/g, '') })}
                                keyboardType="numeric"
                                error={errors.durationDays}
                                editable={!isEditing}
                            />
                        )}

                        <Input
                            label={t('total_openings_label')}
                            placeholder="e.g., 1"
                            value={formData.totalOpenings}
                            onChangeText={(text) => setFormData({ ...formData, totalOpenings: text.replace(/[^0-9]/g, '') })}
                            keyboardType="numeric"
                            editable={!isEditing}
                        />

                        {/* Experience Range */}
                        <View style={styles.rowContainer}>
                            <View style={styles.halfWidth}>
                                <Input
                                    label={t('min_exp_label')}
                                    placeholder="0"
                                    value={formData.minExperience}
                                    onChangeText={(text) => setFormData({ ...formData, minExperience: text.replace(/[^0-9]/g, '') })}
                                    keyboardType="numeric"
                                    error={errors.minExperience}
                                    editable={!isEditing}
                                />
                            </View>
                            <View style={styles.halfWidth}>
                                <Input
                                    label={t('max_exp_label')}
                                    placeholder="5"
                                    value={formData.maxExperience}
                                    onChangeText={(text) => setFormData({ ...formData, maxExperience: text.replace(/[^0-9]/g, '') })}
                                    keyboardType="numeric"
                                    error={errors.maxExperience}
                                    editable={!isEditing}
                                />
                            </View>
                        </View>

                        {/* Verification & Geo-tagging Options */}
                        <View style={[styles.checkboxContainer, isEditing && { opacity: 0.7 }]}>
                            <TouchableOpacity
                                style={styles.checkboxRow}
                                onPress={() => !isEditing && setFormData({ ...formData, otpVerificationRequired: !formData.otpVerificationRequired })}
                                disabled={isEditing}
                            >
                                <View style={[styles.checkbox, formData.otpVerificationRequired && styles.checkboxChecked]}>
                                    {formData.otpVerificationRequired && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                                </View>
                                <Text style={styles.checkboxLabel}>{t('otp_verify_req')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.checkboxRow}
                                onPress={() => !isEditing && setFormData({ ...formData, geoTaggingRequired: !formData.geoTaggingRequired })}
                                disabled={isEditing}
                            >
                                <View style={[styles.checkbox, formData.geoTaggingRequired && styles.checkboxChecked]}>
                                    {formData.geoTaggingRequired && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                                </View>
                                <Text style={styles.checkboxLabel}>{t('geo_tag_req')}</Text>
                            </TouchableOpacity>
                        </View>
                    </Card>

                    <Button
                        title={isEditing ? t('update_job_location') : t('post_job')}
                        onPress={handleSubmit}
                        loading={loading}
                        style={styles.submitButton}
                    />
                </ScrollView>

                {/* Modern Animated Subscription Modal */}
                <AnimatedModal
                    visible={showSubscriptionModal}
                    type={modalConfig.type}
                    title={modalConfig.title}
                    message={modalConfig.message}
                    primaryButtonText={modalConfig.primaryButtonText}
                    secondaryButtonText={t('go_back')}
                    onPrimaryPress={handleModalPrimaryPress}
                    onSecondaryPress={handleModalClose}
                    onClose={handleModalClose}
                />

                {/* Worker Type Selection Modal */}
                <SelectionModal
                    visible={showWorkerModal}
                    title={t('select_worker_type')}
                    options={WORKER_TYPES}
                    selectedValue={formData.workerType[0]}
                    onSelect={handleWorkerTypeSelect}
                    onClose={() => setShowWorkerModal(false)}
                    multiSelect={false}
                />

                {/* Skills Selection Modal */}
                <SelectionModal
                    visible={showSkillsModal}
                    title={t('select_skills')}
                    options={getSuggestedSkills()}
                    selectedValue={formData.skills ? formData.skills.split(', ') : []}
                    onSelect={handleSkillsSelect}
                    onClose={() => setShowSkillsModal(false)}
                    multiSelect={true}
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        padding: 16,
    },
    fieldContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text,
        marginBottom: 6,
    },
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    dropdownError: {
        borderColor: COLORS.danger,
    },
    dropdownText: {
        fontSize: 14,
        color: COLORS.text,
        flex: 1,
    },
    dropdownPlaceholder: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    errorText: {
        color: COLORS.danger,
        fontSize: 12,
        marginTop: 4,
    },
    typesList: {
        marginTop: 8,
        backgroundColor: COLORS.white,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    typeItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    typeItemSelected: {
        backgroundColor: COLORS.secondary,
    },
    typeText: {
        fontSize: 14,
        color: COLORS.text,
    },
    typeTextSelected: {
        color: COLORS.white,
    },
    workTypeContainer: {
        flexDirection: 'row',
    },
    workTypeOption: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 8,
        marginRight: 8,
    },
    workTypeSelected: {
        backgroundColor: COLORS.secondary,
    },
    workTypeText: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
    workTypeTextSelected: {
        color: COLORS.white,
    },
    submitButton: {
        marginTop: 16,
        marginBottom: 32,
        backgroundColor: COLORS.secondary,
    },
    subscriptionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    subscriptionText: {
        fontSize: 13,
        color: COLORS.text,
        marginLeft: 10,
        fontWeight: '500',
    },
    // Upgrade Plan Card Styles
    upgradePlanCard: {
        backgroundColor: '#1a1a2e',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    upgradeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    upgradeIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: COLORS.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    upgradeHeaderText: {
        flex: 1,
    },
    upgradeTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    upgradeSubtitle: {
        fontSize: 13,
        color: '#9CA3AF',
        lineHeight: 18,
    },
    currentStatusContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    statusLabel: {
        fontSize: 13,
        color: '#9CA3AF',
    },
    statusValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    progressBarWrapper: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 3,
        marginTop: 8,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.secondary,
        borderRadius: 3,
    },
    quickPlansContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    quickPlanCard: {
        flex: 1,
        backgroundColor: '#2d2d44',
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#3d3d5c',
    },
    quickPlanCardPopular: {
        backgroundColor: COLORS.secondary,
        borderColor: COLORS.secondary,
        position: 'relative',
    },
    popularTag: {
        position: 'absolute',
        top: -8,
        right: -5,
        backgroundColor: '#FFD700',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    popularTagText: {
        fontSize: 8,
        fontWeight: '800',
        color: '#000',
    },
    quickPlanName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
        marginTop: 8,
    },
    quickPlanNameWhite: {
        color: '#FFFFFF',
    },
    quickPlanPrice: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.secondary,
        marginTop: 4,
    },
    quickPlanPriceWhite: {
        color: '#FFFFFF',
    },
    viewAllPlansBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    viewAllPlansText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.secondary,
    },
    suggestionChip: {
        backgroundColor: COLORS.backgroundDark,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    suggestionText: {
        fontSize: 12,
        color: COLORS.text,
    },
    noSkillsContainer: {
        padding: 16,
        alignItems: 'center',
    },
    noSkillsText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    rowContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    halfWidth: {
        width: '48%',
    },
    checkboxContainer: {
        marginTop: 8,
        marginBottom: 16,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: COLORS.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        backgroundColor: COLORS.white,
    },
    checkboxChecked: {
        backgroundColor: COLORS.secondary,
    },
    checkboxLabel: {
        fontSize: 14,
        color: COLORS.text,
    },
});
