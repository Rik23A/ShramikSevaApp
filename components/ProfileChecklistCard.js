import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/config';
import { calculateProfileCompletion } from '../utils/profileCompletion';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function ProfileChecklistCard({ user, onEditPress, style }) {
    const { user: authUser } = useAuth();
    const { t } = useLanguage();
    const [expanded, setExpanded] = useState(false);

    const activeUser = user || authUser;
    const completion = calculateProfileCompletion(activeUser);

    return (
        <View style={[styles.card, style]}>
            {/* Header with circular percent */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={[styles.percentCircle, { borderColor: completion.color }]}>
                        <Text style={[styles.percentText, { color: completion.color }]}>
                            {completion.percentage}%
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.title}>
                            {completion.isComplete 
                                ? (t('profile_complete_title') || 'Profile Complete!') 
                                : (t('profile_strength') || 'Profile Strength')}
                        </Text>
                        <Text style={styles.subtitle}>
                            {completion.isComplete
                                ? (t('max_search_visibility') || 'Your profile has maximum search visibility')
                                : (t('details_completed_count', { completed: completion.completedCount, total: completion.totalCount }) || `${completion.completedCount} of ${completion.totalCount} details completed`)}
                        </Text>
                    </View>
                </View>

                {!completion.isComplete && (
                    <TouchableOpacity
                        style={[styles.editBtn, { backgroundColor: `${COLORS.primary}15` }]}
                        onPress={onEditPress}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="create-outline" size={14} color={COLORS.primary} />
                        <Text style={styles.editBtnText}>{t('edit') || 'Edit'}</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Progress Bar */}
            <View style={styles.track}>
                <View
                    style={[
                        styles.fill,
                        { width: `${completion.percentage}%`, backgroundColor: completion.color },
                    ]}
                />
            </View>

            {/* Next Action or Toggle */}
            {!completion.isComplete ? (
                <View>
                    {/* Collapsible Checklist Items */}
                    <TouchableOpacity
                        style={styles.toggleRow}
                        onPress={() => setExpanded(!expanded)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.toggleText}>
                            {expanded 
                                ? (t('hide_checklist') || 'Hide Checklist') 
                                : (t('view_missing_items', { count: completion.missingSteps.length }) || `View Missing Items (${completion.missingSteps.length})`)}
                        </Text>
                        <Ionicons
                            name={expanded ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color={COLORS.primary}
                        />
                    </TouchableOpacity>

                    {expanded && (
                        <View style={styles.checklist}>
                            {completion.steps.map((step) => (
                                <View key={step.id} style={styles.checkItem}>
                                    <Ionicons
                                        name={step.isDone ? 'checkmark-circle' : 'ellipse-outline'}
                                        size={18}
                                        color={step.isDone ? '#10B981' : '#9CA3AF'}
                                    />
                                    <Text style={[styles.stepTitle, step.isDone && styles.stepDone]}>
                                        {(step.titleKey && t(step.titleKey)) || step.title}
                                    </Text>
                                    {!step.isDone && (
                                        <View style={styles.weightBadge}>
                                            <Text style={styles.weightText}>+{step.weight}%</Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            ) : (
                <View style={styles.verifiedBadgeRow}>
                    <Ionicons name="checkmark-done-circle" size={16} color="#10B981" />
                    <Text style={styles.verifiedText}>{t('all_details_filled') || 'All required details are filled!'}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    percentCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    percentText: {
        fontSize: 13,
        fontWeight: '900',
    },
    title: {
        fontSize: 15,
        fontWeight: '800',
        color: COLORS.text,
    },
    subtitle: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 1,
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    editBtnText: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: '700',
    },
    track: {
        height: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    fill: {
        height: '100%',
        borderRadius: 4,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        gap: 4,
    },
    toggleText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
    },
    checklist: {
        marginTop: 6,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        gap: 8,
    },
    checkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 3,
    },
    stepTitle: {
        fontSize: 13,
        color: COLORS.text,
        fontWeight: '600',
        flex: 1,
    },
    stepDone: {
        color: '#6B7280',
        textDecorationLine: 'line-through',
    },
    weightBadge: {
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 6,
    },
    weightText: {
        color: '#059669',
        fontSize: 10,
        fontWeight: '800',
    },
    verifiedBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 4,
    },
    verifiedText: {
        color: '#059669',
        fontSize: 12,
        fontWeight: '700',
    },
});
