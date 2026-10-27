import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, BUSINESS_TYPES, EMPLOYEE_COUNTS, INDIAN_STATES as STATES } from '../../constants/config';
import { useLanguage } from '../../context/LanguageContext';
import Button from '../ui/Button';
import ChangeMobileModal from './ChangeMobileModal';

export default function EditEmployerProfileModal({ visible, onClose, profile, onSave }) {
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();
    const [showChangeMobileModal, setShowChangeMobileModal] = useState(false);
    const [formData, setFormData] = useState({
        name: profile?.name || '',
        companyName: profile?.companyName || '',
        email: profile?.email || '',
        businessType: profile?.businessType || '',
        companyDetails: {
            employeeCount: profile?.companyDetails?.employeeCount || '',
            website: profile?.companyDetails?.website || '',
            description: profile?.companyDetails?.description || '',
            foundedYear: profile?.companyDetails?.foundedYear ? String(profile.companyDetails.foundedYear) : '',
            contactPerson: {
                name: profile?.companyDetails?.contactPerson?.name || '',
                designation: profile?.companyDetails?.contactPerson?.designation || '',
                phone: profile?.companyDetails?.contactPerson?.phone || '',
                email: profile?.companyDetails?.contactPerson?.email || '',
            },
            address: {
                street: profile?.companyDetails?.address?.street || '',
                city: profile?.companyDetails?.address?.city || '',
                state: profile?.companyDetails?.address?.state || '',
                pincode: profile?.companyDetails?.address?.pincode || '',
            },
        },
        mobile: profile?.mobile || '',
        gstNumber: profile?.gstNumber || '',
        gender: profile?.gender ? profile.gender.toLowerCase() : '',
        bio: profile?.bio || '',
    });

    useEffect(() => {
        if (visible && profile) {
            setFormData({
                name: profile.name || '',
                companyName: profile.companyName || '',
                email: profile.email || '',
                businessType: profile.businessType || '',
                companyDetails: {
                    employeeCount: profile.companyDetails?.employeeCount || '',
                    website: profile.companyDetails?.website || '',
                    description: profile.companyDetails?.description || '',
                    foundedYear: profile.companyDetails?.foundedYear ? String(profile.companyDetails.foundedYear) : '',
                    contactPerson: {
                        name: profile.companyDetails?.contactPerson?.name || '',
                        designation: profile.companyDetails?.contactPerson?.designation || '',
                        phone: profile.companyDetails?.contactPerson?.phone || '',
                        email: profile.companyDetails?.contactPerson?.email || '',
                    },
                    address: {
                        street: profile.companyDetails?.address?.street || '',
                        city: profile.companyDetails?.address?.city || '',
                        state: profile.companyDetails?.address?.state || '',
                        pincode: profile.companyDetails?.address?.pincode || '',
                    },
                },
                mobile: profile.mobile || '',
                gstNumber: profile.gstNumber || '',
                gender: profile.gender ? profile.gender.toLowerCase() : '',
                bio: profile.bio || '',
            });
        }
    }, [visible, profile]);

    const [saving, setSaving] = useState(false);
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [dropdownConfig, setDropdownConfig] = useState({
        items: [],
        title: '',
        key: '',
    });

    const openDropdown = (key, title, items) => {
        setDropdownConfig({ key, title, items });
        setDropdownVisible(true);
    };

    const handleSelect = (item) => {
        updateNestedField(dropdownConfig.key, item);
        setDropdownVisible(false);
    };

    const handleSave = async () => {
        if (!formData.name.trim() || !formData.companyName.trim()) {
            Alert.alert(t('error_title'), t('validation_name_req') || 'Name and Company Name are required');
            return;
        }

        // Validate Contact Person Phone
        const phone = formData.companyDetails?.contactPerson?.phone?.trim();
        if (phone && !/^[6-9]\d{9}$/.test(phone)) {
            Alert.alert(t('error_title'), t('valid_mobile_error') || 'Invalid contact person mobile number');
            return;
        }

        // Validate Contact Person Email
        const email = formData.companyDetails?.contactPerson?.email?.trim();
        if (email && !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
            Alert.alert(t('error_title'), t('valid_email_error') || 'Invalid contact person email address');
            return;
        }

        // Validate Founded Year if provided
        const foundedYearRaw = formData.companyDetails?.foundedYear;
        let cleanedFoundedYear = null;
        if (foundedYearRaw !== '' && foundedYearRaw !== null && foundedYearRaw !== undefined) {
            const yr = parseInt(foundedYearRaw, 10);
            if (isNaN(yr) || yr < 1800 || yr > new Date().getFullYear()) {
                Alert.alert(t('error_title'), 'Please enter a valid founded year (1800 - current year)');
                return;
            }
            cleanedFoundedYear = yr;
        }

        // Validate Pincode if provided
        const pincode = formData.companyDetails?.address?.pincode?.trim();
        if (pincode && !/^\d{6}$/.test(pincode)) {
            Alert.alert(t('error_title'), t('valid_pincode_error') || 'Enter valid 6-digit pincode');
            return;
        }

        // Format gender: 'Male', 'Female', 'Other', or undefined
        let capitalizedGender = undefined;
        if (formData.gender) {
            const g = formData.gender.trim().toLowerCase();
            capitalizedGender = g.charAt(0).toUpperCase() + g.slice(1);
        }

        const cleanedData = {
            name: formData.name.trim(),
            companyName: formData.companyName.trim(),
            email: formData.email.trim(),
            businessType: formData.businessType,
            gender: capitalizedGender,
            bio: formData.bio ? formData.bio.trim() : '',
            gstNumber: formData.gstNumber ? formData.gstNumber.trim().toUpperCase() : '',
            companyDetails: {
                ...formData.companyDetails,
                foundedYear: cleanedFoundedYear,
                employeeCount: formData.companyDetails.employeeCount,
                website: formData.companyDetails.website?.trim() || '',
                description: formData.companyDetails.description?.trim() || '',
                contactPerson: {
                    name: formData.companyDetails?.contactPerson?.name?.trim() || '',
                    designation: formData.companyDetails?.contactPerson?.designation?.trim() || '',
                    phone: phone || '',
                    email: email || '',
                },
                address: {
                    street: formData.companyDetails?.address?.street?.trim() || '',
                    city: formData.companyDetails?.address?.city?.trim() || '',
                    state: formData.companyDetails?.address?.state || '',
                    pincode: pincode || '',
                },
            },
        };

        setSaving(true);
        try {
            await onSave(cleanedData);
            onClose();
        } catch (error) {
            console.error('Failed to update employer profile:', error);
            const errorMsg = error?.response?.data?.message || error?.message || t('profile_update_fail') || 'Failed to update profile';
            Alert.alert(t('error_title'), errorMsg);
        } finally {
            setSaving(false);
        }
    };

    const updateNestedField = (path, value) => {
        const keys = path.split('.');
        const newFormData = { ...formData };
        let current = newFormData;

        for (let i = 0; i < keys.length - 1; i++) {
            current[keys[i]] = { ...current[keys[i]] };
            current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = value;
        setFormData(newFormData);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
            statusBarTranslucent={true}
        >
            <View style={styles.container}>
                <StatusBar style="light" backgroundColor={COLORS.primary || '#1976D2'} translucent={true} />

                {/* Header with Safe Area Inset */}
                <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.headerButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="close" size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{t('edit_profile')}</Text>
                        <View style={{ width: 38 }} />
                    </View>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Basic Info */}
                    <Text style={styles.sectionTitle}>{t('basic_info')}</Text>

                    <View style={styles.section}>
                        <Text style={styles.label}>{t('full_name')} *</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.name}
                            onChangeText={(text) => setFormData({ ...formData, name: text })}
                            placeholder={t('enter_full_name')}
                            placeholderTextColor={COLORS.textLight}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>{t('company_name')} *</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.companyName}
                            onChangeText={(text) => setFormData({ ...formData, companyName: text })}
                            placeholder={t('enter_company_name')}
                            placeholderTextColor={COLORS.textLight}
                        />
                    </View>

                    {/* Mobile */}
                    <View style={styles.section}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>{t('mobile')} *</Text>
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
                                <Text style={styles.verifiedBadgeText}>{t('verified') || 'Verified'}</Text>
                            </View>
                        </View>
                        <View style={styles.mobileContainer}>
                            <TextInput
                                style={[styles.input, styles.mobileInputDisabled]}
                                value={formData.mobile}
                                editable={false}
                                placeholder={t('enter_mobile_placeholder')}
                                placeholderTextColor={COLORS.textLight}
                            />
                            <TouchableOpacity
                                style={styles.changeMobileButton}
                                onPress={() => setShowChangeMobileModal(true)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="create-outline" size={14} color={COLORS.primary} />
                                <Text style={styles.changeMobileButtonText}>{t('change') || 'Change'}</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.helperText}>
                            {t('mobile_change_note') || 'To change your registered mobile number, OTP verification on the new SIM is required.'}
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>{t('gender')}</Text>
                        <View style={styles.chipsContainer}>
                            {['male', 'female', 'other'].map((g) => (
                                <TouchableOpacity
                                    key={g}
                                    style={[
                                        styles.chip,
                                        formData.gender?.toLowerCase() === g && styles.chipActive,
                                    ]}
                                    onPress={() => setFormData({ ...formData, gender: g })}
                                >
                                    <Text
                                        style={[
                                            styles.chipText,
                                            formData.gender?.toLowerCase() === g && styles.chipTextActive,
                                        ]}
                                    >
                                        {t(`${g}`)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>{t('bio')}</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={formData.bio}
                            onChangeText={(text) => setFormData({ ...formData, bio: text })}
                            placeholder={t('bio_placeholder')}
                            placeholderTextColor={COLORS.textLight}
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>{t('email')}</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.email}
                            onChangeText={(text) => setFormData({ ...formData, email: text })}
                            placeholder={t('enter_email')}
                            placeholderTextColor={COLORS.textLight}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>{t('business_type')}</Text>
                        <TouchableOpacity
                            style={styles.selectInput}
                            onPress={() => openDropdown('businessType', t('business_type'), BUSINESS_TYPES)}
                        >
                            <Text style={[styles.selectText, !formData.businessType && styles.placeholderText]}>
                                {formData.businessType || t('select_business_type')}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
                        </TouchableOpacity>
                    </View>

                    {/* Company Details */}
                    <Text style={styles.sectionTitle}>{t('company_details')}</Text>

                    <View style={styles.section}>
                        <Text style={styles.label}>{t('employee_count')}</Text>
                        <TouchableOpacity
                            style={styles.selectInput}
                            onPress={() => openDropdown('companyDetails.employeeCount', t('employee_count'), EMPLOYEE_COUNTS)}
                        >
                            <Text style={[styles.selectText, !formData.companyDetails.employeeCount && styles.placeholderText]}>
                                {formData.companyDetails.employeeCount || t('select_employee_count')}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>{t('website')}</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.companyDetails.website}
                            onChangeText={(text) => updateNestedField('companyDetails.website', text)}
                            placeholder={t('enter_website')}
                            placeholderTextColor={COLORS.textLight}
                            keyboardType="url"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>{t('founded_year')}</Text>
                        <TextInput
                            style={styles.input}
                            value={String(formData.companyDetails.foundedYear || '')}
                            onChangeText={(text) => updateNestedField('companyDetails.foundedYear', text)}
                            placeholder={t('founded_year_placeholder')}
                            placeholderTextColor={COLORS.textLight}
                            keyboardType="numeric"
                            maxLength={4}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>{t('description')}</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={formData.companyDetails.description}
                            onChangeText={(text) => updateNestedField('companyDetails.description', text)}
                            placeholder={t('company_description_placeholder')}
                            placeholderTextColor={COLORS.textLight}
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    {/* Contact Person */}
                    <Text style={styles.sectionTitle}>{t('contact_person')}</Text>

                    <View style={styles.section}>
                        <Text style={styles.label}>{t('full_name')}</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.companyDetails.contactPerson.name}
                            onChangeText={(text) => updateNestedField('companyDetails.contactPerson.name', text)}
                            placeholder={t('contact_person_name_placeholder')}
                            placeholderTextColor={COLORS.textLight}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>{t('designation')}</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.companyDetails.contactPerson.designation}
                            onChangeText={(text) => updateNestedField('companyDetails.contactPerson.designation', text)}
                            placeholder={t('enter_designation')}
                            placeholderTextColor={COLORS.textLight}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>{t('mobile')}</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.companyDetails.contactPerson.phone}
                            onChangeText={(text) => updateNestedField('companyDetails.contactPerson.phone', text)}
                            placeholder={t('contact_number_placeholder')}
                            placeholderTextColor={COLORS.textLight}
                            keyboardType="phone-pad"
                            maxLength={10}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>{t('email')}</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.companyDetails.contactPerson.email}
                            onChangeText={(text) => updateNestedField('companyDetails.contactPerson.email', text)}
                            placeholder={t('contact_email_placeholder')}
                            placeholderTextColor={COLORS.textLight}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    {/* Address */}
                    <Text style={styles.sectionTitle}>{t('location')}</Text>

                    <View style={styles.section}>
                        <Text style={styles.label}>{t('street')}</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.companyDetails.address.street}
                            onChangeText={(text) => updateNestedField('companyDetails.address.street', text)}
                            placeholder={t('street_placeholder')}
                            placeholderTextColor={COLORS.textLight}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.label}>{t('city')}</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.companyDetails.address.city}
                                onChangeText={(text) => updateNestedField('companyDetails.address.city', text)}
                                placeholder={t('city')}
                                placeholderTextColor={COLORS.textLight}
                            />
                        </View>

                        <View style={[styles.section, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.label}>{t('pincode')}</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.companyDetails.address.pincode}
                                onChangeText={(text) => updateNestedField('companyDetails.address.pincode', text)}
                                placeholder={t('pincode')}
                                placeholderTextColor={COLORS.textLight}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>{t('state')}</Text>
                        <TouchableOpacity
                            style={styles.selectInput}
                            onPress={() => openDropdown('companyDetails.address.state', t('state'), STATES)}
                        >
                            <Text style={[styles.selectText, !formData.companyDetails.address.state && styles.placeholderText]}>
                                {formData.companyDetails.address.state || t('select_state')}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
                        </TouchableOpacity>
                    </View>

                    {/* GST Number */}
                    <Text style={styles.sectionTitle}>{t('employer_details')}</Text>
                    <View style={styles.section}>
                        <Text style={styles.label}>{t('gst_number')}</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.gstNumber}
                            onChangeText={(text) => setFormData({ ...formData, gstNumber: text })}
                            placeholder={t('enter_gstin')}
                            placeholderTextColor={COLORS.textLight}
                            autoCapitalize="characters"
                        />
                    </View>
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                    <Button
                        title={saving ? t('saving') : t('save_changes')}
                        onPress={handleSave}
                        disabled={saving}
                        loading={saving}
                    />
                </View>

                {/* Selection Modal */}
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
                        <View style={styles.dropdownModal}>
                            <View style={styles.dropdownHeader}>
                                <Text style={styles.dropdownTitle}>{dropdownConfig.title}</Text>
                                <TouchableOpacity onPress={() => setDropdownVisible(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.text} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {dropdownConfig.items.map((item, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.dropdownItem}
                                        onPress={() => handleSelect(item)}
                                    >
                                        <Text style={[
                                            styles.dropdownItemText,
                                            (formData[dropdownConfig.key] === item ||
                                                (dropdownConfig.key.includes('.') &&
                                                    dropdownConfig.key.split('.').reduce((obj, key) => obj?.[key], formData) === item))
                                            && styles.dropdownItemTextSelected
                                        ]}>
                                            {item}
                                        </Text>
                                        {(formData[dropdownConfig.key] === item ||
                                            (dropdownConfig.key.includes('.') &&
                                                dropdownConfig.key.split('.').reduce((obj, key) => obj?.[key], formData) === item)) && (
                                                <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                                            )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Change Mobile Number with OTP Verification Modal */}
                <ChangeMobileModal
                    visible={showChangeMobileModal}
                    onClose={() => setShowChangeMobileModal(false)}
                    currentMobile={formData.mobile}
                    onSuccess={(newMobileNum) => {
                        setFormData((prev) => ({ ...prev, mobile: newMobileNum }));
                    }}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background || '#F8FAFC',
    },
    headerContainer: {
        backgroundColor: COLORS.primary || '#1976D2',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.08)',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
    },
    header: {
        height: 56,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    headerButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginTop: 8,
        marginBottom: 16,
    },
    section: {
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: COLORS.text,
    },
    selectInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        padding: 14,
    },
    selectText: {
        fontSize: 15,
        color: COLORS.text,
    },
    placeholderText: {
        color: COLORS.textLight,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
    },
    chipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    chipText: {
        fontSize: 13,
        color: COLORS.text,
        fontWeight: '500',
    },
    chipTextActive: {
        color: COLORS.white,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 4,
    },
    verifiedBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#15803D',
    },
    mobileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    mobileInputDisabled: {
        backgroundColor: '#F1F5F9',
        color: COLORS.text,
        fontWeight: '600',
    },
    changeMobileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 4,
    },
    changeMobileButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.primary || '#1976D2',
    },
    helperText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 12,
        marginTop: 2,
        lineHeight: 16,
    },
    footer: {
        padding: 16,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    dropdownModal: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        maxHeight: '60%',
        paddingBottom: 10,
    },
    dropdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    dropdownTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    dropdownItemText: {
        fontSize: 15,
        color: COLORS.text,
    },
    dropdownItemTextSelected: {
        color: COLORS.primary,
        fontWeight: '600',
    },
});
