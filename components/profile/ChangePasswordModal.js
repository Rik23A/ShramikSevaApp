import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import { useLanguage } from '../../context/LanguageContext';
import { changePassword } from '../../services/userService';
import Button from '../ui/Button';

export default function ChangePasswordModal({ visible, onClose }) {
    const { t } = useLanguage();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSave = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert(t('error_title') || 'Error', t('fill_all_fields') || 'Please fill all fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert(t('error_title') || 'Error', t('passwords_do_not_match') || 'Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert(t('error_title') || 'Error', t('password_too_short') || 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await changePassword(newPassword);
            Alert.alert(t('success') || 'Success', t('password_updated_success') || 'Password updated successfully');
            resetForm();
            onClose();
        } catch (error) {
            console.error('Failed to change password:', error);
            Alert.alert(
                t('error_title') || 'Error', 
                error?.response?.data?.message || t('failed_to_update_password') || 'Failed to update password'
            );
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setNewPassword('');
        setConfirmPassword('');
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('change_password') || 'Change Password'}</Text>
                        <TouchableOpacity onPress={onClose} disabled={loading}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.form}>
                        {/* New Password */}
                        <Text style={styles.label}>{t('new_password') || 'New Password'}</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry={!showNewPassword}
                                placeholder={t('enter_new_password') || 'Enter new password'}
                                placeholderTextColor={COLORS.textSecondary}
                            />
                            <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
                                <Ionicons name={showNewPassword ? "eye-off" : "eye"} size={20} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Confirm Password */}
                        <Text style={styles.label}>{t('confirm_password') || 'Confirm New Password'}</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirmPassword}
                                placeholder={t('confirm_new_password') || 'Confirm new password'}
                                placeholderTextColor={COLORS.textSecondary}
                            />
                            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                                <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Button
                            title={t('save_changes') || 'Save Changes'}
                            onPress={handleSave}
                            loading={loading}
                            style={styles.saveButton}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
    },
    form: {
        gap: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        backgroundColor: COLORS.background,
        paddingHorizontal: 12,
    },
    input: {
        flex: 1,
        height: 48,
        fontSize: 16,
        color: COLORS.text,
    },
    eyeIcon: {
        padding: 8,
    },
    saveButton: {
        marginTop: 12,
    },
});
