import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    TouchableOpacity,
    Animated,
    Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { COLORS, WORKER_TYPES, BUSINESS_TYPES, EMPLOYEE_COUNTS, INDIAN_STATES } from '../../constants/config';
import { initiateRegistration } from '../../services/authService';

const { width } = Dimensions.get('window');

// Step titles for employer registration
const EMPLOYER_STEPS = [
    { title: 'Basic Details', icon: 'person-outline' },
    { title: 'Company Info', icon: 'business-outline' },
    { title: 'Address', icon: 'location-outline' },
    { title: 'Contact Person', icon: 'call-outline' },
    { title: 'Documents', icon: 'document-outline' },
];

export default function RegisterScreen() {
    const { role } = useLocalSearchParams();
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const scrollViewRef = useRef(null);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const [formData, setFormData] = useState({
        // Step 1: Basic Details
        name: '',
        mobile: '',
        email: '',
        password: '',
        // Worker fields
        workerType: [],
        isFresher: true,
        experienceYears: '',
        experienceMonths: '',
        currentJobTitle: '',
        currentCompany: '',
        currentSalary: '',
        // Step 2: Company Information
        companyName: '',
        businessType: '',
        employeeCount: '',
        foundedYear: '',
        website: '',
        description: '',
        // Step 3: Company Address
        street: '',
        city: '',
        state: '',
        pincode: '',
        mapsLink: '',
        // Step 4: Contact Person
        contactName: '',
        contactDesignation: '',
        contactPhone: '',
        contactEmail: '',
        // Step 5: Documents (KYC)
        gstNumber: '',
    });

    const [errors, setErrors] = useState({});
    const [showWorkerTypes, setShowWorkerTypes] = useState(false);
    const [showBusinessTypes, setShowBusinessTypes] = useState(false);
    const [showEmployeeCounts, setShowEmployeeCounts] = useState(false);
    const [showStates, setShowStates] = useState(false);

    const totalSteps = role === 'employer' ? 5 : 1;

    // Validation for each step
    const validateStep = (step) => {
        const newErrors = {};

        if (step === 1) {
            if (!formData.name.trim()) newErrors.name = 'Name is required';
            if (!formData.mobile || !/^[6-9]\d{9}$/.test(formData.mobile)) {
                newErrors.mobile = 'Enter valid 10-digit mobile number';
            }
            if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
                newErrors.email = 'Enter valid email address';
            }
            if (!formData.password || formData.password.length < 6) {
                newErrors.password = 'Password must be at least 6 characters';
            }
            if (role === 'worker') {
                if (formData.workerType.length === 0) {
                    newErrors.workerType = 'Select at least one worker type';
                }
                if (!formData.isFresher) {
                    if (!formData.experienceYears && !formData.experienceMonths) {
                        newErrors.experience = 'Enter total experience';
                    }
                    if (!formData.currentJobTitle.trim()) {
                        newErrors.currentJobTitle = 'Enter current job title';
                    }
                    if (!formData.currentSalary) {
                        newErrors.currentSalary = 'Enter current monthly salary';
                    }
                }
            }
        } else if (step === 2 && role === 'employer') {
            if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
            if (!formData.businessType) newErrors.businessType = 'Select business type';
            if (!formData.employeeCount) newErrors.employeeCount = 'Select employee count';
        } else if (step === 3 && role === 'employer') {
            if (!formData.city.trim()) newErrors.city = 'City is required';
            if (!formData.state) newErrors.state = 'Select state';
            if (!formData.pincode || !/^\d{6}$/.test(formData.pincode)) {
                newErrors.pincode = 'Enter valid 6-digit pincode';
            }
        } else if (step === 4 && role === 'employer') {
            if (!formData.contactName.trim()) newErrors.contactName = 'Contact person name is required';
            if (!formData.contactPhone || !/^[6-9]\d{9}$/.test(formData.contactPhone)) {
                newErrors.contactPhone = 'Enter valid 10-digit phone number';
            }
        }
        // Step 5 (Documents) is optional

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const animateTransition = (callback) => {
        Animated.sequence([
            Animated.timing(fadeAnim, {
                toValue: 0.3,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();
        setTimeout(callback, 150);
    };

    const handleNext = () => {
        if (!validateStep(currentStep)) return;

        if (currentStep < totalSteps) {
            animateTransition(() => {
                setCurrentStep(currentStep + 1);
                scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            });
        } else {
            handleRegister();
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            animateTransition(() => {
                setCurrentStep(currentStep - 1);
                scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            });
        }
    };

    const handleRegister = async () => {
        setLoading(true);

        try {
            const userData = {
                name: formData.name,
                mobile: formData.mobile,
                email: formData.email || undefined,
                password: formData.password,
                role: role,
            };

            if (role === 'worker') {
                userData.workerType = formData.workerType;
                userData.isFresher = formData.isFresher;
                if (!formData.isFresher) {
                    userData.experience = formData.experienceYears ? parseInt(formData.experienceYears) : 0;
                    userData.experienceMonths = formData.experienceMonths ? parseInt(formData.experienceMonths) : 0;
                    userData.currentJobTitle = formData.currentJobTitle;
                    userData.currentCompany = formData.currentCompany || undefined;
                    userData.currentSalary = formData.currentSalary ? parseInt(formData.currentSalary) : 0;
                }
            } else {
                // Employer data (WorkIndia style)
                userData.companyName = formData.companyName;
                userData.businessType = formData.businessType;
                userData.gstNumber = formData.gstNumber || undefined;
                userData.companyDetails = {
                    description: formData.description || undefined,
                    website: formData.website || undefined,
                    foundedYear: formData.foundedYear ? parseInt(formData.foundedYear) : undefined,
                    employeeCount: formData.employeeCount || undefined,
                    address: {
                        street: formData.street || undefined,
                        city: formData.city,
                        state: formData.state,
                        pincode: formData.pincode,
                        mapsLink: formData.mapsLink || undefined,
                    },
                    contactPerson: {
                        name: formData.contactName,
                        designation: formData.contactDesignation || undefined,
                        phone: formData.contactPhone,
                        email: formData.contactEmail || undefined,
                    },
                    isProfileComplete: true,
                };
            }

            await initiateRegistration(userData);

            router.push({
                pathname: '/auth/verify-otp',
                params: { mobile: formData.mobile, isLogin: 'false' }
            });
        } catch (err) {
            Alert.alert(
                'Registration Failed',
                err.response?.data?.message || 'Failed to register. Please try again.'
            );
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

    const selectOption = (field, value, closeDropdown) => {
        setFormData({ ...formData, [field]: value });
        setErrors({ ...errors, [field]: '' });
        closeDropdown();
    };

    // Render Step Progress Indicator
    const renderStepIndicator = () => {
        if (role !== 'employer') return null;

        return (
            <View style={styles.stepIndicatorContainer}>
                <View style={styles.stepIndicator}>
                    {EMPLOYER_STEPS.map((step, index) => (
                        <React.Fragment key={index}>
                            <TouchableOpacity
                                style={[
                                    styles.stepCircle,
                                    currentStep > index + 1 && styles.stepCompleted,
                                    currentStep === index + 1 && styles.stepActive,
                                ]}
                                onPress={() => {
                                    if (index + 1 < currentStep) {
                                        animateTransition(() => setCurrentStep(index + 1));
                                    }
                                }}
                            >
                                {currentStep > index + 1 ? (
                                    <Ionicons name="checkmark" size={16} color={COLORS.white} />
                                ) : (
                                    <Ionicons
                                        name={step.icon}
                                        size={16}
                                        color={currentStep === index + 1 ? COLORS.white : COLORS.textSecondary}
                                    />
                                )}
                            </TouchableOpacity>
                            {index < EMPLOYER_STEPS.length - 1 && (
                                <View
                                    style={[
                                        styles.stepLine,
                                        currentStep > index + 1 && styles.stepLineCompleted
                                    ]}
                                />
                            )}
                        </React.Fragment>
                    ))}
                </View>
                <Text style={styles.stepTitle}>
                    Step {currentStep}: {EMPLOYER_STEPS[currentStep - 1].title}
                </Text>
            </View>
        );
    };

    // Render Dropdown Select
    const renderDropdown = (label, value, options, isOpen, setIsOpen, field, placeholder) => (
        <View style={styles.dropdownContainer}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
                style={[styles.dropdown, errors[field] && styles.dropdownError]}
                onPress={() => setIsOpen(!isOpen)}
            >
                <Text style={value ? styles.dropdownText : styles.dropdownPlaceholder}>
                    {value || placeholder}
                </Text>
                <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={COLORS.textSecondary}
                />
            </TouchableOpacity>
            {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}

            {isOpen && (
                <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                    {options.map((option, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.dropdownItem,
                                value === option && styles.dropdownItemSelected
                            ]}
                            onPress={() => selectOption(field, option, () => setIsOpen(false))}
                        >
                            <Text style={[
                                styles.dropdownItemText,
                                value === option && styles.dropdownItemTextSelected
                            ]}>
                                {option}
                            </Text>
                            {value === option && (
                                <Ionicons name="checkmark" size={18} color={COLORS.white} />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </View>
    );

    // Step 1: Basic Details
    const renderStep1 = () => (
        <View>
            <Input
                label="Full Name"
                placeholder="Enter your full name"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                error={errors.name}
                autoCapitalize="words"
            />

            <View style={styles.inputRow}>
                <Text style={styles.countryCode}>+91</Text>
                <View style={styles.mobileInput}>
                    <Input
                        label="Mobile Number"
                        placeholder="Enter mobile number"
                        value={formData.mobile}
                        onChangeText={(text) => setFormData({ ...formData, mobile: text.replace(/[^0-9]/g, '').slice(0, 10) })}
                        keyboardType="phone-pad"
                        error={errors.mobile}
                        maxLength={10}
                    />
                </View>
            </View>

            <Input
                label="Email (Optional)"
                placeholder="Enter your email"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                error={errors.email}
                autoCapitalize="none"
            />

            <Input
                label="Password"
                placeholder="Create a password"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry
                error={errors.password}
            />

            {/* Worker-specific: Worker Type Selection */}
            {role === 'worker' && (
                <View style={styles.workerTypeContainer}>
                    <Text style={styles.label}>Worker Type</Text>
                    <TouchableOpacity
                        style={[styles.dropdown, errors.workerType && styles.dropdownError]}
                        onPress={() => setShowWorkerTypes(!showWorkerTypes)}
                    >
                        <Text style={formData.workerType.length > 0 ? styles.dropdownText : styles.dropdownPlaceholder}>
                            {formData.workerType.length > 0
                                ? `${formData.workerType.length} type(s) selected`
                                : 'Select worker type(s)'}
                        </Text>
                        <Ionicons
                            name={showWorkerTypes ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color={COLORS.textSecondary}
                        />
                    </TouchableOpacity>
                    {errors.workerType && <Text style={styles.errorText}>{errors.workerType}</Text>}

                    {showWorkerTypes && (
                        <View style={styles.workerTypeList}>
                            {WORKER_TYPES.map((type, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.workerTypeItem,
                                        formData.workerType.includes(type) && styles.workerTypeItemSelected
                                    ]}
                                    onPress={() => toggleWorkerType(type)}
                                >
                                    <Text style={[
                                        styles.workerTypeText,
                                        formData.workerType.includes(type) && styles.workerTypeTextSelected
                                    ]}>
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
            )}

            {/* Worker-specific: Experience Details */}
            {role === 'worker' && (
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Work Experience</Text>

                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            style={[styles.toggleButton, formData.isFresher && styles.toggleButtonActive]}
                            onPress={() => setFormData({ ...formData, isFresher: true })}
                        >
                            <Text style={[styles.toggleText, formData.isFresher && styles.toggleTextActive]}>Fresher</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleButton, !formData.isFresher && styles.toggleButtonActive]}
                            onPress={() => setFormData({ ...formData, isFresher: false })}
                        >
                            <Text style={[styles.toggleText, !formData.isFresher && styles.toggleTextActive]}>Experienced</Text>
                        </TouchableOpacity>
                    </View>

                    {!formData.isFresher && (
                        <View style={styles.experienceForm}>
                            <Text style={styles.label}>Total Experience</Text>
                            <View style={styles.row}>
                                <View style={styles.halfInput}>
                                    <Input
                                        placeholder="Years"
                                        value={formData.experienceYears}
                                        onChangeText={(text) => setFormData({ ...formData, experienceYears: text.replace(/[^0-9]/g, '') })}
                                        keyboardType="numeric"
                                        maxLength={2}
                                    />
                                </View>
                                <View style={styles.halfInput}>
                                    <Input
                                        placeholder="Months"
                                        value={formData.experienceMonths}
                                        onChangeText={(text) => setFormData({ ...formData, experienceMonths: text.replace(/[^0-9]/g, '').slice(0, 2) })}
                                        keyboardType="numeric"
                                        maxLength={2}
                                    />
                                </View>
                            </View>
                            {errors.experience && <Text style={styles.errorText}>{errors.experience}</Text>}

                            <Input
                                label="Current Job Title"
                                placeholder="e.g. Delivery Boy, Driver"
                                value={formData.currentJobTitle}
                                onChangeText={(text) => setFormData({ ...formData, currentJobTitle: text })}
                                error={errors.currentJobTitle}
                            />

                            <Input
                                label="Current Company (Optional)"
                                placeholder="e.g. Swiggy, Uber"
                                value={formData.currentCompany}
                                onChangeText={(text) => setFormData({ ...formData, currentCompany: text })}
                            />

                            <Input
                                label="Current Monthly Salary"
                                placeholder="e.g. 15000"
                                value={formData.currentSalary}
                                onChangeText={(text) => setFormData({ ...formData, currentSalary: text.replace(/[^0-9]/g, '') })}
                                keyboardType="numeric"
                                error={errors.currentSalary}
                            />
                        </View>
                    )}
                </View>
            )}
        </View>
    );

    // Step 2: Company Information
    const renderStep2 = () => (
        <View>
            <Input
                label="Company Name *"
                placeholder="Enter your company name"
                value={formData.companyName}
                onChangeText={(text) => setFormData({ ...formData, companyName: text })}
                error={errors.companyName}
            />

            {renderDropdown(
                'Business Type *',
                formData.businessType,
                BUSINESS_TYPES,
                showBusinessTypes,
                setShowBusinessTypes,
                'businessType',
                'Select business type'
            )}

            {renderDropdown(
                'Number of Employees *',
                formData.employeeCount,
                EMPLOYEE_COUNTS,
                showEmployeeCounts,
                setShowEmployeeCounts,
                'employeeCount',
                'Select employee count'
            )}

            <Input
                label="Founded Year (Optional)"
                placeholder="e.g., 2015"
                value={formData.foundedYear}
                onChangeText={(text) => setFormData({ ...formData, foundedYear: text.replace(/[^0-9]/g, '').slice(0, 4) })}
                keyboardType="numeric"
                maxLength={4}
            />

            <Input
                label="Company Website (Optional)"
                placeholder="https://yourcompany.com"
                value={formData.website}
                onChangeText={(text) => setFormData({ ...formData, website: text })}
                autoCapitalize="none"
                keyboardType="url"
            />

            <Input
                label="Company Description (Optional)"
                placeholder="Briefly describe your company"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={3}
                style={{ height: 80, textAlignVertical: 'top' }}
            />
        </View>
    );

    // Step 3: Company Address
    const renderStep3 = () => (
        <View>
            <Input
                label="Street Address (Optional)"
                placeholder="Enter street address"
                value={formData.street}
                onChangeText={(text) => setFormData({ ...formData, street: text })}
            />

            <Input
                label="City *"
                placeholder="Enter city"
                value={formData.city}
                onChangeText={(text) => setFormData({ ...formData, city: text })}
                error={errors.city}
            />

            {renderDropdown(
                'State *',
                formData.state,
                INDIAN_STATES,
                showStates,
                setShowStates,
                'state',
                'Select state'
            )}

            <Input
                label="Pincode *"
                placeholder="Enter 6-digit pincode"
                value={formData.pincode}
                onChangeText={(text) => setFormData({ ...formData, pincode: text.replace(/[^0-9]/g, '').slice(0, 6) })}
                keyboardType="numeric"
                error={errors.pincode}
                maxLength={6}
            />

            <Input
                label="Google Maps Link (Optional)"
                placeholder="Paste Google Maps link"
                value={formData.mapsLink}
                onChangeText={(text) => setFormData({ ...formData, mapsLink: text })}
                autoCapitalize="none"
            />
        </View>
    );

    // Step 4: Contact Person
    const renderStep4 = () => (
        <View>
            <Input
                label="Contact Person Name *"
                placeholder="Enter contact person name"
                value={formData.contactName}
                onChangeText={(text) => setFormData({ ...formData, contactName: text })}
                error={errors.contactName}
                autoCapitalize="words"
            />

            <Input
                label="Designation (Optional)"
                placeholder="e.g., HR Manager, Owner"
                value={formData.contactDesignation}
                onChangeText={(text) => setFormData({ ...formData, contactDesignation: text })}
            />

            <View style={styles.inputRow}>
                <Text style={styles.countryCode}>+91</Text>
                <View style={styles.mobileInput}>
                    <Input
                        label="Contact Phone *"
                        placeholder="Enter phone number"
                        value={formData.contactPhone}
                        onChangeText={(text) => setFormData({ ...formData, contactPhone: text.replace(/[^0-9]/g, '').slice(0, 10) })}
                        keyboardType="phone-pad"
                        error={errors.contactPhone}
                        maxLength={10}
                    />
                </View>
            </View>

            <Input
                label="Contact Email (Optional)"
                placeholder="Enter contact email"
                value={formData.contactEmail}
                onChangeText={(text) => setFormData({ ...formData, contactEmail: text })}
                keyboardType="email-address"
                autoCapitalize="none"
            />
        </View>
    );

    // Step 5: Documents (KYC)
    const renderStep5 = () => (
        <View>
            <View style={styles.kycInfoBox}>
                <Ionicons name="shield-checkmark-outline" size={40} color={COLORS.primary} />
                <Text style={styles.kycTitle}>KYC Verification</Text>
                <Text style={styles.kycSubtitle}>
                    Complete your company verification to build trust with workers.
                    This step is optional but recommended.
                </Text>
            </View>

            <Input
                label="GST Number (Optional)"
                placeholder="Enter 15-digit GST number"
                value={formData.gstNumber}
                onChangeText={(text) => setFormData({ ...formData, gstNumber: text.toUpperCase().slice(0, 15) })}
                autoCapitalize="characters"
                maxLength={15}
            />

            <View style={styles.documentNote}>
                <Ionicons name="information-circle-outline" size={20} color={COLORS.info} />
                <Text style={styles.documentNoteText}>
                    You can upload additional documents (GST Certificate, PAN Card) later from your profile settings.
                </Text>
            </View>

            <View style={styles.verificationNote}>
                <Ionicons name="time-outline" size={18} color={COLORS.warning} />
                <Text style={styles.verificationNoteText}>
                    Verification status: Pending
                </Text>
            </View>
        </View>
    );

    // Render current step content
    const renderCurrentStep = () => {
        if (role === 'worker') {
            return renderStep1();
        }

        switch (currentStep) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            case 4: return renderStep4();
            case 5: return renderStep5();
            default: return renderStep1();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    ref={scrollViewRef}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => {
                            if (currentStep > 1 && role === 'employer') {
                                handlePrevious();
                            } else {
                                router.back();
                            }
                        }}
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <Text style={styles.title}>
                            {role === 'worker' ? 'Worker Registration' : 'Employer Registration'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {role === 'worker'
                                ? 'Create your account to get started'
                                : 'Complete all steps to set up your company profile'
                            }
                        </Text>
                    </View>

                    {/* Step Indicator */}
                    {renderStepIndicator()}

                    {/* Form */}
                    <Animated.View style={[styles.form, { opacity: fadeAnim }]}>
                        {renderCurrentStep()}

                        {/* Navigation Buttons */}
                        <View style={styles.buttonContainer}>
                            {currentStep > 1 && role === 'employer' && (
                                <Button
                                    title="Previous"
                                    variant="outline"
                                    onPress={handlePrevious}
                                    style={styles.prevButton}
                                />
                            )}
                            <Button
                                title={currentStep === totalSteps ? 'Register' : 'Next'}
                                onPress={handleNext}
                                loading={loading}
                                style={[
                                    styles.nextButton,
                                    currentStep === 1 && role === 'employer' && styles.fullWidthButton
                                ]}
                            />
                        </View>

                        {currentStep === 5 && role === 'employer' && (
                            <TouchableOpacity
                                style={styles.skipButton}
                                onPress={handleRegister}
                            >
                                <Text style={styles.skipButtonText}>Skip & Register Later</Text>
                            </TouchableOpacity>
                        )}

                        <Text style={styles.terms}>
                            By registering, you agree to our{' '}
                            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                            <Text style={styles.termsLink}>Privacy Policy</Text>
                        </Text>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
    },
    backButton: {
        marginBottom: 16,
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: COLORS.textSecondary,
        lineHeight: 22,
    },
    // Step Indicator Styles
    stepIndicatorContainer: {
        marginBottom: 24,
    },
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    stepCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepActive: {
        backgroundColor: COLORS.primary,
    },
    stepCompleted: {
        backgroundColor: COLORS.success,
    },
    stepLine: {
        width: 24,
        height: 3,
        backgroundColor: COLORS.border,
        marginHorizontal: 4,
    },
    stepLineCompleted: {
        backgroundColor: COLORS.success,
    },
    stepTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
        textAlign: 'center',
    },
    // Form Styles
    form: {
        flex: 1,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    countryCode: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.text,
        backgroundColor: COLORS.white,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        marginRight: 8,
        marginTop: 22,
    },
    mobileInput: {
        flex: 1,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text,
        marginBottom: 6,
    },
    // Dropdown Styles
    dropdownContainer: {
        marginBottom: 16,
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
        fontSize: 16,
        color: COLORS.text,
    },
    dropdownPlaceholder: {
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    dropdownList: {
        marginTop: 8,
        backgroundColor: COLORS.white,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        maxHeight: 200,
    },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    dropdownItemSelected: {
        backgroundColor: COLORS.primary,
    },
    dropdownItemText: {
        fontSize: 14,
        color: COLORS.text,
    },
    dropdownItemTextSelected: {
        color: COLORS.white,
        fontWeight: '500',
    },
    errorText: {
        color: COLORS.danger,
        fontSize: 12,
        marginTop: 4,
    },
    // Worker Type Styles
    workerTypeContainer: {
        marginBottom: 16,
    },
    workerTypeList: {
        marginTop: 8,
        backgroundColor: COLORS.white,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        maxHeight: 250,
    },
    workerTypeItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    workerTypeItemSelected: {
        backgroundColor: COLORS.primary,
    },
    workerTypeText: {
        fontSize: 14,
        color: COLORS.text,
    },
    workerTypeTextSelected: {
        color: COLORS.white,
        fontWeight: '500',
    },
    // Button Styles
    buttonContainer: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 12,
    },
    prevButton: {
        flex: 1,
        borderColor: COLORS.primary,
    },
    nextButton: {
        flex: 1,
    },
    fullWidthButton: {
        flex: 1,
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: 12,
        marginTop: 8,
    },
    skipButtonText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textDecorationLine: 'underline',
    },
    // KYC Step Styles
    kycInfoBox: {
        backgroundColor: COLORS.infoLight,
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 24,
    },
    kycTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginTop: 12,
        marginBottom: 8,
    },
    kycSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    documentNote: {
        flexDirection: 'row',
        backgroundColor: COLORS.infoLight,
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
        alignItems: 'flex-start',
    },
    documentNoteText: {
        fontSize: 13,
        color: COLORS.text,
        marginLeft: 10,
        flex: 1,
        lineHeight: 18,
    },
    verificationNote: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        paddingVertical: 8,
    },
    verificationNoteText: {
        fontSize: 14,
        color: COLORS.warning,
        marginLeft: 8,
        fontWeight: '500',
    },
    // Terms
    terms: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 18,
    },
    termsLink: {
        color: COLORS.primary,
        fontWeight: '500',
    },
});
