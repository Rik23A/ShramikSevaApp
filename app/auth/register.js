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
    Dimensions,
    Modal,
    FlatList,
    TouchableWithoutFeedback,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import OtpInput from '../../components/OtpInput';
import {
    COLORS,
    WORKER_TYPES,
    INDIAN_STATES,
    BUSINESS_TYPES,
    EMPLOYEE_COUNTS,
    WORKER_SKILLS
} from '../../constants/config';
import { initiateRegistration, completeRegistration, checkMobile } from '../../services/authService';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function RegisterScreen() {
    const { role } = useLocalSearchParams();
    const { t } = useLanguage();
    const { login } = useAuth();

    const totalSteps = role === 'employer' ? 6 : 3;

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
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
        role: role || 'worker',
        workerType: '', // Single select
        skills: [],     // Multi select
        experience: '',
        isFresher: false,
        gender: '',
        locationName: '',
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
    const [dropdownConfig, setDropdownConfig] = useState({
        items: [],
        title: '',
        key: '',
        multiSelect: false
    });

    const openDropdown = (key, title, items, multiSelect = false) => {
        setDropdownConfig({ key, title, items, multiSelect });
        setDropdownVisible(true);
    };

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
            if (!formData.workerType) {
                newErrors.workerType = t('worker_type_required') || 'Select work type';
            }
            if (!formData.isFresher && !formData.experience) {
                newErrors.experience = t('experience_required') || 'Experience is required';
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

                    // Format for backend
                    if (role === 'worker') {
                        // Ensure workerType is array if backend expects it
                        // But wait, if backend expects array, we should wrap it.
                        // Assuming backend handles array or string, but typically arrays for types.
                        // Let's wrap it to be safe if it's a string
                        if (typeof submissionData.workerType === 'string') {
                            submissionData.workerType = [submissionData.workerType];
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

    const renderDropdownTrigger = (label, value, items, key, error, multiSelect = false) => (
        <View style={styles.dropdownContainer}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
                style={[styles.dropdownButton, error && styles.inputError]}
                onPress={() => openDropdown(key, label.replace('*', '').trim(), items, multiSelect)}
            >
                <Text style={[styles.dropdownText, (!value || (Array.isArray(value) && value.length === 0)) && styles.placeholderText]} numberOfLines={1}>
                    {Array.isArray(value)
                        ? (value.length > 0 ? value.join(', ') : `Select ${label.replace('*', '').trim()}`)
                        : (value || `Select ${label.replace('*', '').trim()}`)}
                </Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );

    const renderStep1 = () => (
        <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>{t('basic_details')}</Text>
            <Input label={`${t('full_name')} *`} placeholder={t('enter_full_name')} value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} error={errors.name} icon="person-outline" />
            <Input label={`${t('mobile')} *`} placeholder={t('mobile_placeholder')} value={formData.mobile} onChangeText={(text) => setFormData({ ...formData, mobile: text.replace(/[^0-9]/g, '').slice(0, 10) })} keyboardType="phone-pad" error={errors.mobile} maxLength={10} icon="call-outline" />
            <Input label={role === 'employer' ? `${t('email')} *` : `${t('email')} (${t('optional') || 'Optional'})`} placeholder={t('enter_email_address')} value={formData.email} onChangeText={(text) => setFormData({ ...formData, email: text })} keyboardType="email-address" error={errors.email} autoCapitalize="none" icon="mail-outline" />
            <Input label={role === 'employer' ? `${t('enter_password')} *` : `${t('enter_password')} (${t('optional') || 'Optional'})`} placeholder={t('create_password') || 'Create password'} value={formData.password} onChangeText={(text) => setFormData({ ...formData, password: text })} isPassword error={errors.password} icon="lock-closed-outline" />
            <Input label={role === 'employer' ? `${t('confirm_password') || 'Confirm Password'} *` : `${t('confirm_password') || 'Confirm Password'} (${t('optional') || 'Optional'})`} placeholder={t('confirm_password') || 'Confirm password'} value={formData.confirmPassword} onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })} isPassword error={errors.confirmPassword} icon="lock-closed-outline" />
        </View>
    );

    const renderWorkerProfessional = () => {
        // Get skills based on selected worker type
        // Ensure items is an array
        const skillList = formData.workerType ? (WORKER_SKILLS[formData.workerType] || []) : [];

        return (
            <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>{t('professional_details')}</Text>
                {renderDropdownTrigger(`${t('gender')} *`, formData.gender, [t('gender_male'), t('gender_female'), t('gender_other')], 'gender', errors.gender)}

                {/* Worker Type - Single Select */}
                {renderDropdownTrigger(`${t('worker_type')} *`, formData.workerType, WORKER_TYPES, 'workerType', errors.workerType, false)}

                {/* Skills - Multi Select - Only show if Worker Type is selected */}
                {formData.workerType ? (
                    renderDropdownTrigger(t('skills'), formData.skills, skillList, 'skills', errors.skills, true)
                ) : null}

                <View style={styles.checkboxContainer}>
                    <TouchableOpacity style={[styles.checkbox, formData.isFresher && styles.checkboxChecked]} onPress={() => setFormData({ ...formData, isFresher: !formData.isFresher, experience: '' })}>
                        {formData.isFresher && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                    </TouchableOpacity>
                    <Text style={styles.checkboxLabel}>{t('fresher_label') || 'I am a Fresher (No Experience)'}</Text>
                </View>
                {!formData.isFresher && <Input label={t('exp_years_label') || 'Experience (Years) *'} placeholder="e.g. 2.5" value={formData.experience} onChangeText={(text) => setFormData({ ...formData, experience: text.replace(/[^0-9.]/g, '') })} keyboardType="numeric" error={errors.experience} />}
                <Input label={t('city_state') || 'City/State'} placeholder={t('current_location_placeholder')} value={formData.locationName} onChangeText={(text) => setFormData({ ...formData, locationName: text })} icon="location-outline" />
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
        <View style={styles.otpSection}>
            <View style={styles.otpIconContainer}>
                <Ionicons name="shield-checkmark" size={60} color={COLORS.primary} />
            </View>
            <Text style={styles.otpTitle}>{t('verify_otp')}</Text>
            <Text style={styles.otpSubtitle}>{t('enter_otp_sent_to')} +91 {formData.mobile}</Text>
            <View style={styles.otpContainer}>
                <OtpInput value={otp} onChange={setOtp} length={6} />
            </View>
            <Button title={t('verify_register')} onPress={handleVerifyOtp} />
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
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{step === totalSteps ? t('verification') : (role === 'worker' ? t('create_worker_account') : t('create_employer_account'))}</Text>
                        <View style={[styles.roleSelectorButton, role === "worker" ? styles.roleSelectorButtonActive : styles.roleSelectorButtonInactive, { opacity: 0 }]}>
                            {/* Hidden view to balance the flex header space for the title to be perfectly centered */}
                            <Image source={require('../../assets/images/icon.png')} style={{ width: 32, height: 32 }} resizeMode="contain" />
                        </View>
                    </View>

                    {step < totalSteps && (
                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBar, { width: `${(step / (totalSteps - 1)) * 100}%` }]} />
                        </View>
                    )}

                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                            {renderCurrentStep()}
                            {step < totalSteps && (
                                <View style={styles.footer}>
                                    <Button title={t('next')} onPress={handleNextWithStructure} />
                                    <TouchableOpacity style={styles.loginLink} onPress={() => router.push('/auth/login')}>
                                        <Text style={styles.loginText}>{t('already_have_account')} <Text style={styles.loginTextBold}>{t('login')}</Text></Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Animated.View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>

            {/* Selection Modal */}
            <Modal
                visible={dropdownVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setDropdownVisible(false)}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDropdownVisible(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('select_placeholder').replace('{title}', dropdownConfig.title)}</Text>
                            <TouchableOpacity onPress={() => setDropdownVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>
                        {dropdownConfig.items && dropdownConfig.items.length > 0 ? (
                            <FlatList
                                data={dropdownConfig.items}
                                keyExtractor={(item, index) => index.toString()}
                                renderItem={({ item }) => {
                                    const isSelected = dropdownConfig.multiSelect
                                        ? formData[dropdownConfig.key]?.includes(item)
                                        : formData[dropdownConfig.key] === item;
                                    return (
                                        <TouchableOpacity style={[styles.modalItem, isSelected && styles.modalItemSelected]} onPress={() => handleSelect(item)}>
                                            <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>{item}</Text>
                                            {isSelected && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
                                        </TouchableOpacity>
                                    );
                                }}
                                style={{ maxHeight: height * 0.6 }}
                            />
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>{t('no_items_available')}</Text>
                            </View>
                        )}

                        {dropdownConfig.multiSelect && (
                            <View style={{ padding: 16 }}>
                                <Button title={t('done')} onPress={() => setDropdownVisible(false)} />
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    keyboardView: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1, textAlign: 'center', marginHorizontal: 10 },
    progressContainer: { height: 4, backgroundColor: COLORS.border, marginHorizontal: 20, marginTop: 10, borderRadius: 2, overflow: 'hidden' },
    progressBar: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
    scrollContent: { padding: 24, paddingBottom: 40 },
    formSection: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3, marginBottom: 20 },
    sectionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
    footer: { marginTop: 10 },
    loginLink: { marginTop: 20, alignItems: 'center' },
    loginText: { fontSize: 14, color: COLORS.textSecondary },
    loginTextBold: { color: COLORS.primary, fontWeight: '600' },
    otpSection: { alignItems: 'center', padding: 20 },
    otpIconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primaryLight + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    otpTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
    otpSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 30 },
    otpContainer: { marginBottom: 24, width: '100%' },
    label: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: 8 },
    dropdownContainer: { marginBottom: 16 },
    dropdownButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 14 },
    dropdownText: { fontSize: 16, color: COLORS.text },
    placeholderText: { color: COLORS.textLight },
    inputError: { borderColor: COLORS.danger },
    errorText: { color: COLORS.danger, fontSize: 12, marginTop: 4, marginLeft: 4 },
    checkboxContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 4 },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 10, backgroundColor: COLORS.white },
    checkboxChecked: { backgroundColor: COLORS.primary },
    checkboxLabel: { fontSize: 15, color: COLORS.text, flex: 1 },
    kycInfoBox: { backgroundColor: COLORS.primaryLight + '10', padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: COLORS.primaryLight + '30' },
    kycTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginTop: 10, marginBottom: 8 },
    kycSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
    noteText: { fontSize: 13, color: COLORS.textLight, textAlign: 'center', fontStyle: 'italic', marginTop: 10 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: COLORS.white, borderRadius: 16, width: '100%', maxHeight: '80%', paddingVertical: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, paddingBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
    modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
    modalItemSelected: { backgroundColor: COLORS.primaryLight + '10' },
    modalItemText: { fontSize: 16, color: COLORS.text },
    modalItemTextSelected: { color: COLORS.primary, fontWeight: '600' },
    emptyContainer: { padding: 20, alignItems: 'center' },
    emptyText: { color: COLORS.textSecondary, fontSize: 16 }
});
