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
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, WORKER_TYPES, WORKER_SKILLS, INDIAN_STATES as STATES } from '../../constants/config';
import { useLanguage } from '../../context/LanguageContext';
import Button from '../ui/Button';

export default function EditWorkerProfileModal({ visible, onClose, profile, onSave }) {
    const { t } = useLanguage();
    const [formData, setFormData] = useState({
        name: profile?.name || '',
        mobile: profile?.mobile || '',
        email: profile?.email || '',
        gender: profile?.gender || '',
        location: profile?.locationName || '',
        experience: profile?.experience?.toString() || '0',
        hourlyRate: profile?.hourlyRate?.toString() || '',
        isFresher: profile?.isFresher || false,
        skills: profile?.skills || [],
        workerType: profile?.workerType || [],
        bio: profile?.bio || '',
        bankDetails: {
            bankName: profile?.bankDetails?.bankName || '',
            accountNumber: profile?.bankDetails?.accountNumber || '',
            ifscCode: profile?.bankDetails?.ifscCode || '',
        },
    });

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
            if (key === 'workerType') {
                // When worker type changes (single select), reset skills or filter them
                // For simplicity and matching backend, workerType is still saved as an array [type]
                setFormData(prev => ({
                    ...prev,
                    workerType: [item],
                    skills: prev.skills.filter(s => (WORKER_SKILLS[item] || []).includes(s))
                }));
            } else if (key.includes('.')) {
                updateNestedField(key, item);
            } else {
                setFormData({ ...formData, [key]: item });
            }
            setDropdownVisible(false);
        }
    };
    const [saving, setSaving] = useState(false);
    const [newSkill, setNewSkill] = useState('');

    const handleSave = async () => {
        if (!formData.name.trim()) {
            Alert.alert('Error', 'Name is required');
            return;
        }

        setSaving(true);
        try {
            await onSave({
                ...formData,
                experience: parseInt(formData.experience) || 0,
                hourlyRate: parseInt(formData.hourlyRate) || 0,
                locationName: formData.location // Ensure it maps to locationName
            });
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

    const addSkill = () => {
        if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
            setFormData({
                ...formData,
                skills: [...formData.skills, newSkill.trim()],
            });
            setNewSkill('');
        }
    };

    const removeSkill = (skill) => {
        setFormData({
            ...formData,
            skills: formData.skills.filter(s => s !== skill),
        });
    };

    const toggleWorkerType = (type) => {
        const types = formData.workerType.includes(type)
            ? formData.workerType.filter(t => t !== type)
            : [...formData.workerType, type];
        setFormData({ ...formData, workerType: types });
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
                    {/* Personal Information Section */}
                    <Text style={[styles.label, styles.sectionTitle]}>{t('personal_info')}</Text>

                    {/* Name */}
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

                    {/* Mobile */}
                    <View style={styles.section}>
                        <Text style={styles.label}>{t('mobile')} *</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.mobile}
                            onChangeText={(text) => setFormData({ ...formData, mobile: text })}
                            placeholder={t('enter_mobile_placeholder')}
                            placeholderTextColor={COLORS.textLight}
                            keyboardType="phone-pad"
                            maxLength={10}
                        />
                    </View>

                    {/* Email */}
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

                    {/* Gender */}
                    <View style={styles.section}>
                        <Text style={styles.label}>{t('gender')}</Text>
                        <TouchableOpacity
                            style={styles.selectInput}
                            onPress={() => openDropdown('gender', t('gender'), ['male', 'female', 'other'], false)}
                        >
                            <Text style={[styles.selectText, !formData.gender && styles.placeholderText]}>
                                {formData.gender ? t(formData.gender) : t('select_gender')}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
                        </TouchableOpacity>
                    </View>

                    {/* Location */}
                    <View style={styles.section}>
                        <Text style={styles.label}>{t('location') || 'Location'}</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.location}
                            onChangeText={(text) => setFormData({ ...formData, location: text })}
                            placeholder={t('enter_location_area')}
                            placeholderTextColor={COLORS.textLight}
                        />
                    </View>

                    {/* Bio */}
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

                    {/* Experience & Hourly Rate */}
                    <View style={styles.row}>
                        <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.label}>{t('experience')}</Text>
                            <View style={styles.experienceRow}>
                                <TouchableOpacity
                                    style={[styles.fresherButton, formData.isFresher && styles.fresherButtonActive]}
                                    onPress={() => setFormData({ ...formData, isFresher: !formData.isFresher })}
                                >
                                    <Ionicons
                                        name={formData.isFresher ? 'checkbox' : 'square-outline'}
                                        size={18}
                                        color={formData.isFresher ? COLORS.primary : COLORS.textSecondary}
                                    />
                                    <Text style={[styles.fresherText, formData.isFresher && styles.fresherTextActive]}>
                                        {t('fresher') || "Fresher"}
                                    </Text>
                                </TouchableOpacity>
                                {!formData.isFresher && (
                                    <TextInput
                                        style={[styles.input, styles.experienceInput]}
                                        value={formData.experience}
                                        onChangeText={(text) => setFormData({ ...formData, experience: text })}
                                        placeholder={t('enter_experience')}
                                        placeholderTextColor={COLORS.textLight}
                                        keyboardType="numeric"
                                        maxLength={2}
                                    />
                                )}
                            </View>
                        </View>

                        <View style={[styles.section, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.label}>{t('hourly_rate') || 'Hourly Rate (₹)'}</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.hourlyRate}
                                onChangeText={(text) => setFormData({ ...formData, hourlyRate: text })}
                                placeholder={t('enter_hourly_rate')}
                                placeholderTextColor={COLORS.textLight}
                                keyboardType="numeric"
                                maxLength={5}
                            />
                        </View>
                    </View>

                    {/* Professional Details Section */}
                    <Text style={[styles.label, styles.sectionTitle, { marginTop: 16 }]}>{t('professional_details')}</Text>

                    {/* Worker Type */}
                    <View style={styles.section}>
                        <Text style={styles.label}>{t('worker_type')}</Text>
                        <TouchableOpacity
                            style={styles.selectInput}
                            onPress={() => openDropdown('workerType', t('worker_type'), WORKER_TYPES, false)}
                        >
                            <Text style={[styles.selectText, !formData.workerType[0] && styles.placeholderText]}>
                                {formData.workerType[0] || t('select_worker_type') || 'Select worker type'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
                        </TouchableOpacity>
                    </View>

                    {/* Skills Selection */}
                    <View style={styles.section}>
                        <Text style={styles.label}>{t('skills')}</Text>
                        <TouchableOpacity
                            style={styles.selectInput}
                            disabled={!formData.workerType[0]}
                            onPress={() => {
                                const type = formData.workerType[0];
                                const availableSkills = WORKER_SKILLS[type] || [];
                                openDropdown('skills', t('skills'), availableSkills, true);
                            }}
                        >
                            <Text
                                style={[
                                    styles.selectText,
                                    formData.skills.length === 0 && styles.placeholderText,
                                    !formData.workerType[0] && { color: COLORS.textLight + '50' }
                                ]}
                                numberOfLines={1}
                            >
                                {formData.skills.length > 0
                                    ? formData.skills.join(', ')
                                    : !formData.workerType[0]
                                        ? 'Select worker type first'
                                        : t('select_skills') || 'Select skills'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={!formData.workerType[0] ? COLORS.textLight + '50' : COLORS.textLight} />
                        </TouchableOpacity>

                        {/* Selected Skills Pills (only for visual feedback in the form) */}
                        <View style={styles.skillsContainer}>
                            {formData.skills.map((skill, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.skillChip, styles.skillChipActive]}
                                >
                                    <Text style={styles.skillChipTextActive}>{skill}</Text>
                                    <Ionicons
                                        name="close-circle"
                                        size={16}
                                        color={COLORS.white}
                                        onPress={() => removeSkill(skill)}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Bank Details Section */}
                    <Text style={[styles.label, styles.sectionTitle, { marginTop: 16 }]}>{t('bank_details')}</Text>

                    <View style={styles.section}>
                        <Text style={styles.label}>{t('bank_name')}</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.bankDetails.bankName}
                            onChangeText={(text) => updateNestedField('bankDetails.bankName', text)}
                            placeholder={t('bank_name')}
                            placeholderTextColor={COLORS.textLight}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>{t('account_number')}</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.bankDetails.accountNumber}
                            onChangeText={(text) => updateNestedField('bankDetails.accountNumber', text)}
                            placeholder={t('account_number')}
                            placeholderTextColor={COLORS.textLight}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>{t('ifsc_code')}</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.bankDetails.ifscCode}
                            onChangeText={(text) => updateNestedField('bankDetails.ifscCode', text)}
                            placeholder={t('ifsc_code')}
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
                                {dropdownConfig.items.map((item, index) => {
                                    const isSelected = dropdownConfig.multiSelect
                                        ? (formData[dropdownConfig.key] || []).includes(item)
                                        : (dropdownConfig.key === 'workerType'
                                            ? formData.workerType[0] === item
                                            : formData[dropdownConfig.key] === item);

                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.dropdownItem}
                                            onPress={() => handleSelect(item)}
                                        >
                                            <Text style={[
                                                styles.dropdownItemText,
                                                isSelected && styles.dropdownItemTextSelected
                                            ]}>
                                                {item}
                                            </Text>
                                            {isSelected && (
                                                <Ionicons
                                                    name={dropdownConfig.multiSelect ? "checkbox" : "checkmark"}
                                                    size={20}
                                                    color={COLORS.primary}
                                                />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
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
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.primary,
        marginBottom: 16,
        marginTop: 8,
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
    row: {
        flexDirection: 'row',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    experienceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    fresherButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
        flex: 1,
    },
    fresherButtonActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryLight + '20',
    },
    fresherText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    fresherTextActive: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    experienceInput: {
        flex: 1,
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
    skillInputRow: {
        flexDirection: 'row',
        gap: 8,
    },
    skillInput: {
        flex: 1,
    },
    addButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    skillChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: 8,
        marginBottom: 8,
    },
    skillChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    skillChipText: {
        fontSize: 13,
        color: COLORS.text,
    },
    skillChipTextActive: {
        color: COLORS.white,
        fontWeight: '600',
    },
    skillGroup: {
        marginTop: 12,
        marginBottom: 8,
    },
    skillGroupTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 8,
    },
    helperText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 12,
        marginTop: -4,
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
