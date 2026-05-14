import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';

const AvailabilityModal = ({ visible, onClose, onSelect, currentAvailability, t }) => {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('availability_status') || 'Availability Status'}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.descriptionText}>
                        {t('availability_desc') || 'Let employers know if you are currently available to take on new jobs.'}
                    </Text>

                    <View style={styles.optionsContainer}>
                        <TouchableOpacity
                            style={[
                                styles.optionCard,
                                currentAvailability === 'available' && styles.selectedOption
                            ]}
                            onPress={() => onSelect('available')}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
                                <Ionicons name="checkmark-circle" size={28} color={COLORS.success} />
                            </View>
                            <View style={styles.optionTextContainer}>
                                <Text style={styles.optionTitle}>{t('available')}</Text>
                                <Text style={styles.optionSub}>{t('available_sub') || 'I am ready for work'}</Text>
                            </View>
                            {currentAvailability === 'available' && (
                                <Ionicons name="radio-button-on" size={24} color={COLORS.primary} style={styles.radioIcon} />
                            )}
                            {currentAvailability !== 'available' && (
                                <Ionicons name="radio-button-off" size={24} color={COLORS.textSecondary} style={styles.radioIcon} />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.optionCard,
                                currentAvailability === 'unavailable' && styles.selectedOption
                            ]}
                            onPress={() => onSelect('unavailable')}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: '#FFEBEE' }]}>
                                <Ionicons name="close-circle" size={28} color={COLORS.danger} />
                            </View>
                            <View style={styles.optionTextContainer}>
                                <Text style={styles.optionTitle}>{t('unavailable')}</Text>
                                <Text style={styles.optionSub}>{t('unavailable_sub') || 'I am not taking new jobs'}</Text>
                            </View>
                            {currentAvailability === 'unavailable' && (
                                <Ionicons name="radio-button-on" size={24} color={COLORS.primary} style={styles.radioIcon} />
                            )}
                            {currentAvailability !== 'unavailable' && (
                                <Ionicons name="radio-button-off" size={24} color={COLORS.textSecondary} style={styles.radioIcon} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

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
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
    },
    closeButton: {
        padding: 4,
    },
    descriptionText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 24,
        lineHeight: 20,
    },
    optionsContainer: {
        gap: 16,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
    },
    selectedOption: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryLight + '10',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    optionTextContainer: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    optionSub: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    radioIcon: {
        marginLeft: 16,
    },
});

export default AvailabilityModal;
