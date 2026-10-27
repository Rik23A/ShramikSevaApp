import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Platform,
    KeyboardAvoidingView,
    ScrollView,
    Alert,
    TouchableOpacity,
    Animated,
    Modal,
    FlatList,
    TouchableWithoutFeedback,
    Image,
    ActivityIndicator,
    useWindowDimensions,
    TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import OtpInput from '../../components/OtpInput';
import LocationPicker from '../../components/LocationPicker';
import ProfileImagePicker from '../../components/profile/ProfileImagePicker';
import { uploadFile } from '../../services/uploadService';
import {
    COLORS,
    WORKER_TYPES,
    INDIAN_STATES,
    BUSINESS_TYPES,
    EMPLOYEE_COUNTS,
    WORKER_SKILLS,
    QUALIFICATIONS,
    KNOWN_LANGUAGES
} from '../../constants/config';
import { initiateRegistration, completeRegistration, checkMobile } from '../../services/authService';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen() {
    const { role } = useLocalSearchParams();
    const { t } = useLanguage();
    const { login } = useAuth();
    const { width, height } = useWindowDimensions();

    const isSmallScreen = width < 375;
    const isTablet = width >= 600;
    const contentHorizontalPadding = isSmallScreen ? 14 : isTablet ? 28 : 18;
    const cardPadding = isSmallScreen ? 14 : 18;

    const totalSteps = role === 'employer' ? 6 : 3;

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [otp, setOtp] = useState('');
    const [errors, setErrors] = useState({});

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        fadeAnim.setValue(0);
        slideAnim.setValue(30);

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();
    }, [step]);

    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        email: '',
        password: '',
        confirmPassword: '',
        profilePicture: '',
        role: role || 'worker',
        workerType: '', // Single select
        skills: [],     // Multi select
        experience: '',
        isFresher: false,
        gender: '',
        age: '',
        qualification: '',
        languages: [],
        expectedSalaryMin: '',
        expectedSalaryMax: '',
        expectedSalaryPeriod: 'monthly',
        locationName: '',
        coordinates: null,
        companyName: '',
        businessType: '',
        employeeCount: '',
        foundedYear: '',
        website: '',
        description: '',
        street: '',
        city: '',
        state: '',
        pincode: '',
        mapsLink: '',
        contactName: '',
        contactDesignation: '',
        contactPhone: '',
        contactEmail: '',
        gstNumber: '',
    });

    // Modal Dropdown State
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [dropdownSearch, setDropdownSearch] = useState('');
    const [dropdownConfig, setDropdownConfig] = useState({
        items: [],
        title: '',
        key: '',
        multiSelect: false
    });

    const handleAvatarSelected = async (imageAsset) => {
        if (!imageAsset || !imageAsset.uri) return;
        setUploadingAvatar(true);
        try {
            const uploadResult = await uploadFile(imageAsset);
            if (uploadResult && uploadResult.fileUrl) {
                setFormData((prev) => ({ ...prev, profilePicture: uploadResult.fileUrl }));
                Alert.alert(t('success') || 'Success', t('photo_uploaded') || 'Profile photo uploaded successfully!');
            } else {
                Alert.alert(t('error_title') || 'Error', t('failed_to_upload_photo') || 'Failed to upload photo.');
            }
        } catch (error) {
            console.error('Failed to upload profile photo:', error);
            Alert.alert(
                t('error_title') || 'Error',
                error?.response?.data?.message || t('failed_to_upload_photo') || 'Failed to upload photo. Please try again.'
            );
        } finally {
            setUploadingAvatar(false);
        }
    };

    const openDropdown = (key, title, items, multiSelect = false) => {
        setDropdownSearch('');
        setDropdownConfig({ key, title, items, multiSelect });
        setDropdownVisible(true);
    };

    const filteredDropdownItems = (dropdownConfig.items || []).filter(item =>
        !dropdownSearch.trim() || item.toLowerCase().includes(dropdownSearch.trim().toLowerCase())
    );

    const handleSelect = (item) => {
        const { key, multiSelect } = dropdownConfig;

        if (multiSelect) {
            const currentSelected = formData[key] || [];
            const newSelected = currentSelected.includes(item)
                ? currentSelected.filter(i => i !== item)
                : [...currentSelected, item];
            setFormData({ ...formData, [key]: newSelected });
        } else {
            // Single Select Logic
            if (key === 'workerType') {
                // Check if it's different to reset skills
                if (formData.workerType !== item) {
                    setFormData({ ...formData, [key]: item, skills: [] });
                } else {
                    setFormData({ ...formData, [key]: item });
                }
            } else {
                setFormData({ ...formData, [key]: item });
            }
            setDropdownVisible(false);
        }
    };

    const validateStep = (currentStep) => {
        const newErrors = {};

        if (currentStep === 1) {
            if (!formData.name.trim()) newErrors.name = t('name_required') || 'Name is required';
            if (!formData.mobile || !/^[6-9]\d{9}$/.test(formData.mobile)) {
                newErrors.mobile = t('valid_mobile_error');
            }
            if (role === 'employer' && !formData.email) {
                newErrors.email = t('email_required') || 'Email is required for employers';
            }
            if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
                newErrors.email = t('valid_email_error');
            }
            if (role === 'employer' && (!formData.password || formData.password.length < 6)) {
                newErrors.password = t('password_min_length') || 'Password must be at least 6 characters';
            } else if (role === 'worker' && formData.password && formData.password.length < 6) {
                newErrors.password = t('password_min_length') || 'Password must be at least 6 characters';
            }
            if (formData.password !== formData.confirmPassword) {
                newErrors.confirmPassword = t('passwords_not_match') || 'Passwords do not match';
            }
        } else if (currentStep === 2 && role === 'worker') {
            if (!formData.gender) newErrors.gender = t('gender_required') || 'Gender is required';
            const ageNum = parseInt(formData.age);
            if (!formData.age || isNaN(ageNum) || ageNum < 14 || ageNum > 100) {
                newErrors.age = t('age_required') || 'Age is required (14-100)';
            }
            if (!formData.qualification || !formData.qualification.trim()) {
                newErrors.qualification = t('qualification_required') || 'Education / Qualification is required';
            }
            if (!formData.languages || formData.languages.length === 0) {
                newErrors.languages = t('languages_required') || 'Select at least one language known';
            }
            if (!formData.workerType) {
                newErrors.workerType = t('worker_type_required') || 'Select work type';
            }
            if (!formData.isFresher && !formData.experience) {
                newErrors.experience = t('experience_required') || 'Experience is required';
            }
            if (!formData.locationName || !formData.locationName.trim()) {
                newErrors.locationName = t('city_state_required') || 'City/State is required';
            }
            if (!formData.expectedSalaryMin || isNaN(parseFloat(formData.expectedSalaryMin)) || parseFloat(formData.expectedSalaryMin) <= 0) {
                newErrors.expectedSalary = t('expected_salary_required') || 'Minimum expected salary is required';
            } else if (formData.expectedSalaryMin && formData.expectedSalaryMax) {
                const min = parseFloat(formData.expectedSalaryMin);
                const max = parseFloat(formData.expectedSalaryMax);
                if (max < min) {
                    newErrors.expectedSalary = t('max_salary_error') || 'Maximum salary must be greater than or equal to minimum salary';
                }
            }
        } else if (currentStep === 2 && role === 'employer') {
            if (!formData.companyName.trim()) newErrors.companyName = t('company_name_required') || 'Company Name is required';
            if (!formData.businessType) newErrors.businessType = t('business_type_required') || 'Select business type';
            if (!formData.employeeCount) newErrors.employeeCount = t('employee_count_required') || 'Select employee count';
        } else if (currentStep === 3 && role === 'employer') {
            if (!formData.city.trim()) newErrors.city = t('city_required') || 'City is required';
            if (!formData.state) newErrors.state = t('state_required') || 'Select state';
            if (!formData.pincode || !/^\d{6}$/.test(formData.pincode)) {
                newErrors.pincode = t('valid_pincode_error') || 'Enter valid 6-digit pincode';
            }
        } else if (currentStep === 4 && role === 'employer') {
            if (!formData.contactName.trim()) newErrors.contactName = t('contact_name_required') || 'Contact person name is required';
            if (!formData.contactPhone || !/^[6-9]\d{9}$/.test(formData.contactPhone)) {
                newErrors.contactPhone = t('valid_mobile_error');
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNextWithStructure = async () => {
        if (validateStep(step)) {
            if (step === 1) {
                setLoading(true);
                try {
                    const res = await checkMobile(formData.mobile);
                    if (res.exists) {
                        Alert.alert(t('error_title') || 'Error', res.message);
                        setLoading(false);
                        return;
                    }
                } catch (error) {
                    console.error('Error checking mobile:', error);
                } finally {
                    setLoading(false);
                }
            }

            if (step < totalSteps - 1) {
                setStep(step + 1);
            } else {
                setLoading(true);
                try {
                    const submissionData = { ...formData };
                    if (!submissionData.profilePicture) {
                        delete submissionData.profilePicture;
                    }

                    // Format for backend
                    if (role === 'worker') {
                        // Ensure workerType is array if backend expects it
                        if (typeof submissionData.workerType === 'string') {
                            submissionData.workerType = [submissionData.workerType];
                        }
                        if (formData.coordinates) {
                            submissionData.location = {
                                type: 'Point',
                                coordinates: [formData.coordinates.longitude, formData.coordinates.latitude]
                            };
                        }

                        let workerCity = formData.city || '';
                        let workerState = formData.state || '';
                        if (!workerCity && formData.locationName) {
                            const parts = formData.locationName.split(',').map(p => p.trim()).filter(Boolean);
                            if (parts.length >= 1) workerCity = parts[0];
                            if (parts.length >= 2 && !workerState) workerState = parts[1];
                        }

                        submissionData.locationName = formData.locationName;
                        submissionData.city = workerCity;
                        submissionData.state = workerState;

                        if (formData.qualification) submissionData.qualification = formData.qualification;
                        if (formData.age) submissionData.age = parseInt(formData.age);
                        if (formData.languages && formData.languages.length > 0) submissionData.languages = formData.languages;

                        if (formData.expectedSalaryMin || formData.expectedSalaryMax) {
                            submissionData.expectedSalary = {
                                min: parseFloat(formData.expectedSalaryMin) || 0,
                                max: parseFloat(formData.expectedSalaryMax) || 0,
                                currency: 'INR',
                                period: formData.expectedSalaryPeriod || 'monthly'
                            };
                        }
                    }

                    if (role === 'employer') {
                        submissionData.locationName = `${formData.city}, ${formData.state}`;
                        submissionData.companyDetails = {
                            description: formData.description,
                            website: formData.website,
                            foundedYear: formData.foundedYear,
                            employeeCount: formData.employeeCount,
                            address: {
                                street: formData.street,
                                city: formData.city,
                                state: formData.state,
                                pincode: formData.pincode,
                                mapsLink: formData.mapsLink
                            },
                            contactPerson: {
                                name: formData.contactName,
                                designation: formData.contactDesignation,
                                phone: formData.contactPhone,
                                email: formData.contactEmail
                            },
                            isProfileComplete: true
                        };
                    }
                    await initiateRegistration(submissionData);
                    setStep(totalSteps);
                } catch (error) {
                    Alert.alert(t('registration_failed'), error.response?.data?.message || t('something_went_wrong'));
                } finally {
                    setLoading(false);
                }
            }
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length !== 6) {
            Alert.alert(t('error_title'), t('valid_otp_error') || 'Please enter valid 6-digit OTP');
            return;
        }
        setLoading(true);
        try {
            const userData = await completeRegistration(formData.mobile, otp);

            // Auto-login
            await login(userData);

            Alert.alert(t('success'), t('registration_success'), [
                {
                    text: 'OK',
                    onPress: () => {
                        if (userData.role === 'worker') {
                            router.replace('/(worker)/dashboard');
                        } else {
                            router.replace('/(employer)/dashboard');
                        }
                    }
                }
            ]);
        } catch (error) {
            Alert.alert(t('verification_failed') || 'Verification Failed', error.response?.data?.message || t('valid_otp_error') || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const renderDropdownTrigger = (label, value, items, key, error, multiSelect = false) => {
        const isArrayVal = Array.isArray(value);
        const hasSelection = isArrayVal ? value.length > 0 : !!value;
        const displayText = isArrayVal
            ? (value.length > 0 ? `${value.length} ${t('selected') || 'selected'}: ${value.slice(0, 2).join(', ')}${value.length > 2 ? '...' : ''}` : `Select ${label.replace('*', '').trim()}`)
            : (value || `Select ${label.replace('*', '').trim()}`);

        return (
            <View style={styles.dropdownContainer}>
                <Text style={styles.label}>{label}</Text>
                <TouchableOpacity
                    style={[
                        styles.dropdownButton,
                        hasSelection && styles.dropdownButtonSelected,
                        error && styles.inputError
                    ]}
                    onPress={() => openDropdown(key, label.replace('*', '').trim(), items, multiSelect)}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.dropdownText, !hasSelection && styles.placeholderText]} numberOfLines={1}>
                        {displayText}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={hasSelection ? COLORS.primary : COLORS.textSecondary} />
                </TouchableOpacity>
                {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
        );
    };

    const renderStep1 = () => (
        <View style={[styles.formSection, { padding: cardPadding }]}>
            <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionIconBadge}>
                    <Ionicons name="person" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>{t('basic_details') || 'Basic Details'}</Text>
                    <Text style={styles.sectionCaption}>
                        {role === 'worker' ? (t('worker_basic_desc') || 'Personal and login details for job opportunities') : (t('employer_basic_desc') || 'Company administrator details')}
                    </Text>
                </View>
            </View>

            {/* Profile Picture Upload */}
            <View style={styles.avatarSection}>
                <ProfileImagePicker
                    imageUri={formData.profilePicture}
                    onImageSelected={handleAvatarSelected}
                    size={isSmallScreen ? 86 : 96}
                    editable={!uploadingAvatar}
                />
                {uploadingAvatar ? (
                    <View style={styles.avatarUploadingRow}>
                        <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.avatarUploadingText}>
                            {t('uploading') || 'Uploading photo...'}
                        </Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {/* ProfileImagePicker triggers on tap */}}
                        style={{ marginTop: 8 }}
                    >
                        <Text style={styles.avatarActionText}>
                            {formData.profilePicture ? (t('change_photo') || 'Change Profile Photo') : (t('add_profile_photo') || 'Add Profile Photo')}
                        </Text>
                    </TouchableOpacity>
                )}
                {formData.profilePicture && !uploadingAvatar ? (
                    <TouchableOpacity
                        onPress={() => setFormData((prev) => ({ ...prev, profilePicture: '' }))}
                        style={styles.avatarRemoveBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                    >
                        <Ionicons name="trash-outline" size={13} color={COLORS.error || '#EF4444'} style={{ marginRight: 4 }} />
                        <Text style={styles.avatarRemoveText}>
                            {t('remove_photo') || 'Remove Photo'}
                        </Text>
                    </TouchableOpacity>
                ) : null}
            </View>

            <Input label={`${t('full_name')} *`} placeholder={t('enter_full_name')} value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} error={errors.name} icon="person-outline" autoCapitalize="words" />
            <Input label={`${t('mobile')} *`} placeholder={t('mobile_placeholder')} value={formData.mobile} onChangeText={(text) => setFormData({ ...formData, mobile: text.replace(/[^0-9]/g, '').slice(0, 10) })} keyboardType="phone-pad" error={errors.mobile} maxLength={10} icon="call-outline" />
            <Input label={role === 'employer' ? `${t('email')} *` : `${t('email')} (${t('optional') || 'Optional'})`} placeholder={t('enter_email_address')} value={formData.email} onChangeText={(text) => setFormData({ ...formData, email: text })} keyboardType="email-address" error={errors.email} autoCapitalize="none" icon="mail-outline" />
            <Input label={role === 'employer' ? `${t('enter_password')} *` : `${t('enter_password')} (${t('optional') || 'Optional'})`} placeholder={t('create_password') || 'Create password'} value={formData.password} onChangeText={(text) => setFormData({ ...formData, password: text })} isPassword error={errors.password} icon="lock-closed-outline" />
            <Input label={role === 'employer' ? `${t('confirm_password') || 'Confirm Password'} *` : `${t('confirm_password') || 'Confirm Password'} (${t('optional') || 'Optional'})`} placeholder={t('confirm_password') || 'Confirm password'} value={formData.confirmPassword} onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })} isPassword error={errors.confirmPassword} icon="lock-closed-outline" />
        </View>
    );

    const renderWorkerProfessional = () => {
        const skillList = formData.workerType ? (WORKER_SKILLS[formData.workerType] || []) : [];

        return (
            <View style={[styles.formSection, { padding: cardPadding }]}>
                <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionIconBadge}>
                        <Ionicons name="briefcase" size={18} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.sectionTitle}>{t('professional_details') || 'Professional Details'}</Text>
                        <Text style={styles.sectionCaption}>
                            {t('worker_prof_desc') || 'Your job match will be based on your work type and location'}
                        </Text>
                    </View>
                </View>

                {/* Gender Selector - Responsive Pill Group */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{`${t('gender')} *`}</Text>
                    <View style={styles.genderRow}>
                        {[
                            { key: 'Male', label: t('gender_male') || 'Male', icon: 'man' },
                            { key: 'Female', label: t('gender_female') || 'Female', icon: 'woman' },
                            { key: 'Other', label: t('gender_other') || 'Other', icon: 'person' },
                        ].map((g) => {
                            const isSelected = formData.gender === g.key;
                            return (
                                <TouchableOpacity
                                    key={g.key}
                                    style={[
                                        styles.genderPill,
                                        isSelected && styles.genderPillActive,
                                        errors.gender && !formData.gender && styles.inputError,
                                        {
                                            paddingVertical: isSmallScreen ? 8 : 10,
                                            paddingHorizontal: isSmallScreen ? 4 : 8
                                        }
                                    ]}
                                    onPress={() => {
                                        setFormData((prev) => ({ ...prev, gender: g.key }));
                                        if (errors.gender) setErrors((prev) => ({ ...prev, gender: '' }));
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={isSelected ? g.icon : `${g.icon}-outline`}
                                        size={isSmallScreen ? 15 : 17}
                                        color={isSelected ? COLORS.white : COLORS.textSecondary}
                                        style={{ marginRight: isSmallScreen ? 3 : 5 }}
                                    />
                                    <Text
                                        style={[
                                            styles.genderPillText,
                                            isSelected && styles.genderPillTextActive,
                                            { fontSize: isSmallScreen ? 12 : 13 }
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {g.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
                </View>

                {/* Age Input */}
                <Input
                    label={`${t('age') || 'Age (Years)'} *`}
                    placeholder="e.g. 24"
                    value={formData.age}
                    onChangeText={(text) => {
                        setFormData({ ...formData, age: text.replace(/[^0-9]/g, '') });
                        if (errors.age) setErrors((prev) => ({ ...prev, age: '' }));
                    }}
                    keyboardType="numeric"
                    maxLength={2}
                    icon="person-outline"
                    error={errors.age}
                />

                {/* Qualification / Education - Single Select */}
                {renderDropdownTrigger(
                    `${t('education_qualification') || t('qualification') || 'Education / Qualification'} *`,
                    formData.qualification,
                    QUALIFICATIONS,
                    'qualification',
                    errors.qualification,
                    false
                )}

                {/* Languages Known - Multi Select */}
                <View style={styles.inputGroup}>
                    {renderDropdownTrigger(
                        `${t('languages_known') || 'Languages Known'} * ${formData.languages?.length > 0 ? `(${formData.languages.length} ${t('selected') || 'selected'})` : ''}`,
                        formData.languages,
                        KNOWN_LANGUAGES,
                        'languages',
                        errors.languages,
                        true
                    )}

                    {/* Selected Languages Chips */}
                    {formData.languages && formData.languages.length > 0 && (
                        <View style={styles.selectedSkillsWrapper}>
                            {formData.languages.map((lang, idx) => (
                                <View key={idx} style={[styles.skillTag, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                                    <Text style={[styles.skillTagText, { color: COLORS.primary }]} numberOfLines={1}>{lang}</Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setFormData(prev => ({
                                                ...prev,
                                                languages: (prev.languages || []).filter(l => l !== lang)
                                            }));
                                        }}
                                        style={styles.skillTagRemove}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons name="close-circle" size={16} color={COLORS.primary} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Worker Type - Single Select */}
                {renderDropdownTrigger(`${t('worker_type')} *`, formData.workerType, WORKER_TYPES, 'workerType', errors.workerType, false)}

                {/* Skills - Multi Select - Only show if Worker Type is selected */}
                {formData.workerType ? (
                    <View style={styles.inputGroup}>
                        {renderDropdownTrigger(
                            `${t('skills')} (${formData.skills.length} ${t('selected') || 'selected'})`,
                            formData.skills,
                            skillList,
                            'skills',
                            errors.skills,
                            true
                        )}

                        {/* Selected Skills Chips */}
                        {formData.skills.length > 0 && (
                            <View style={styles.selectedSkillsWrapper}>
                                {formData.skills.map((skill, idx) => (
                                    <View key={idx} style={styles.skillTag}>
                                        <Text style={styles.skillTagText} numberOfLines={1}>{skill}</Text>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    skills: prev.skills.filter(s => s !== skill)
                                                }));
                                            }}
                                            style={styles.skillTagRemove}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Ionicons name="close-circle" size={16} color={COLORS.primary} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Quick Add Suggestions if few skills selected */}
                        {formData.skills.length < 5 && skillList.length > 0 && (
                            <View style={{ marginTop: 4, marginBottom: 10 }}>
                                <Text style={styles.suggestionLabel}>{t('popular_skills') || 'Quick add skills:'}</Text>
                                <View style={styles.presetsRow}>
                                    {skillList.slice(0, 4).map((s, idx) => {
                                        const isSel = formData.skills.includes(s);
                                        return (
                                            <TouchableOpacity
                                                key={idx}
                                                style={[styles.presetChip, isSel && styles.presetChipActive]}
                                                onPress={() => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        skills: isSel ? prev.skills.filter(x => x !== s) : [...prev.skills, s]
                                                    }));
                                                }}
                                            >
                                                <Ionicons name={isSel ? "checkmark" : "add"} size={12} color={isSel ? COLORS.primary : COLORS.textSecondary} style={{ marginRight: 3 }} />
                                                <Text style={[styles.presetChipText, isSel && styles.presetChipTextActive]}>{s}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}
                    </View>
                ) : null}

                {/* Fresher & Experience */}
                <View style={styles.checkboxContainer}>
                    <TouchableOpacity
                        style={[styles.checkbox, formData.isFresher && styles.checkboxChecked]}
                        onPress={() => setFormData({ ...formData, isFresher: !formData.isFresher, experience: '' })}
                        activeOpacity={0.7}
                    >
                        {formData.isFresher && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => setFormData({ ...formData, isFresher: !formData.isFresher, experience: '' })}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.checkboxLabel}>{t('fresher_label') || 'I am a Fresher (No Experience)'}</Text>
                    </TouchableOpacity>
                </View>

                {!formData.isFresher && (
                    <Input
                        label={t('exp_years_label') || 'Experience (Years) *'}
                        placeholder="e.g. 2.5"
                        value={formData.experience}
                        onChangeText={(text) => setFormData({ ...formData, experience: text.replace(/[^0-9.]/g, '') })}
                        keyboardType="numeric"
                        error={errors.experience}
                        icon="time-outline"
                    />
                )}

                {/* Location Picker */}
                <View style={styles.locationSection}>
                    <LocationPicker
                        label={`${t('city_state') || 'City/State'} *`}
                        placeholder={t('current_location_placeholder') || 'e.g., Kolkata, West Bengal'}
                        value={formData.locationName}
                        onChangeLocation={(text, coords, place) => {
                            const parts = text ? text.split(',').map(p => p.trim()).filter(Boolean) : [];
                            const detectedCity = place?.city || (parts.length > 0 ? parts[0] : '');
                            const detectedState = place?.state || (parts.length > 1 ? parts[1] : '');

                            setFormData((prev) => ({
                                ...prev,
                                locationName: text,
                                city: detectedCity || prev.city || '',
                                state: detectedState || prev.state || '',
                                coordinates: coords || prev.coordinates || null,
                            }));
                            if (errors.locationName) {
                                setErrors((prev) => ({ ...prev, locationName: '' }));
                            }
                        }}
                        error={errors.locationName}
                    />

                    {/* Detected City / State pill */}
                    {(formData.city || formData.state) ? (
                        <View style={styles.detectedLocationBadge}>
                            <Ionicons name="navigate-circle" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                            <Text style={styles.detectedLocationText}>
                                {t('matched_city') || 'Target City'}: <Text style={{ fontWeight: '700', color: COLORS.text }}>{formData.city || 'Any'}</Text>
                                {formData.state ? `, ${formData.state}` : ''}
                            </Text>
                        </View>
                    ) : null}
                </View>

                {/* Expected Salary Range */}
                <View style={styles.salarySection}>
                    <View style={[styles.salaryHeader, isSmallScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 6 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="cash-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                            <Text style={[styles.label, { marginBottom: 0 }]}>{`${t('expected_salary_range') || 'Expected Salary Range (₹)'} *`}</Text>
                        </View>
                        {/* Period Toggle */}
                        <View style={styles.periodToggleContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.periodBtn,
                                    formData.expectedSalaryPeriod === 'monthly' && styles.periodBtnActive
                                ]}
                                onPress={() => setFormData({ ...formData, expectedSalaryPeriod: 'monthly' })}
                            >
                                <Text style={[
                                    styles.periodBtnText,
                                    formData.expectedSalaryPeriod === 'monthly' && styles.periodBtnTextActive
                                ]}>
                                    {t('monthly') || 'Monthly'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.periodBtn,
                                    formData.expectedSalaryPeriod === 'daily' && styles.periodBtnActive
                                ]}
                                onPress={() => setFormData({ ...formData, expectedSalaryPeriod: 'daily' })}
                            >
                                <Text style={[
                                    styles.periodBtnText,
                                    formData.expectedSalaryPeriod === 'daily' && styles.periodBtnTextActive
                                ]}>
                                    {t('daily') || 'Daily'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Min & Max Inputs */}
                    <View style={styles.salaryInputRow}>
                        <View style={{ flex: 1, marginRight: isSmallScreen ? 4 : 8 }}>
                            <Input
                                label={t('min_salary') || 'Min (₹)'}
                                placeholder={formData.expectedSalaryPeriod === 'monthly' ? 'e.g. 15000' : 'e.g. 500'}
                                value={formData.expectedSalaryMin}
                                onChangeText={(text) => setFormData({ ...formData, expectedSalaryMin: text.replace(/[^0-9]/g, '') })}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: isSmallScreen ? 4 : 8 }}>
                            <Input
                                label={t('max_salary') || 'Max (₹)'}
                                placeholder={formData.expectedSalaryPeriod === 'monthly' ? 'e.g. 25000' : 'e.g. 900'}
                                value={formData.expectedSalaryMax}
                                onChangeText={(text) => setFormData({ ...formData, expectedSalaryMax: text.replace(/[^0-9]/g, '') })}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                    {errors.expectedSalary && <Text style={styles.errorText}>{errors.expectedSalary}</Text>}

                    {/* Quick Presets */}
                    <View style={styles.presetsRow}>
                        {(formData.expectedSalaryPeriod === 'monthly' ? [
                            { label: '₹10k - ₹15k', min: '10000', max: '15000' },
                            { label: '₹15k - ₹25k', min: '15000', max: '25000' },
                            { label: '₹25k - ₹40k', min: '25000', max: '40000' },
                            { label: '₹40k+', min: '40000', max: '60000' },
                        ] : [
                            { label: '₹400 - ₹600', min: '400', max: '600' },
                            { label: '₹600 - ₹900', min: '600', max: '900' },
                            { label: '₹900 - ₹1500', min: '900', max: '1500' },
                            { label: '₹1500+', min: '1500', max: '2500' },
                        ]).map((preset, idx) => {
                            const isSelected = formData.expectedSalaryMin === preset.min && formData.expectedSalaryMax === preset.max;
                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={[
                                        styles.presetChip,
                                        isSelected && styles.presetChipActive,
                                        {
                                            paddingVertical: isSmallScreen ? 4 : 5,
                                            paddingHorizontal: isSmallScreen ? 8 : 10,
                                        }
                                    ]}
                                    onPress={() => setFormData({
                                        ...formData,
                                        expectedSalaryMin: preset.min,
                                        expectedSalaryMax: preset.max
                                    })}
                                >
                                    <Text style={[
                                        styles.presetChipText,
                                        isSelected && styles.presetChipTextActive,
                                        { fontSize: isSmallScreen ? 11 : 12 }
                                    ]}>
                                        {preset.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>
        );
    };

    const renderCompanyInfo = () => (
        <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>{t('company_info')}</Text>
            <Input label={`${t('company_name')} *`} placeholder={t('enter_company_name')} value={formData.companyName} onChangeText={(text) => setFormData({ ...formData, companyName: text })} error={errors.companyName} icon="business-outline" />
            {renderDropdownTrigger(`${t('business_type')} *`, formData.businessType, BUSINESS_TYPES, 'businessType', errors.businessType)}
            {renderDropdownTrigger(`${t('employee_count')} *`, formData.employeeCount, EMPLOYEE_COUNTS, 'employeeCount', errors.employeeCount)}
            <Input label={`${t('founded_year')} (${t('optional') || 'Optional'})`} placeholder={t('founded_year_placeholder')} value={formData.foundedYear} onChangeText={(text) => setFormData({ ...formData, foundedYear: text.replace(/[^0-9]/g, '').slice(0, 4) })} keyboardType="numeric" maxLength={4} />
            <Input label={`${t('website')} (${t('optional') || 'Optional'})`} placeholder="https://yourcompany.com" value={formData.website} onChangeText={(text) => setFormData({ ...formData, website: text })} autoCapitalize="none" keyboardType="url" />
            <Input label={`${t('description')} (${t('optional') || 'Optional'})`} placeholder={t('company_description_placeholder')} value={formData.description} onChangeText={(text) => setFormData({ ...formData, description: text })} multiline numberOfLines={3} style={{ height: 80, textAlignVertical: 'top' }} />
        </View>
    );

    const renderCompanyAddress = () => (
        <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>{t('company_address')}</Text>
            <Input label={`${t('street')} (${t('optional') || 'Optional'})`} placeholder={t('street_placeholder')} value={formData.street} onChangeText={(text) => setFormData({ ...formData, street: text })} />
            <Input label={`${t('city') || 'City'} *`} placeholder={t('enter_city') || 'Enter city'} value={formData.city} onChangeText={(text) => setFormData({ ...formData, city: text })} error={errors.city} />
            {renderDropdownTrigger(`${t('state')} *`, formData.state, INDIAN_STATES, 'state', errors.state)}
            <Input label={`${t('pincode')} *`} placeholder={t('pincode_placeholder') || 'Enter 6-digit pincode'} value={formData.pincode} onChangeText={(text) => setFormData({ ...formData, pincode: text.replace(/[^0-9]/g, '').slice(0, 6) })} keyboardType="numeric" error={errors.pincode} maxLength={6} />
            <Input label={`${t('maps_link') || 'Google Maps Link'} (${t('optional') || 'Optional'})`} placeholder={t('maps_link_placeholder') || 'Paste Google Maps link'} value={formData.mapsLink} onChangeText={(text) => setFormData({ ...formData, mapsLink: text })} autoCapitalize="none" />
        </View>
    );

    const renderContactPerson = () => (
        <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>{t('contact_person')}</Text>
            <Input label={`${t('contact_name')} *`} placeholder={t('contact_person_name_placeholder')} value={formData.contactName} onChangeText={(text) => setFormData({ ...formData, contactName: text })} error={errors.contactName} autoCapitalize="words" icon="person-outline" />
            <Input label={`${t('designation')} (${t('optional') || 'Optional'})`} placeholder="e.g., HR Manager" value={formData.contactDesignation} onChangeText={(text) => setFormData({ ...formData, contactDesignation: text })} />
            <Input label={`${t('contact_phone')} *`} placeholder={t('contact_number_placeholder')} value={formData.contactPhone} onChangeText={(text) => setFormData({ ...formData, contactPhone: text.replace(/[^0-9]/g, '').slice(0, 10) })} keyboardType="phone-pad" error={errors.contactPhone} maxLength={10} icon="call-outline" />
            <Input label={`${t('contact_email')} (${t('optional') || 'Optional'})`} placeholder={t('contact_email_placeholder')} value={formData.contactEmail} onChangeText={(text) => setFormData({ ...formData, contactEmail: text })} keyboardType="email-address" autoCapitalize="none" icon="mail-outline" />
        </View>
    );

    const renderDocuments = () => (
        <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>{t('kyc_verification')}</Text>
            <View style={styles.kycInfoBox}>
                <Ionicons name="shield-checkmark-outline" size={40} color={COLORS.primary} />
                <Text style={styles.kycTitle}>{t('build_trust_title')}</Text>
                <Text style={styles.kycSubtitle}>{t('build_trust_desc')}</Text>
            </View>
            <Input label={`${t('gst_number')} (${t('optional') || 'Optional'})`} placeholder="Enter 15-digit GST number" value={formData.gstNumber} onChangeText={(text) => setFormData({ ...formData, gstNumber: text.toUpperCase().slice(0, 15) })} autoCapitalize="characters" maxLength={15} />
            <Text style={styles.noteText}>{t('kyc_note')}</Text>
        </View>
    );

    const renderOtpStep = () => (
        <View style={[styles.formSection, styles.otpSection, { padding: cardPadding }]}>
            <View style={styles.otpIconContainer}>
                <Ionicons name="shield-checkmark" size={isSmallScreen ? 48 : 56} color={COLORS.primary} />
            </View>
            <Text style={styles.otpTitle}>{t('verify_otp') || 'Verify Mobile Number'}</Text>
            <Text style={styles.otpSubtitle}>
                {t('enter_otp_sent_to') || 'Enter the 6-digit code sent to'}{'\n'}
                <Text style={{ fontWeight: '700', color: COLORS.text }}>+91 {formData.mobile}</Text>
            </Text>

            <TouchableOpacity
                onPress={() => setStep(1)}
                style={styles.changeMobileBtn}
                hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
            >
                <Ionicons name="pencil" size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
                <Text style={styles.changeMobileText}>{t('change_number') || 'Change mobile number'}</Text>
            </TouchableOpacity>

            <View style={styles.otpContainer}>
                <OtpInput value={otp} onChange={setOtp} length={6} />
            </View>
            <Button title={t('verify_register') || 'Verify & Complete Registration'} onPress={handleVerifyOtp} />
        </View>
    );

    const renderCurrentStep = () => {
        if (role === 'worker') {
            switch (step) {
                case 1: return renderStep1();
                case 2: return renderWorkerProfessional();
                case 3: return renderOtpStep();
                default: return null;
            }
        } else {
            switch (step) {
                case 1: return renderStep1();
                case 2: return renderCompanyInfo();
                case 3: return renderCompanyAddress();
                case 4: return renderContactPerson();
                case 5: return renderDocuments();
                case 6: return renderOtpStep();
                default: return null;
            }
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: COLORS.primary }]} edges={['top', 'left', 'right']}>
            <StatusBar style="light" backgroundColor={COLORS.primary} />
            <View style={{ flex: 1, backgroundColor: COLORS.background }}>
                {loading && <LoadingSpinner fullScreen={true} message={t('processing')} />}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.keyboardView}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
                >
                    <View style={[styles.header, { paddingHorizontal: contentHorizontalPadding }]}>
                        <TouchableOpacity
                            onPress={() => step > 1 ? setStep(step - 1) : router.back()}
                            style={styles.backButton}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
                        </TouchableOpacity>
                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle} numberOfLines={1}>
                                {step === totalSteps
                                    ? (t('verification') || 'Verification')
                                    : (role === 'worker' ? (t('create_worker_account') || 'Job Seeker Registration') : (t('create_employer_account') || 'Employer Registration'))}
                            </Text>
                            <Text style={styles.headerSubtitle} numberOfLines={1}>
                                {role === 'worker'
                                    ? (step === 1 ? (t('step1_subtitle') || 'Step 1 of 3 • Basic Details') : step === 2 ? (t('step2_subtitle') || 'Step 2 of 3 • Skills & Location') : (t('step3_subtitle') || 'Step 3 of 3 • Verify OTP'))
                                    : `Step ${step} of ${totalSteps}`}
                            </Text>
                        </View>
                        <View style={styles.stepBadge}>
                            <Text style={styles.stepBadgeText}>{step}/{totalSteps}</Text>
                        </View>
                    </View>

                    {step < totalSteps && (
                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBar, { width: `${(step / totalSteps) * 100}%` }]} />
                        </View>
                    )}

                    <ScrollView
                        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: contentHorizontalPadding, paddingBottom: 60 }]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }, { width: '100%', maxWidth: 540, alignSelf: 'center' }]}>
                            {renderCurrentStep()}
                            {step < totalSteps && (
                                <View style={styles.footer}>
                                    <Button title={t('next') || 'Continue'} onPress={handleNextWithStructure} />
                                    <TouchableOpacity style={styles.loginLink} onPress={() => router.push('/auth/login')}>
                                        <Text style={styles.loginText}>
                                            {t('already_have_account') || 'Already have an account?'}{' '}
                                            <Text style={styles.loginTextBold}>{t('login') || 'Login'}</Text>
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Animated.View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>

            {/* Selection Modal with Search */}
            <Modal
                visible={dropdownVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setDropdownVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setDropdownVisible(false)}
                >
                    <TouchableWithoutFeedback>
                        <View style={[styles.modalContent, { maxHeight: height * 0.75 }]}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle} numberOfLines={1}>
                                    {t('select_placeholder') ? t('select_placeholder').replace('{title}', dropdownConfig.title) : `Select ${dropdownConfig.title}`}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setDropdownVisible(false)}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Ionicons name="close" size={24} color={COLORS.text} />
                                </TouchableOpacity>
                            </View>

                            {/* Search bar inside modal for fast filtering */}
                            {(dropdownConfig.items && dropdownConfig.items.length > 4) && (
                                <View style={styles.modalSearchContainer}>
                                    <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
                                    <TextInput
                                        style={styles.modalSearchInput}
                                        placeholder={t('search_dot') || 'Search...'}
                                        placeholderTextColor={COLORS.textLight}
                                        value={dropdownSearch}
                                        onChangeText={setDropdownSearch}
                                        autoCapitalize="none"
                                        clearButtonMode="while-editing"
                                    />
                                    {dropdownSearch.length > 0 && (
                                        <TouchableOpacity onPress={() => setDropdownSearch('')}>
                                            <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}

                            {filteredDropdownItems.length > 0 ? (
                                <FlatList
                                    data={filteredDropdownItems}
                                    keyExtractor={(item, index) => index.toString()}
                                    keyboardShouldPersistTaps="handled"
                                    renderItem={({ item }) => {
                                        const isSelected = dropdownConfig.multiSelect
                                            ? formData[dropdownConfig.key]?.includes(item)
                                            : formData[dropdownConfig.key] === item;
                                        return (
                                            <TouchableOpacity
                                                style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                                                onPress={() => handleSelect(item)}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>{item}</Text>
                                                {isSelected && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="search-outline" size={36} color={COLORS.textLight} style={{ marginBottom: 8 }} />
                                    <Text style={styles.emptyText}>{t('no_options_found') || 'No matching options found'}</Text>
                                </View>
                            )}

                            {dropdownConfig.multiSelect && (
                                <View style={styles.modalFooter}>
                                    <Button
                                        title={`${t('confirm_selection') ? t('confirm_selection').replace('{count}', formData[dropdownConfig.key]?.length || 0) : `Done (${formData[dropdownConfig.key]?.length || 0} selected)`}`}
                                        onPress={() => setDropdownVisible(false)}
                                    />
                                </View>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    keyboardView: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 14,
        paddingBottom: 12,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    backButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border || '#E2E8F0',
    },
    headerTitleContainer: {
        flex: 1,
        marginHorizontal: 12,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    headerSubtitle: {
        fontSize: 12,
        color: COLORS.textSecondary || '#64748B',
        marginTop: 2,
    },
    stepBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: (COLORS.primaryLight || '#1976D2') + '20',
        borderWidth: 1,
        borderColor: (COLORS.primary || '#1976D2') + '40',
    },
    stepBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary || '#1976D2',
    },
    progressContainer: {
        height: 3,
        backgroundColor: '#E2E8F0',
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.primary || '#1976D2',
    },
    scrollContent: {
        paddingTop: 12,
    },
    formSection: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    sectionIconBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: (COLORS.primaryLight || '#1976D2') + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    sectionCaption: {
        fontSize: 12,
        color: COLORS.textSecondary || '#64748B',
        marginTop: 2,
    },
    inputGroup: {
        marginBottom: 14,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 18,
    },
    avatarUploadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    avatarUploadingText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    avatarActionText: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '600',
    },
    avatarRemoveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        paddingVertical: 3,
        paddingHorizontal: 8,
    },
    avatarRemoveText: {
        fontSize: 12,
        color: COLORS.error || '#EF4444',
        fontWeight: '500',
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 6,
    },
    genderRow: {
        flexDirection: 'row',
        gap: 8,
    },
    genderPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border || '#CBD5E1',
        backgroundColor: '#FFFFFF',
    },
    genderPillActive: {
        backgroundColor: COLORS.primary || '#1976D2',
        borderColor: COLORS.primary || '#1976D2',
    },
    genderPillText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSecondary || '#475569',
    },
    genderPillTextActive: {
        color: '#FFFFFF',
    },
    dropdownContainer: {
        marginBottom: 14,
    },
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: COLORS.border || '#CBD5E1',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    dropdownButtonSelected: {
        borderColor: (COLORS.primary || '#1976D2') + '60',
        backgroundColor: '#F8FAFC',
    },
    dropdownText: {
        fontSize: 14,
        color: COLORS.text,
        flex: 1,
        marginRight: 6,
    },
    placeholderText: {
        color: COLORS.textLight || '#94A3B8',
    },
    inputError: {
        borderColor: COLORS.danger || '#EF4444',
    },
    errorText: {
        color: COLORS.danger || '#EF4444',
        fontSize: 11,
        marginTop: 4,
        marginLeft: 2,
    },
    selectedSkillsWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 8,
    },
    skillTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: (COLORS.primaryLight || '#1976D2') + '20',
        borderWidth: 1,
        borderColor: (COLORS.primary || '#1976D2') + '40',
        borderRadius: 14,
        paddingVertical: 4,
        paddingLeft: 10,
        paddingRight: 6,
    },
    skillTagText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary || '#1976D2',
        marginRight: 4,
        maxWidth: 160,
    },
    skillTagRemove: {
        padding: 2,
    },
    suggestionLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textSecondary || '#64748B',
        marginBottom: 6,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        marginTop: 4,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        backgroundColor: COLORS.white,
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary,
    },
    checkboxLabel: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
    locationSection: {
        marginBottom: 8,
    },
    detectedLocationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginTop: -6,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    detectedLocationText: {
        fontSize: 12,
        color: COLORS.textSecondary || '#64748B',
    },
    salarySection: {
        marginTop: 10,
        marginBottom: 6,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.border || '#E2E8F0',
    },
    salaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    periodToggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#E2E8F0',
        borderRadius: 8,
        padding: 2,
    },
    periodBtn: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
    },
    periodBtnActive: {
        backgroundColor: COLORS.primary || '#1976D2',
    },
    periodBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textSecondary || '#64748B',
    },
    periodBtnTextActive: {
        color: '#FFFFFF',
    },
    salaryInputRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    presetsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 4,
    },
    presetChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 9,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: COLORS.border || '#CBD5E1',
    },
    presetChipActive: {
        backgroundColor: (COLORS.primaryLight || '#1976D2') + '25',
        borderColor: COLORS.primary || '#1976D2',
    },
    presetChipText: {
        fontSize: 11,
        fontWeight: '500',
        color: COLORS.textSecondary || '#475569',
    },
    presetChipTextActive: {
        color: COLORS.primary || '#1976D2',
        fontWeight: '700',
    },
    otpSection: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    otpIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: (COLORS.primaryLight || '#1976D2') + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    otpTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 6,
    },
    otpSubtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 18,
    },
    changeMobileBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 20,
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    changeMobileText: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: '600',
    },
    otpContainer: {
        marginBottom: 20,
        width: '100%',
    },
    footer: {
        marginTop: 8,
    },
    loginLink: {
        marginTop: 16,
        alignItems: 'center',
    },
    loginText: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    loginTextBold: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    kycInfoBox: {
        backgroundColor: (COLORS.primaryLight || '#1976D2') + '10',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: (COLORS.primaryLight || '#1976D2') + '30',
    },
    kycTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginTop: 8,
        marginBottom: 6,
    },
    kycSubtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 18,
    },
    noteText: {
        fontSize: 12,
        color: COLORS.textLight,
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        width: '100%',
        maxWidth: 480,
        paddingTop: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        flex: 1,
        marginRight: 8,
    },
    modalSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 10,
        marginBottom: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 8,
    },
    modalSearchInput: {
        flex: 1,
        fontSize: 13,
        color: COLORS.text,
        padding: 0,
    },
    modalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalItemSelected: {
        backgroundColor: (COLORS.primaryLight || '#1976D2') + '15',
    },
    modalItemText: {
        fontSize: 14,
        color: COLORS.text,
        flex: 1,
        marginRight: 8,
    },
    modalItemTextSelected: {
        color: COLORS.primary || '#1976D2',
        fontWeight: '600',
    },
    emptyContainer: {
        padding: 24,
        alignItems: 'center',
    },
    emptyText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    modalFooter: {
        padding: 14,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
});
