import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import { createRating } from '../../services/ratingService';
import { useLanguage } from '../../context/LanguageContext';

const RatingModal = ({ visible, prompt, onClose, onSuccess }) => {
    const { t } = useLanguage();
    const [rating, setRating] = useState(0);
    const [review, setReview] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!prompt) return null;

    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert(t('error'), t('select_rating_stars')); // Ensure these keys exist or use fallback
            return;
        }

        setSubmitting(true);
        try {
            await createRating({
                job: prompt.jobId,
                user: prompt.userIdToRate,
                rating,
                review,
            });
            Alert.alert(t('success'), t('rating_submitted_success'));
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Rating submission failed:', error);
            Alert.alert(t('error'), t('rating_submission_failed'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="star" size={32} color={COLORS.warning} />
                        </View>
                        <Text style={styles.title}>{t('rate_experience')}</Text>
                        <Text style={styles.subtitle}>
                            {t('how_was_working_with')} <Text style={styles.highlight}>{prompt.userNameToRate}</Text>?
                        </Text>
                        <Text style={styles.jobTitle}>{prompt.jobTitle}</Text>
                    </View>

                    <View style={styles.starsContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity
                                key={star}
                                onPress={() => setRating(star)}
                                style={styles.starButton}
                            >
                                <Ionicons
                                    name={rating >= star ? "star" : "star-outline"}
                                    size={40}
                                    color={COLORS.warning}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('write_review')} ({t('optional')})</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t('share_your_experience')}
                            placeholderTextColor={COLORS.textSecondary}
                            multiline
                            numberOfLines={4}
                            value={review}
                            onChangeText={setReview}
                            textAlignVertical="top"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, submitting && styles.disabledButton]}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color={COLORS.white} />
                        ) : (
                            <Text style={styles.submitButtonText}>{t('submit_rating')}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: COLORS.background,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1,
        padding: 8,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 4,
    },
    highlight: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    jobTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
        backgroundColor: COLORS.card,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 8,
        overflow: 'hidden',
    },
    starsContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 24,
    },
    inputContainer: {
        width: '100%',
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        height: 120,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: COLORS.border,
        fontSize: 14,
    },
    submitButton: {
        width: '100%',
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    disabledButton: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '700',
    },
});

export default RatingModal;
