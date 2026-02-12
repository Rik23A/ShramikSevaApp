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
import { COLORS, WORKER_TYPES } from '../../constants/config';
import Button from '../ui/Button';

export default function EditWorkerProfileModal({ visible, onClose, profile, onSave }) {
    const [formData, setFormData] = useState({
        name: profile?.name || '',
        email: profile?.email || '',
        location: profile?.location || '',
        experience: profile?.experience?.toString() || '0',
        isFresher: profile?.isFresher || false,
        skills: profile?.skills || [],
        workerType: profile?.workerType || [],
        bio: profile?.bio || '',
    });
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
            });
            onClose();
        } catch (error) {
            Alert.alert('Error', 'Failed to update profile');
        } finally {
            setSaving(false);
        }
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
                    <Text style={styles.headerTitle}>Edit Profile</Text>
                    <View style={{ width: 28 }} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Name */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Name *</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.name}
                            onChangeText={(text) => setFormData({ ...formData, name: text })}
                            placeholder="Enter your name"
                            placeholderTextColor={COLORS.textLight}
                        />
                    </View>

                    {/* Email */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.email}
                            onChangeText={(text) => setFormData({ ...formData, email: text })}
                            placeholder="Enter your email"
                            placeholderTextColor={COLORS.textLight}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    {/* Location */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Location</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.location}
                            onChangeText={(text) => setFormData({ ...formData, location: text })}
                            placeholder="City, State"
                            placeholderTextColor={COLORS.textLight}
                        />
                    </View>

                    {/* Bio */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Bio</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={formData.bio}
                            onChangeText={(text) => setFormData({ ...formData, bio: text })}
                            placeholder="Tell us about yourself..."
                            placeholderTextColor={COLORS.textLight}
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    {/* Experience */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Experience</Text>
                        <View style={styles.experienceRow}>
                            <TouchableOpacity
                                style={[styles.fresherButton, formData.isFresher && styles.fresherButtonActive]}
                                onPress={() => setFormData({ ...formData, isFresher: !formData.isFresher })}
                            >
                                <Ionicons
                                    name={formData.isFresher ? 'checkbox' : 'square-outline'}
                                    size={20}
                                    color={formData.isFresher ? COLORS.primary : COLORS.textSecondary}
                                />
                                <Text style={[styles.fresherText, formData.isFresher && styles.fresherTextActive]}>
                                    I'm a fresher
                                </Text>
                            </TouchableOpacity>
                            {!formData.isFresher && (
                                <TextInput
                                    style={[styles.input, styles.experienceInput]}
                                    value={formData.experience}
                                    onChangeText={(text) => setFormData({ ...formData, experience: text })}
                                    placeholder="Years"
                                    placeholderTextColor={COLORS.textLight}
                                    keyboardType="numeric"
                                />
                            )}
                        </View>
                    </View>

                    {/* Worker Types */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Worker Type</Text>
                        <View style={styles.chipsContainer}>
                            {WORKER_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.chip,
                                        formData.workerType.includes(type) && styles.chipActive,
                                    ]}
                                    onPress={() => toggleWorkerType(type)}
                                >
                                    <Text
                                        style={[
                                            styles.chipText,
                                            formData.workerType.includes(type) && styles.chipTextActive,
                                        ]}
                                    >
                                        {type}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Skills */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Skills</Text>
                        <View style={styles.skillInputRow}>
                            <TextInput
                                style={[styles.input, styles.skillInput]}
                                value={newSkill}
                                onChangeText={setNewSkill}
                                placeholder="Add a skill"
                                placeholderTextColor={COLORS.textLight}
                                onSubmitEditing={addSkill}
                            />
                            <TouchableOpacity style={styles.addButton} onPress={addSkill}>
                                <Ionicons name="add" size={24} color={COLORS.white} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.skillsContainer}>
                            {formData.skills.map((skill, index) => (
                                <View key={index} style={styles.skillChip}>
                                    <Text style={styles.skillChipText}>{skill}</Text>
                                    <TouchableOpacity onPress={() => removeSkill(skill)}>
                                        <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
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
    section: {
        marginBottom: 24,
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
        borderRadius: 16,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    skillChipText: {
        fontSize: 13,
        color: COLORS.text,
    },
    footer: {
        padding: 16,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
});
