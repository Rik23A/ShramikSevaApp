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
import { COLORS, BUSINESS_TYPES, INDIAN_STATES as STATES } from '../../constants/config';
import Button from '../ui/Button';

export default function EditEmployerProfileModal({ visible, onClose, profile, onSave }) {
    const [formData, setFormData] = useState({
        name: profile?.name || '',
        companyName: profile?.companyName || '',
        email: profile?.email || '',
        businessType: profile?.businessType || '',
        companyDetails: {
            employeeCount: profile?.companyDetails?.employeeCount || '',
            website: profile?.companyDetails?.website || '',
            description: profile?.companyDetails?.description || '',
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
    });
    const [saving, setSaving] = useState(false);

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
                    <Text style={styles.headerTitle}>Edit Company Profile</Text>
                    <View style={{ width: 28 }} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Basic Info */}
                    <Text style={styles.sectionTitle}>Basic Information</Text>

                    <View style={styles.section}>
                        <Text style={styles.label}>Owner Name *</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.name}
                            onChangeText={(text) => setFormData({ ...formData, name: text })}
                            placeholder="Enter owner name"
                            placeholderTextColor={COLORS.textLight}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Company Name *</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.companyName}
                            onChangeText={(text) => setFormData({ ...formData, companyName: text })}
                            placeholder="Enter company name"
                            placeholderTextColor={COLORS.textLight}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.email}
                            onChangeText={(text) => setFormData({ ...formData, email: text })}
                            placeholder="company@example.com"
                            placeholderTextColor={COLORS.textLight}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Business Type</Text>
                        <View style={styles.chipsContainer}>
                            {BUSINESS_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.chip,
                                        formData.businessType === type && styles.chipActive,
                                    ]}
                                    onPress={() => setFormData({ ...formData, businessType: type })}
                                >
                                    <Text
                                        style={[
                                            styles.chipText,
                                            formData.businessType === type && styles.chipTextActive,
                                        ]}
                                    >
                                        {type}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Company Details */}
                    <Text style={styles.sectionTitle}>Company Details</Text>

                    <View style={styles.section}>
                        <Text style={styles.label}>Employee Count</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.companyDetails.employeeCount}
                            onChangeText={(text) => updateNestedField('companyDetails.employeeCount', text)}
                            placeholder="e.g., 10-50"
                            placeholderTextColor={COLORS.textLight}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Website</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.companyDetails.website}
                            onChangeText={(text) => updateNestedField('companyDetails.website', text)}
                            placeholder="https://example.com"
                            placeholderTextColor={COLORS.textLight}
                            keyboardType="url"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={formData.companyDetails.description}
                            onChangeText={(text) => updateNestedField('companyDetails.description', text)}
                            placeholder="Tell us about your company..."
                            placeholderTextColor={COLORS.textLight}
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    {/* Contact Person */}
                    <Text style={styles.sectionTitle}>Contact Person</Text>

                    <View style={styles.section}>
                        <Text style={styles.label}>Name</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.companyDetails.contactPerson.name}
                            onChangeText={(text) => updateNestedField('companyDetails.contactPerson.name', text)}
                            placeholder="Contact person name"
                            placeholderTextColor={COLORS.textLight}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Designation</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.companyDetails.contactPerson.designation}
                            onChangeText={(text) => updateNestedField('companyDetails.contactPerson.designation', text)}
                            placeholder="e.g., HR Manager"
                            placeholderTextColor={COLORS.textLight}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Phone</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.companyDetails.contactPerson.phone}
                            onChangeText={(text) => updateNestedField('companyDetails.contactPerson.phone', text)}
                            placeholder="Contact number"
                            placeholderTextColor={COLORS.textLight}
                            keyboardType="phone-pad"
                            maxLength={10}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.companyDetails.contactPerson.email}
                            onChangeText={(text) => updateNestedField('companyDetails.contactPerson.email', text)}
                            placeholder="Contact email"
                            placeholderTextColor={COLORS.textLight}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    {/* Address */}
                    <Text style={styles.sectionTitle}>Address</Text>

                    <View style={styles.section}>
                        <Text style={styles.label}>Street</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.companyDetails.address.street}
                            onChangeText={(text) => updateNestedField('companyDetails.address.street', text)}
                            placeholder="Street address"
                            placeholderTextColor={COLORS.textLight}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.label}>City</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.companyDetails.address.city}
                                onChangeText={(text) => updateNestedField('companyDetails.address.city', text)}
                                placeholder="City"
                                placeholderTextColor={COLORS.textLight}
                            />
                        </View>

                        <View style={[styles.section, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.label}>Pincode</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.companyDetails.address.pincode}
                                onChangeText={(text) => updateNestedField('companyDetails.address.pincode', text)}
                                placeholder="Pincode"
                                placeholderTextColor={COLORS.textLight}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>State</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.chipsContainer}>
                                {STATES.slice(0, 10).map((state) => (
                                    <TouchableOpacity
                                        key={state}
                                        style={[
                                            styles.chip,
                                            formData.companyDetails.address.state === state && styles.chipActive,
                                        ]}
                                        onPress={() => updateNestedField('companyDetails.address.state', state)}
                                    >
                                        <Text
                                            style={[
                                                styles.chipText,
                                                formData.companyDetails.address.state === state && styles.chipTextActive,
                                            ]}
                                        >
                                            {state}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <Button
                        title={saving ? 'Saving...' : 'Save Changes'}
                        onPress={handleSave}
                        disabled={saving}
                        loading={saving}
                    />
                </View>
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
});
