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
    TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { initiateRegistration, completeRegistration } from '../../services/authService';
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
            if (!formData.name.trim()) newErrors.name = 'Name is required';
            if (!formData.mobile || !/^[6-9]\d{9}$/.test(formData.mobile)) {
                newErrors.mobile = 'Enter valid 10-digit mobile number';
            }
            if (role === 'employer' && !formData.email) {
                newErrors.email = 'Email is required for employers';
            }
            if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
                newErrors.email = 'Enter valid email address';
            }
            if (!formData.password || formData.password.length < 6) {
                newErrors.password = 'Password must be at least 6 characters';
            }
            if (formData.password !== formData.confirmPassword) {
                newErrors.confirmPassword = 'Passwords do not match';
            }
        } else if (currentStep === 2 && role === 'worker') {
            if (!formData.gender) newErrors.gender = 'Gender is required';
            if (!formData.workerType) {
                newErrors.workerType = 'Select work type';
            }
            if (!formData.isFresher && !formData.experience) {
                newErrors.experience = 'Experience is required';
            }
        } else if (currentStep === 2 && role === 'employer') {
            if (!formData.companyName.trim()) newErrors.companyName = 'Company Name is required';
            if (!formData.businessType) newErrors.businessType = 'Select business type';
            if (!formData.employeeCount) newErrors.employeeCount = 'Select employee count';
        } else if (currentStep === 3 && role === 'employer') {
            if (!formData.city.trim()) newErrors.city = 'City is required';
            if (!formData.state) newErrors.state = 'Select state';
            if (!formData.pincode || !/^\d{6}$/.test(formData.pincode)) {
                newErrors.pincode = 'Enter valid 6-digit pincode';
            }
        } else if (currentStep === 4 && role === 'employer') {
            if (!formData.contactName.trim()) newErrors.contactName = 'Contact person name is required';
            if (!formData.contactPhone || !/^[6-9]\d{9}$/.test(formData.contactPhone)) {
                newErrors.contactPhone = 'Enter valid 10-digit phone number';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNextWithStructure = async () => {
        if (validateStep(step)) {
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
                    Alert.alert('Registration Failed', error.response?.data?.message || 'Something went wrong');
                } finally {
                    setLoading(false);
                }
            }
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length !== 6) {
            Alert.alert('Error', 'Please enter valid 6-digit OTP');
            return;
        }
        setLoading(true);
        try {
            const userData = await completeRegistration(formData.mobile, otp);

            // Auto-login
            await login(userData);

            Alert.alert('Success', 'Registration completed successfully!', [
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
            Alert.alert('Verification Failed', error.response?.data?.message || 'Invalid OTP');
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
            <Text style={styles.sectionTitle}>Basic Details</Text>
            <Input label="Full Name *" placeholder="Enter your full name" value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} error={errors.name} icon="person-outline" />
            <Input label="Mobile Number *" placeholder="10-digit mobile number" value={formData.mobile} onChangeText={(text) => setFormData({ ...formData, mobile: text.replace(/[^0-9]/g, '').slice(0, 10) })} keyboardType="phone-pad" error={errors.mobile} maxLength={10} icon="call-outline" />
            <Input label={role === 'employer' ? "Email *" : "Email (Optional)"} placeholder="Enter your email" value={formData.email} onChangeText={(text) => setFormData({ ...formData, email: text })} keyboardType="email-address" error={errors.email} autoCapitalize="none" icon="mail-outline" />
            <Input label="Password *" placeholder="Create password" value={formData.password} onChangeText={(text) => setFormData({ ...formData, password: text })} isPassword error={errors.password} icon="lock-closed-outline" />
            <Input label="Confirm Password *" placeholder="Confirm password" value={formData.confirmPassword} onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })} isPassword error={errors.confirmPassword} icon="lock-closed-outline" />
        </View>
    );

    const renderWorkerProfessional = () => {
        // Get skills based on selected worker type
        // Ensure items is an array
        const skillList = formData.workerType ? (WORKER_SKILLS[formData.workerType] || []) : [];

        return (
            <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Professional Details</Text>
                {renderDropdownTrigger('Gender *', formData.gender, ['Male', 'Female', 'Other'], 'gender', errors.gender)}

                {/* Worker Type - Single Select */}
                {renderDropdownTrigger('Work Type *', formData.workerType, WORKER_TYPES, 'workerType', errors.workerType, false)}

                {/* Skills - Multi Select - Only show if Worker Type is selected */}
                {formData.workerType ? (
                    renderDropdownTrigger('Skills', formData.skills, skillList, 'skills', errors.skills, true)
                ) : null}

                <View style={styles.checkboxContainer}>
                    <TouchableOpacity style={[styles.checkbox, formData.isFresher && styles.checkboxChecked]} onPress={() => setFormData({ ...formData, isFresher: !formData.isFresher, experience: '' })}>
                        {formData.isFresher && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                    </TouchableOpacity>
                    <Text style={styles.checkboxLabel}>I am a Fresher (No Experience)</Text>
                </View>
                {!formData.isFresher && <Input label="Experience (Years) *" placeholder="e.g. 2.5" value={formData.experience} onChangeText={(text) => setFormData({ ...formData, experience: text })} keyboardType="numeric" error={errors.experience} />}
                <Input label="City/State" placeholder="Current Location" value={formData.locationName} onChangeText={(text) => setFormData({ ...formData, locationName: text })} icon="location-outline" />
            </View>
        );
    };

    const renderCompanyInfo = () => (
        <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Company Information</Text>
            <Input label="Company Name *" placeholder="Enter company name" value={formData.companyName} onChangeText={(text) => setFormData({ ...formData, companyName: text })} error={errors.companyName} icon="business-outline" />
            {renderDropdownTrigger('Business Type *', formData.businessType, BUSINESS_TYPES, 'businessType', errors.businessType)}
            {renderDropdownTrigger('Number of Employees *', formData.employeeCount, EMPLOYEE_COUNTS, 'employeeCount', errors.employeeCount)}
            <Input label="Founded Year (Optional)" placeholder="e.g., 2015" value={formData.foundedYear} onChangeText={(text) => setFormData({ ...formData, foundedYear: text.replace(/[^0-9]/g, '').slice(0, 4) })} keyboardType="numeric" maxLength={4} />
            <Input label="Company Website (Optional)" placeholder="https://yourcompany.com" value={formData.website} onChangeText={(text) => setFormData({ ...formData, website: text })} autoCapitalize="none" keyboardType="url" />
            <Input label="Description (Optional)" placeholder="Briefly describe your company..." value={formData.description} onChangeText={(text) => setFormData({ ...formData, description: text })} multiline numberOfLines={3} style={{ height: 80, textAlignVertical: 'top' }} />
        </View>
    );

    const renderCompanyAddress = () => (
        <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Company Address</Text>
            <Input label="Street Address (Optional)" placeholder="Enter street address" value={formData.street} onChangeText={(text) => setFormData({ ...formData, street: text })} />
            <Input label="City *" placeholder="Enter city" value={formData.city} onChangeText={(text) => setFormData({ ...formData, city: text })} error={errors.city} />
            {renderDropdownTrigger('State *', formData.state, INDIAN_STATES, 'state', errors.state)}
            <Input label="Pincode *" placeholder="Enter 6-digit pincode" value={formData.pincode} onChangeText={(text) => setFormData({ ...formData, pincode: text.replace(/[^0-9]/g, '').slice(0, 6) })} keyboardType="numeric" error={errors.pincode} maxLength={6} />
            <Input label="Google Maps Link (Optional)" placeholder="Paste Google Maps link" value={formData.mapsLink} onChangeText={(text) => setFormData({ ...formData, mapsLink: text })} autoCapitalize="none" />
        </View>
    );

    const renderContactPerson = () => (
        <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Contact Person</Text>
            <Input label="Contact Person Name *" placeholder="Enter name" value={formData.contactName} onChangeText={(text) => setFormData({ ...formData, contactName: text })} error={errors.contactName} autoCapitalize="words" icon="person-outline" />
            <Input label="Designation (Optional)" placeholder="e.g., HR Manager" value={formData.contactDesignation} onChangeText={(text) => setFormData({ ...formData, contactDesignation: text })} />
            <Input label="Contact Phone *" placeholder="Enter phone number" value={formData.contactPhone} onChangeText={(text) => setFormData({ ...formData, contactPhone: text.replace(/[^0-9]/g, '').slice(0, 10) })} keyboardType="phone-pad" error={errors.contactPhone} maxLength={10} icon="call-outline" />
            <Input label="Contact Email (Optional)" placeholder="Enter email" value={formData.contactEmail} onChangeText={(text) => setFormData({ ...formData, contactEmail: text })} keyboardType="email-address" autoCapitalize="none" icon="mail-outline" />
        </View>
    );

    const renderDocuments = () => (
        <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>KYC Verification</Text>
            <View style={styles.kycInfoBox}>
                <Ionicons name="shield-checkmark-outline" size={40} color={COLORS.primary} />
                <Text style={styles.kycTitle}>Build Trust</Text>
                <Text style={styles.kycSubtitle}>Verified profiles get 3x more responses from workers.</Text>
            </View>
            <Input label="GST Number (Optional)" placeholder="Enter 15-digit GST number" value={formData.gstNumber} onChangeText={(text) => setFormData({ ...formData, gstNumber: text.toUpperCase().slice(0, 15) })} autoCapitalize="characters" maxLength={15} />
            <Text style={styles.noteText}>You can upload additional documents from your profile later.</Text>
        </View>
    );

    const renderOtpStep = () => (
        <View style={styles.otpSection}>
            <View style={styles.otpIconContainer}>
                <Ionicons name="shield-checkmark" size={60} color={COLORS.primary} />
            </View>
            <Text style={styles.otpTitle}>Verify OTP</Text>
            <Text style={styles.otpSubtitle}>Enter the 6-digit code sent to +91 {formData.mobile}</Text>
            <View style={styles.otpContainer}>
                <OtpInput value={otp} onChange={setOtp} length={6} />
            </View>
            <Button title="Verify & Register" onPress={handleVerifyOtp} />
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
        <SafeAreaView style={styles.container}>
            {loading && <LoadingSpinner fullScreen={true} message={"Processing..."} />}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{step === totalSteps ? 'Verification' : `Create ${role === 'worker' ? 'Worker' : 'Employer'} Account`}</Text>
                    <View style={{ width: 24 }} />
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
                                <Button title="Next" onPress={handleNextWithStructure} />
                                <TouchableOpacity style={styles.loginLink} onPress={() => router.push('/auth/login')}>
                                    <Text style={styles.loginText}>Already have an account? <Text style={styles.loginTextBold}>Login</Text></Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>

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
                            <Text style={styles.modalTitle}>Select {dropdownConfig.title}</Text>
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
                                <Text style={styles.emptyText}>No items available</Text>
                            </View>
                        )}

                        {dropdownConfig.multiSelect && (
                            <View style={{ padding: 16 }}>
                                <Button title="Done" onPress={() => setDropdownVisible(false)} />
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
    headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
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
