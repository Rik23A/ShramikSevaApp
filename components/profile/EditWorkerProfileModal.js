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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, WORKER_TYPES, WORKER_SKILLS, INDIAN_STATES as STATES, QUALIFICATIONS, KNOWN_LANGUAGES } from '../../constants/config';
import { useLanguage } from '../../context/LanguageContext';
import Button from '../ui/Button';
import LocationPicker from '../LocationPicker';
import ChangeMobileModal from './ChangeMobileModal';

export default function EditWorkerProfileModal({ visible, onClose, profile, onSave }) {
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();
    const [showChangeMobileModal, setShowChangeMobileModal] = useState(false);
    const [formData, setFormData] = useState({
        name: profile?.name || '',
        mobile: profile?.mobile || '',
        email: profile?.email || '',
        gender: profile?.gender || '',
        age: profile?.age ? profile.age.toString() : '',
        qualification: profile?.qualification || '',
        languages: profile?.languages || [],
        location: profile?.locationName || '',
        city: profile?.city || '',
        state: profile?.state || '',
        coordinates: profile?.location?.coordinates ? {
            latitude: profile.location.coordinates[1],
            longitude: profile.location.coordinates[0]
        } : null,
        experience: profile?.experience?.toString() || '0',
        hourlyRate: profile?.hourlyRate?.toString() || '',
        isFresher: profile?.isFresher || false,
        skills: profile?.skills || [],
        workerType: profile?.workerType || [],
        expectedSalaryMin: profile?.expectedSalary?.min ? profile.expectedSalary.min.toString() : '',
        expectedSalaryMax: profile?.expectedSalary?.max ? profile.expectedSalary.max.toString() : '',
        expectedSalaryPeriod: profile?.expectedSalary?.period || 'monthly',
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
            Alert.alert(t('error_title'), t('validation_name_req'));
            return;
        }

        if (formData.age) {
            const ageNum = parseInt(formData.age);
            if (isNaN(ageNum) || ageNum < 14 || ageNum > 100) {
                Alert.alert(t('error_title'), t('age_required') || 'Valid age is required (14-100)');
                return;
            }
        }

        setSaving(true);
        try {
            const salaryPayload = (formData.expectedSalaryMin || formData.expectedSalaryMax) ? {
                min: parseFloat(formData.expectedSalaryMin) || 0,
                max: parseFloat(formData.expectedSalaryMax) || 0,
                currency: 'INR',
                period: formData.expectedSalaryPeriod || 'monthly'
            } : undefined;

            await onSave({
                ...formData,
                age: formData.age ? parseInt(formData.age) : undefined,
                qualification: formData.qualification || '',
                languages: formData.languages || [],
                experience: Math.max(0, parseInt(formData.experience) || 0),
                hourlyRate: parseInt(formData.hourlyRate) || 0,
                locationName: formData.location,
                city: formData.city,
                state: formData.state,
                coordinates: formData.coordinates,
                expectedSalary: salaryPayload
            });
            onClose();
        } catch (error) {
            Alert.alert(t('error_title'), t('profile_update_fail'));
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

                    {/* Gender & Age Row */}
                    <View style={styles.row}>
                        <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
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

                        <View style={[styles.section, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.label}>{`${t('age') || 'Age (Yrs)'} *`}</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.age}
                                onChangeText={(text) => setFormData({ ...formData, age: text.replace(/[^0-9]/g, '') })}
                                placeholder={t('enter_age') || 'e.g. 25'}
                                placeholderTextColor={COLORS.textLight}
                                keyboardType="numeric"
                                maxLength={2}
                            />
                        </View>
                    </View>

                    {/* Education / Qualification */}
                    <View style={styles.section}>
                        <Text style={styles.label}>{`${t('education_qualification') || t('qualification') || 'Education / Qualification'} *`}</Text>
                        <TouchableOpacity
                            style={styles.selectInput}
                            onPress={() => openDropdown('qualification', t('qualification') || 'Education / Qualification', QUALIFICATIONS, false)}
                        >
                            <Text style={[styles.selectText, !formData.qualification && styles.placeholderText]}>
                                {formData.qualification ? (t(formData.qualification.toLowerCase().replace(/ /g, '_')) || formData.qualification) : (t('select_qualification') || 'Select Qualification')}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
                        </TouchableOpacity>
                    </View>

                    {/* Languages Known */}
                    <View style={styles.section}>
                        <Text style={styles.label}>{`${t('languages_known') || 'Languages Known'} *`}</Text>
                        <TouchableOpacity
                            style={styles.selectInput}
                            onPress={() => openDropdown('languages', t('languages_known') || 'Languages Known', KNOWN_LANGUAGES, true)}
                        >
                            <Text style={[styles.selectText, (!formData.languages || formData.languages.length === 0) && styles.placeholderText]}>
                                {formData.languages && formData.languages.length > 0
                                    ? `${formData.languages.length} ${t('selected') || 'selected'}`
                                    : (t('select_languages') || 'Select Languages Known')}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
                        </TouchableOpacity>

                        {/* Selected Languages Chips */}
                        {formData.languages && formData.languages.length > 0 && (
                            <View style={styles.selectedLanguagesWrap}>
                                {formData.languages.map((lang, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.languageSelectChip}
                                        onPress={() => {
                                            setFormData({
                                                ...formData,
                                                languages: formData.languages.filter(l => l !== lang)
                                            });
                                        }}
                                    >
                                        <Text style={styles.languageSelectChipText}>{lang}</Text>
                                        <Ionicons name="close-circle" size={14} color={COLORS.primary} style={{ marginLeft: 4 }} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Bio */}
                    <View style={styles.section}>
                        <Text style={styles.label}>{t('about_me') || t('bio') || 'About Me'}</Text>
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

                    {/* Fresher Checkbox Option */}
                    <TouchableOpacity
                        style={styles.fresherCheckboxRow}
                        onPress={() => setFormData({
                            ...formData,
                            isFresher: !formData.isFresher,
                            experience: !formData.isFresher ? '0' : (formData.experience === '0' ? '' : formData.experience)
                        })}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.customCheckbox, formData.isFresher && styles.customCheckboxChecked]}>
                            {formData.isFresher && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                        </View>
                        <Text style={styles.fresherCheckboxLabel}>
                            {t('fresher_label') || 'I am a Fresher (No prior work experience)'}
                        </Text>
                    </TouchableOpacity>

                    {/* Experience & Hourly Rate */}
                    <View style={styles.row}>
                        <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.label}>{t('experience') || 'Experience (Yrs)'}</Text>
                            {!formData.isFresher ? (
                                <TextInput
                                    style={styles.input}
                                    value={formData.experience}
                                    onChangeText={(text) => setFormData({ ...formData, experience: text.replace(/[^0-9.]/g, '') })}
                                    placeholder={t('enter_experience') || 'e.g. 2'}
                                    placeholderTextColor={COLORS.textLight}
                                    keyboardType="numeric"
                                    maxLength={4}
                                />
                            ) : (
                                <View style={styles.fresherBadgeContainer}>
                                    <Ionicons name="school-outline" size={18} color={COLORS.primary} />
                                    <Text style={styles.fresherBadgeText}>{t('fresher') || 'Fresher'}</Text>
                                </View>
                            )}
                        </View>

                        <View style={[styles.section, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.label}>{t('hourly_rate') || 'Hourly Rate (₹)'}</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.hourlyRate}
                                onChangeText={(text) => setFormData({ ...formData, hourlyRate: text })}
                                placeholder={t('enter_hourly_rate') || 'e.g. 150'}
                                placeholderTextColor={COLORS.textLight}
                                keyboardType="numeric"
                                maxLength={5}
                            />
                        </View>
                    </View>

                    {/* Expected Salary Range */}
                    <View style={styles.section}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={styles.label}>{t('expected_salary_range') || 'Expected Salary Range (₹)'}</Text>
                            <View style={{ flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 8, padding: 2 }}>
                                <TouchableOpacity
                                    style={[{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 }, formData.expectedSalaryPeriod === 'monthly' && { backgroundColor: COLORS.primary || '#1976D2' }]}
                                    onPress={() => setFormData({ ...formData, expectedSalaryPeriod: 'monthly' })}
                                >
                                    <Text style={[{ fontSize: 12, fontWeight: '600', color: COLORS.textSecondary || '#64748B' }, formData.expectedSalaryPeriod === 'monthly' && { color: '#FFFFFF' }]}>
                                        {t('monthly') || 'Monthly'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 }, formData.expectedSalaryPeriod === 'daily' && { backgroundColor: COLORS.primary || '#1976D2' }]}
                                    onPress={() => setFormData({ ...formData, expectedSalaryPeriod: 'daily' })}
                                >
                                    <Text style={[{ fontSize: 12, fontWeight: '600', color: COLORS.textSecondary || '#64748B' }, formData.expectedSalaryPeriod === 'daily' && { color: '#FFFFFF' }]}>
                                        {t('daily') || 'Daily'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <TextInput
                                    style={styles.input}
                                    value={formData.expectedSalaryMin}
                                    onChangeText={(text) => setFormData({ ...formData, expectedSalaryMin: text.replace(/[^0-9]/g, '') })}
                                    placeholder={formData.expectedSalaryPeriod === 'monthly' ? 'Min (e.g. 15000)' : 'Min (e.g. 500)'}
                                    placeholderTextColor={COLORS.textLight}
                                    keyboardType="numeric"
                                    maxLength={7}
                                />
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <TextInput
                                    style={styles.input}
                                    value={formData.expectedSalaryMax}
                                    onChangeText={(text) => setFormData({ ...formData, expectedSalaryMax: text.replace(/[^0-9]/g, '') })}
                                    placeholder={formData.expectedSalaryPeriod === 'monthly' ? 'Max (e.g. 25000)' : 'Max (e.g. 900)'}
                                    placeholderTextColor={COLORS.textLight}
                                    keyboardType="numeric"
                                    maxLength={7}
                                />
                            </View>
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

                    {/* Location Selection */}
                    <View style={styles.section}>
                        <LocationPicker
                            label={t('city_state') || 'Location (City/State)'}
                            placeholder={t('current_location_placeholder') || 'e.g., Kolkata, West Bengal'}
                            value={formData.location}
                            onChangeLocation={(text, coords, place) => {
                                const parts = text ? text.split(',').map(p => p.trim()).filter(Boolean) : [];
                                const detectedCity = place?.city || (parts.length > 0 ? parts[0] : '');
                                const detectedState = place?.state || (parts.length > 1 ? parts[1] : '');

                                setFormData(prev => ({
                                    ...prev,
                                    location: text,
                                    city: detectedCity,
                                    state: detectedState,
                                    coordinates: coords || prev.coordinates || null,
                                }));
                            }}
                        />
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

                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
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
    fresherCheckboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
        marginTop: 2,
        paddingHorizontal: 2,
    },
    customCheckbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    customCheckboxChecked: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    fresherCheckboxLabel: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
    fresherBadgeContainer: {
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
        borderRadius: 12,
        paddingHorizontal: 14,
        gap: 8,
    },
    fresherBadgeText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
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
    selectedLanguagesWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 8,
    },
    languageSelectChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    languageSelectChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary || '#1976D2',
    },
});
