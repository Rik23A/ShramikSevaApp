import React, { useState } from 'react';
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
import { COLORS, BUSINESS_TYPES, EMPLOYEE_COUNTS, INDIAN_STATES as STATES } from '../../constants/config';
import { useLanguage } from '../../context/LanguageContext';
import Button from '../ui/Button';

export default function EditEmployerProfileModal({ visible, onClose, profile, onSave }) {
    const { t } = useLanguage();
    const [formData, setFormData] = useState({
        name: profile?.name || '',
        companyName: profile?.companyName || '',
        email: profile?.email || '',
        businessType: profile?.businessType || '',
        companyDetails: {
            employeeCount: profile?.companyDetails?.employeeCount || '',
            website: profile?.companyDetails?.website || '',
            description: profile?.companyDetails?.description || '',
            foundedYear: profile?.companyDetails?.foundedYear || '',
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
        gender: profile?.gender || '',
        bio: profile?.bio || '',
    });

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
            Alert.alert('Error', 'Name and Company Name are required');
            return;
        }

        // Validate Contact Person Phone
        const phone = formData.companyDetails?.contactPerson?.phone;
        if (phone && !/^[6-9]\d{9}$/.test(phone)) {
            Alert.alert('Error', 'Invalid contact person phone number');
            return;
        }

        // Validate Contact Person Email
        const email = formData.companyDetails?.contactPerson?.email;
        if (email && !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
            Alert.alert('Error', 'Invalid contact person email address');
            return;
        }

        setSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            Alert.alert('Error', 'Failed to update profile');
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
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={28} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('edit_profile')}</Text>
                    <View style={{ width: 28 }} />
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

                    <View style={styles.section}>
                        <Text style={styles.label}>{t('gender')}</Text>
                        <View style={styles.chipsContainer}>
                            {['male', 'female', 'other'].map((g) => (
                                <TouchableOpacity
                                    key={g}
                                    style={[
                                        styles.chip,
                                        formData.gender === g && styles.chipActive,
                                    ]}
                                    onPress={() => setFormData({ ...formData, gender: g })}
                                >
                                    <Text
                                        style={[
                                            styles.chipText,
                                            formData.gender === g && styles.chipTextActive,
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
                            placeholder={t('bio_placeholder') || 'Tell us about yourself...'}
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
                        <Text style={styles.label}>{t('mobile')}</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.mobile}
                            onChangeText={(text) => setFormData({ ...formData, mobile: text })}
                            placeholder={t('mobile_placeholder') || 'Owner mobile number'}
                            placeholderTextColor={COLORS.textLight}
                            keyboardType="phone-pad"
                            maxLength={10}
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
                                {formData.companyDetails.employeeCount || t('select_employee_count') || 'Select employee count'}
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
                            placeholder={t('founded_year_placeholder') || 'e.g., 2010'}
                            placeholderTextColor={COLORS.textLight}
                            keyboardType="numeric"
                            maxLength={4}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>{t('description') || 'Description'}</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={formData.companyDetails.description}
                            onChangeText={(text) => updateNestedField('companyDetails.description', text)}
                            placeholder={t('company_description_placeholder') || 'Tell us about your company...'}
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
                            placeholder={t('contact_person_name_placeholder') || 'Contact person name'}
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
                            placeholder={t('contact_number_placeholder') || 'Contact number'}
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
                            placeholder={t('contact_email_placeholder') || 'Contact email'}
                            placeholderTextColor={COLORS.textLight}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    {/* Address */}
                    <Text style={styles.sectionTitle}>{t('location')}</Text>

                    <View style={styles.section}>
                        <Text style={styles.label}>{t('street') || 'Street'}</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.companyDetails.address.street}
                            onChangeText={(text) => updateNestedField('companyDetails.address.street', text)}
                            placeholder={t('street_placeholder') || 'Street address'}
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

                <View style={styles.footer}>
                    <Button
                        title={saving ? (t('saving') || 'Saving...') : (t('save_changes') || 'Save Changes')}
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
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
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
