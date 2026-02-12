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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import LocationPicker from '../../components/LocationPicker';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AnimatedModal from '../../components/ui/AnimatedModal';
import { COLORS, WORKER_TYPES, WORK_TYPES, WORKER_SKILLS } from '../../constants/config';
import { createJob } from '../../services/jobService';
import { canPostJob } from '../../services/subscriptionService';

export default function PostJobScreen() {
    const [loading, setLoading] = useState(false);
    const [checkingSubscription, setCheckingSubscription] = useState(true);
    const [subscriptionInfo, setSubscriptionInfo] = useState(null);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        type: 'subscription',
        title: '',
        message: '',
        primaryButtonText: '',
        tabToOpen: 'plans',
    });
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        skills: '',
        workerType: [],
        salary: '',
        location: '',
        coordinates: null,
        workType: 'temporary',
        durationDays: '',
        totalOpenings: '1',
        minExperience: '',
        maxExperience: '',
        otpVerificationRequired: false,
        geoTaggingRequired: false,
    });
    const [errors, setErrors] = useState({});
    const [showWorkerTypes, setShowWorkerTypes] = useState(false);
    const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);

    // Check subscription status on mount
    useEffect(() => {
        checkSubscription();
    }, []);

    const checkSubscription = async () => {
        try {
            const result = await canPostJob();
            setSubscriptionInfo(result);

            if (!result.canPostJob) {
                const isNoSubscription = result.reason === 'no_subscription';
                const isExpired = result.reason === 'expired';
                const isLimitReached = result.reason === 'limit_reached';

                let modalType = 'subscription';
                let title = 'Subscription Required';
                let buttonText = 'View Plans';
                let tabToOpen = 'plans';

                if (isExpired) {
                    modalType = 'expired';
                    title = 'Subscription Expired';
                    buttonText = 'Renew Now';
                    tabToOpen = 'myplan';
                } else if (isLimitReached) {
                    modalType = 'limit';
                    title = 'Job Limit Reached';
                    buttonText = 'Upgrade Plan';
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
        if (!formData.title.trim()) newErrors.title = 'Job title is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (!formData.salary || isNaN(formData.salary)) newErrors.salary = 'Valid salary is required';
        if (!formData.location.trim()) newErrors.location = 'Location is required';
        if (formData.workType === 'temporary' && !formData.durationDays) {
            newErrors.durationDays = 'Duration is required for temporary jobs';
        }
        if (formData.workerType.length === 0) newErrors.workerType = 'Select at least one worker type';

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
                    ...(formData.coordinates && {
                        coordinates: {
                            lat: formData.coordinates.latitude,
                            lng: formData.coordinates.longitude
                        }
                    })
                },
                workType: formData.workType,
                totalOpenings: Number(formData.totalOpenings) || 1,
                minExperience: formData.minExperience ? Number(formData.minExperience) : undefined,
                maxExperience: formData.maxExperience ? Number(formData.maxExperience) : undefined,
                otpVerificationRequired: formData.otpVerificationRequired,
                geoTaggingRequired: formData.geoTaggingRequired,
            };

            if (formData.workType === 'temporary') {
                jobData.durationDays = Number(formData.durationDays);
            }

            await createJob(jobData);
            Alert.alert('Success', 'Job posted successfully!', [
                { text: 'OK', onPress: () => router.push('/(employer)/my-jobs') }
            ]);
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to post job');
        } finally {
            setLoading(false);
        }
    };

    const toggleWorkerType = (type) => {
        const types = [...formData.workerType];
        const index = types.indexOf(type);
        if (index > -1) {
            types.splice(index, 1);
        } else {
            types.push(type);
        }
        setFormData({ ...formData, workerType: types });
        setErrors({ ...errors, workerType: '' });
    };

    const toggleSkill = (skill) => {
        const currentSkills = formData.skills ? formData.skills.split(', ').filter(Boolean) : [];
        const index = currentSkills.indexOf(skill);

        let newSkills;
        if (index > -1) {
            newSkills = currentSkills.filter(s => s !== skill);
        } else {
            newSkills = [...currentSkills, skill];
        }

        setFormData({ ...formData, skills: newSkills.join(', ') });
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
    if (checkingSubscription) {
        return <LoadingSpinner fullScreen message="Checking subscription..." />;
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Upgrade Plan Card - When no subscription or limit reached */}
                {subscriptionInfo && !subscriptionInfo.canPostJob && (
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
                                        ? 'Subscription Expired'
                                        : subscriptionInfo.reason === 'limit_reached'
                                            ? 'Job Limit Reached'
                                            : 'No Active Subscription'}
                                </Text>
                                <Text style={styles.upgradeSubtitle}>
                                    {subscriptionInfo.message}
                                </Text>
                            </View>
                        </View>

                        {/* Quick Plan Options */}
                        <View style={styles.quickPlansContainer}>
                            <TouchableOpacity
                                style={styles.quickPlanCard}
                                onPress={() => router.push({ pathname: '/(employer)/subscription-plans', params: { tab: 'plans' } })}
                            >
                                <Ionicons name="flash" size={24} color={COLORS.secondary} />
                                <Text style={styles.quickPlanName}>1 Month</Text>
                                <Text style={styles.quickPlanPrice}>₹2,350</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.quickPlanCard, styles.quickPlanCardPopular]}
                                onPress={() => router.push({ pathname: '/(employer)/subscription-plans', params: { tab: 'plans' } })}
                            >
                                <View style={styles.popularTag}>
                                    <Text style={styles.popularTagText}>BEST</Text>
                                </View>
                                <Ionicons name="star" size={24} color={COLORS.white} />
                                <Text style={[styles.quickPlanName, styles.quickPlanNameWhite]}>3 Months</Text>
                                <Text style={[styles.quickPlanPrice, styles.quickPlanPriceWhite]}>₹4,200</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.quickPlanCard}
                                onPress={() => router.push({ pathname: '/(employer)/subscription-plans', params: { tab: 'plans' } })}
                            >
                                <Ionicons name="diamond" size={24} color={COLORS.secondary} />
                                <Text style={styles.quickPlanName}>1 Year</Text>
                                <Text style={styles.quickPlanPrice}>₹7,500</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.viewAllPlansBtn}
                            onPress={() => router.push({ pathname: '/(employer)/subscription-plans', params: { tab: 'plans' } })}
                        >
                            <Text style={styles.viewAllPlansText}>View All Plans</Text>
                            <Ionicons name="arrow-forward" size={18} color={COLORS.secondary} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Subscription Info Banner - When has active subscription */}
                {subscriptionInfo?.canPostJob && subscriptionInfo?.subscription && (
                    <View style={styles.subscriptionBanner}>
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                        <Text style={styles.subscriptionText}>
                            {subscriptionInfo.subscription.remainingSlots} job slot(s) remaining • {subscriptionInfo.subscription.daysRemaining} days left
                        </Text>
                    </View>
                )}

                <Card>
                    <Input
                        label="Job Title"
                        placeholder="e.g., Need Electrician for Home Wiring"
                        value={formData.title}
                        onChangeText={(text) => setFormData({ ...formData, title: text })}
                        error={errors.title}
                    />

                    <Input
                        label="Job Description"
                        placeholder="Describe the job requirements..."
                        value={formData.description}
                        onChangeText={(text) => setFormData({ ...formData, description: text })}
                        error={errors.description}
                        multiline
                        numberOfLines={4}
                    />

                    {/* Worker Type Selection */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Worker Type Required</Text>
                        <TouchableOpacity
                            style={[styles.dropdown, errors.workerType && styles.dropdownError]}
                            onPress={() => setShowWorkerTypes(!showWorkerTypes)}
                        >
                            <Text style={formData.workerType.length > 0 ? styles.dropdownText : styles.dropdownPlaceholder}>
                                {formData.workerType.length > 0
                                    ? formData.workerType.join(', ').substring(0, 40) + '...'
                                    : 'Select worker type(s)'}
                            </Text>
                            <Ionicons name={showWorkerTypes ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                        {errors.workerType && <Text style={styles.errorText}>{errors.workerType}</Text>}

                        {showWorkerTypes && (
                            <View style={styles.typesList}>
                                {WORKER_TYPES.map((type, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[styles.typeItem, formData.workerType.includes(type) && styles.typeItemSelected]}
                                        onPress={() => toggleWorkerType(type)}
                                    >
                                        <Text style={[styles.typeText, formData.workerType.includes(type) && styles.typeTextSelected]}>
                                            {type}
                                        </Text>
                                        {formData.workerType.includes(type) && (
                                            <Ionicons name="checkmark" size={18} color={COLORS.white} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Skills Selection (Dropdown) */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Required Skills</Text>
                        <TouchableOpacity
                            style={styles.dropdown}
                            onPress={() => {
                                if (formData.workerType.length === 0) {
                                    Alert.alert('Select Worker Type', 'Please select a worker type first to see relevant skills.');
                                    return;
                                }
                                setShowSkillsDropdown(!showSkillsDropdown);
                            }}
                        >
                            <Text style={formData.skills.length > 0 ? styles.dropdownText : styles.dropdownPlaceholder}>
                                {formData.skills.length > 0
                                    ? formData.skills
                                    : 'Select required skills'}
                            </Text>
                            <Ionicons name={showSkillsDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>

                        {showSkillsDropdown && (
                            <View style={styles.typesList}>
                                {getSuggestedSkills().length > 0 ? (
                                    getSuggestedSkills().map((skill, index) => {
                                        const isSelected = formData.skills.split(', ').includes(skill);
                                        return (
                                            <TouchableOpacity
                                                key={index}
                                                style={[styles.typeItem, isSelected && styles.typeItemSelected]}
                                                onPress={() => toggleSkill(skill)}
                                            >
                                                <Text style={[styles.typeText, isSelected && styles.typeTextSelected]}>
                                                    {skill}
                                                </Text>
                                                {isSelected && (
                                                    <Ionicons name="checkmark" size={18} color={COLORS.white} />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })
                                ) : (
                                    <View style={styles.noSkillsContainer}>
                                        <Text style={styles.noSkillsText}>No specific skills found for selected worker types.</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    <Input
                        label="Daily Salary (₹)"
                        placeholder="e.g., 500"
                        value={formData.salary}
                        onChangeText={(text) => setFormData({ ...formData, salary: text.replace(/[^0-9]/g, '') })}
                        keyboardType="numeric"
                        error={errors.salary}
                    />

                    <LocationPicker
                        label="Location"
                        placeholder="e.g., Kolkata, West Bengal"
                        value={formData.location}
                        onChangeLocation={(text, coords) => {
                            setFormData({
                                ...formData,
                                location: text,
                                coordinates: coords || null
                            });
                            setErrors({ ...errors, location: '' });
                        }}
                        error={errors.location}
                    />

                    {/* Work Type */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Work Type</Text>
                        <View style={styles.workTypeContainer}>
                            {WORK_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[styles.workTypeOption, formData.workType === type && styles.workTypeSelected]}
                                    onPress={() => setFormData({ ...formData, workType: type })}
                                >
                                    <Text style={[styles.workTypeText, formData.workType === type && styles.workTypeTextSelected]}>
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {formData.workType === 'temporary' && (
                        <Input
                            label="Duration (Days)"
                            placeholder="e.g., 7"
                            value={formData.durationDays}
                            onChangeText={(text) => setFormData({ ...formData, durationDays: text.replace(/[^0-9]/g, '') })}
                            keyboardType="numeric"
                            error={errors.durationDays}
                        />
                    )}

                    <Input
                        label="Total Openings"
                        placeholder="e.g., 1"
                        value={formData.totalOpenings}
                        onChangeText={(text) => setFormData({ ...formData, totalOpenings: text.replace(/[^0-9]/g, '') })}
                        keyboardType="numeric"
                    />

                    {/* Experience Range */}
                    <View style={styles.rowContainer}>
                        <View style={styles.halfWidth}>
                            <Input
                                label="Min Experience (Yrs)"
                                placeholder="0"
                                value={formData.minExperience}
                                onChangeText={(text) => setFormData({ ...formData, minExperience: text.replace(/[^0-9]/g, '') })}
                                keyboardType="numeric"
                                error={errors.minExperience}
                            />
                        </View>
                        <View style={styles.halfWidth}>
                            <Input
                                label="Max Experience (Yrs)"
                                placeholder="5"
                                value={formData.maxExperience}
                                onChangeText={(text) => setFormData({ ...formData, maxExperience: text.replace(/[^0-9]/g, '') })}
                                keyboardType="numeric"
                                error={errors.maxExperience}
                            />
                        </View>
                    </View>

                    {/* Verification & Geo-tagging Options */}
                    <View style={styles.checkboxContainer}>
                        <TouchableOpacity
                            style={styles.checkboxRow}
                            onPress={() => setFormData({ ...formData, otpVerificationRequired: !formData.otpVerificationRequired })}
                        >
                            <View style={[styles.checkbox, formData.otpVerificationRequired && styles.checkboxChecked]}>
                                {formData.otpVerificationRequired && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                            </View>
                            <Text style={styles.checkboxLabel}>Require OTP Verification for Work Logs</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.checkboxRow}
                            onPress={() => setFormData({ ...formData, geoTaggingRequired: !formData.geoTaggingRequired })}
                        >
                            <View style={[styles.checkbox, formData.geoTaggingRequired && styles.checkboxChecked]}>
                                {formData.geoTaggingRequired && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                            </View>
                            <Text style={styles.checkboxLabel}>Require Geo-tagging for Work Logs</Text>
                        </TouchableOpacity>
                    </View>
                </Card>

                <Button
                    title="Post Job"
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
                secondaryButtonText="Go Back"
                onPrimaryPress={handleModalPrimaryPress}
                onSecondaryPress={handleModalClose}
                onClose={handleModalClose}
            />
        </KeyboardAvoidingView>
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
