import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/config';
import { useAuth } from '../context/AuthContext';
import { calculateProfileCompletion } from '../utils/profileCompletion';
import { useLanguage } from '../context/LanguageContext';

export default function ProfileCompletionCard({ style }) {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [dismissed, setDismissed] = useState(false);

    const completion = calculateProfileCompletion(user);
    const isWorker = user?.role === 'worker';

    if (dismissed || completion.isComplete || completion.percentage >= 100) {
        return null;
    }

    const nextStep = completion.nextStep;

    const handlePress = () => {
        if (isWorker) {
            router.push('/(worker)/profile');
        } else {
            router.push('/(employer)/profile');
        }
    };

    return (
        <View style={[styles.container, style]}>
            <View style={styles.headerRow}>
                <View style={styles.titleWithIcon}>
                    <View style={[styles.circleBadge, { backgroundColor: `${completion.color}18` }]}>
                        <Ionicons name="shield-checkmark" size={16} color={completion.color} />
                    </View>
                    <View>
                        <Text style={styles.title}>
                            {t('complete_profile') || 'Profile Completion'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {isWorker
                                ? (t('profile_tip_worker') || 'Add missing details for faster job calls')
                                : (t('profile_tip_employer') || 'Complete details to get verified')}
                        </Text>
                    </View>
                </View>

                <View style={styles.rightHeader}>
                    <Text style={[styles.percentNumber, { color: completion.color }]}>
                        {completion.percentage}%
                    </Text>
                    <TouchableOpacity onPress={() => setDismissed(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Progress Track */}
            <View style={styles.track}>
                <View
                    style={[
                        styles.fill,
                        { width: `${completion.percentage}%`, backgroundColor: completion.color },
                    ]}
                />
            </View>

            {/* Next Recommended Step CTA */}
            {nextStep && (
                <TouchableOpacity
                    style={styles.ctaRow}
                    onPress={handlePress}
                    activeOpacity={0.8}
                >
                    <View style={styles.ctaTextContainer}>
                        <Text style={styles.ctaNextLabel}>{t('next_step') || 'NEXT STEP:'}</Text>
                        <Text style={styles.ctaNextAction} numberOfLines={1}>
                            {(nextStep.titleKey && t(nextStep.titleKey)) || nextStep.title} (+{nextStep.weight}%)
                        </Text>
                    </View>

                    <View style={[styles.ctaButton, { backgroundColor: COLORS.primary }]}>
                        <Text style={styles.ctaBtnText}>{t('complete') || 'Complete'}</Text>
                        <Ionicons name="arrow-forward" size={12} color={COLORS.white} />
                    </View>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 14,
        marginHorizontal: 16,
        marginTop: 6,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    titleWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    circleBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.text,
    },
    subtitle: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 1,
    },
    rightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    percentNumber: {
        fontSize: 16,
        fontWeight: '900',
    },
    track: {
        height: 6,
        backgroundColor: '#F3F4F6',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 10,
    },
    fill: {
        height: '100%',
        borderRadius: 3,
    },
    ctaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: '#EEF2FF',
    },
    ctaTextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        marginRight: 8,
    },
    ctaNextLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: COLORS.primary,
        letterSpacing: 0.5,
    },
    ctaNextAction: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.text,
        flex: 1,
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    ctaBtnText: {
        color: COLORS.white,
        fontSize: 11,
        fontWeight: '800',
    },
});
