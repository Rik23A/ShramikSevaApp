import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/config';
import { useAuth } from '../context/AuthContext';
import { calculateProfileCompletion } from '../utils/profileCompletion';
import { useLanguage } from '../context/LanguageContext';

const PROMPT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours cooldown
const STORAGE_KEY = 'last_profile_prompt_timestamp';

export default function ProfileCompletionModal() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [visible, setVisible] = useState(false);
    const [fadeAnim] = useState(new Animated.Value(0));

    const completion = calculateProfileCompletion(user);
    const isWorker = user?.role === 'worker';

    useEffect(() => {
        checkShouldPrompt();
    }, [user]);

    const checkShouldPrompt = async () => {
        if (!user || completion.isComplete || completion.percentage === 100) {
            setVisible(false);
            return;
        }

        try {
            const lastPromptStr = await AsyncStorage.getItem(STORAGE_KEY);
            const now = Date.now();

            if (!lastPromptStr) {
                // First time: prompt user after brief 1.2s delay for pleasant UX
                setTimeout(() => openModal(), 1200);
            } else {
                const lastPromptTime = parseInt(lastPromptStr, 10);
                if (now - lastPromptTime > PROMPT_COOLDOWN_MS) {
                    setTimeout(() => openModal(), 1200);
                }
            }
        } catch (error) {
            console.log('Error checking profile prompt cooldown:', error);
        }
    };

    const openModal = () => {
        setVisible(true);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const closeModal = async () => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, Date.now().toString());
        } catch (error) {
            console.log('Failed to save prompt timestamp:', error);
        }
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => setVisible(false));
    };

    const handleCompleteNow = () => {
        closeModal();
        if (isWorker) {
            router.push('/(worker)/profile');
        } else {
            router.push('/(employer)/profile');
        }
    };

    if (!visible) return null;

    const missingPercentage = 100 - completion.percentage;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={closeModal}
        >
            <View style={styles.overlay}>
                <Animated.View style={[styles.modalCard, { opacity: fadeAnim }]}>
                    {/* Close Cross */}
                    <TouchableOpacity style={styles.closeBtn} onPress={closeModal}>
                        <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>

                    {/* Circular Badge / Header */}
                    <View style={styles.headerArea}>
                        <View style={[styles.circleProgress, { borderColor: completion.color }]}>
                            <Text style={[styles.circleText, { color: completion.color }]}>
                                {completion.percentage}%
                            </Text>
                        </View>
                        <Text style={styles.title}>
                            {t('complete_profile_title') || 'Complete Your Profile'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {isWorker
                                ? (t('profile_modal_sub_worker') || 'Workers with 100% complete profiles receive 3x more job calls & direct hirings!')
                                : (t('profile_modal_sub_employer') || 'Employers with complete details attract qualified candidates 2x faster!')}
                        </Text>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressTrack}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${completion.percentage}%`, backgroundColor: completion.color },
                            ]}
                        />
                    </View>

                    {/* Missing Steps Checklist */}
                    <View style={styles.stepsContainer}>
                        <Text style={styles.stepsHeader}>
                            {t('recommended_actions') || 'RECOMMENDED ACTIONS'}:
                        </Text>
                        {completion.missingSteps.slice(0, 3).map((step) => (
                            <View key={step.id} style={styles.stepItem}>
                                <View style={styles.stepIconBg}>
                                    <Ionicons name={step.icon || 'add-circle-outline'} size={16} color={COLORS.primary} />
                                </View>
                                <Text style={styles.stepTitle} numberOfLines={1}>
                                    {(step.titleKey && t(step.titleKey)) || step.title}
                                </Text>
                                <View style={styles.weightBadge}>
                                    <Text style={styles.weightText}>+{step.weight}%</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.buttonsArea}>
                        <TouchableOpacity
                            style={[styles.primaryBtn, { backgroundColor: COLORS.primary }]}
                            onPress={handleCompleteNow}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="sparkles" size={18} color={COLORS.white} />
                            <Text style={styles.primaryBtnText}>
                                {t('complete_now') || 'Complete Now'} (+{missingPercentage}%)
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryBtn}
                            onPress={closeModal}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.secondaryBtnText}>
                                {t('remind_me_later') || t('remind_later') || 'Remind Me Later'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalCard: {
        width: Math.min(width - 40, 360),
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
        position: 'relative',
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    headerArea: {
        alignItems: 'center',
        marginTop: 6,
        marginBottom: 16,
    },
    circleProgress: {
        width: 68,
        height: 68,
        borderRadius: 34,
        borderWidth: 4,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        marginBottom: 12,
    },
    circleText: {
        fontSize: 18,
        fontWeight: '900',
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 17,
        paddingHorizontal: 10,
    },
    progressTrack: {
        width: '100%',
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 18,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    stepsContainer: {
        width: '100%',
        backgroundColor: '#F9FAFB',
        borderRadius: 14,
        padding: 12,
        marginBottom: 20,
    },
    stepsHeader: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        gap: 8,
    },
    stepIconBg: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepTitle: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text,
    },
    weightBadge: {
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    weightText: {
        color: '#059669',
        fontSize: 11,
        fontWeight: '800',
    },
    buttonsArea: {
        width: '100%',
        gap: 8,
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
        borderRadius: 14,
        gap: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryBtnText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '700',
    },
    secondaryBtn: {
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryBtnText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
});
