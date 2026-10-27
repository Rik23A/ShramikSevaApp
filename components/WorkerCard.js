import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS } from '../constants/config';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { unlockWorkerProfile } from '../services/userService';
import { getCurrentSubscription } from '../services/subscriptionService';
import { getFullImageUrl } from '../utils/imageUtil';

const WorkerCard = ({ worker, onPress, onHire, onWorkerUpdated, employerCoords }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [currentWorker, setCurrentWorker] = useState(worker);
    const [unlockLoading, setUnlockLoading] = useState(false);

    useEffect(() => {
        setCurrentWorker(worker);
    }, [worker]);

    const getDisplayCity = () => {
        if (currentWorker?.city && typeof currentWorker.city === 'string' && currentWorker.city.trim()) {
            return currentWorker.city.trim();
        }
        if (currentWorker?.locationName && typeof currentWorker.locationName === 'string') {
            const parts = currentWorker.locationName.split(',').map(s => s.trim()).filter(Boolean);
            if (parts.length > 0) return parts[0];
        }
        if (typeof currentWorker?.location === 'string' && currentWorker.location.trim()) {
            const parts = currentWorker.location.split(',').map(s => s.trim()).filter(Boolean);
            if (parts.length > 0) return parts[0];
        }
        return null;
    };

    const getDisplayDistance = () => {
        if (currentWorker?.distance !== undefined && currentWorker?.distance !== null) {
            const d = Number(currentWorker.distance);
            return d < 1 ? `${Math.round(d * 1000)} ${t('m_away') || 'm away'}` : `${d.toFixed(1)} ${t('km_away') || 'km away'}`;
        }
        if (employerCoords && employerCoords.latitude && employerCoords.longitude) {
            const workerCoords = currentWorker?.location?.coordinates;
            if (Array.isArray(workerCoords) && workerCoords.length === 2) {
                const wLon = workerCoords[0];
                const wLat = workerCoords[1];
                if (wLat && wLon && (wLat !== 0 || wLon !== 0)) {
                    const R = 6371;
                    const dLat = (wLat - employerCoords.latitude) * Math.PI / 180;
                    const dLon = (wLon - employerCoords.longitude) * Math.PI / 180;
                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                              Math.cos(employerCoords.latitude * Math.PI / 180) * Math.cos(wLat * Math.PI / 180) *
                              Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    const d = R * c;
                    return d < 1 ? `${Math.round(d * 1000)} ${t('m_away') || 'm away'}` : `${d.toFixed(1)} ${t('km_away') || 'km away'}`;
                }
            }
        }
        return null;
    };

    const displayCity = getDisplayCity();
    const displayDistance = getDisplayDistance();

    const isContactUnlocked = Boolean(currentWorker?.mobile);
    const isEmployer = user?.role === 'employer';

    const handleCall = (mobile) => {
        if (!mobile) {
            Alert.alert(t('info') || 'Info', t('mobile_not_available') || 'Mobile number not available');
            return;
        }
        Linking.openURL(`tel:${mobile}`);
    };

    const handleWhatsApp = (mobile) => {
        if (!mobile) {
            Alert.alert(t('info') || 'Info', t('mobile_not_available') || 'Mobile number not available');
            return;
        }
        const cleanNumber = mobile.replace(/[^0-9+]/g, '');
        const formattedNumber = cleanNumber.startsWith('+') ? cleanNumber.replace('+', '') : (cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber);
        Linking.openURL(`whatsapp://send?phone=${formattedNumber}`).catch(() => {
            Alert.alert(t('error_title') || 'Error', 'WhatsApp is not installed on this device');
        });
    };

    const handleUnlock = async () => {
        try {
            setUnlockLoading(true);
            const subData = await getCurrentSubscription();
            const hasActiveSub = subData && subData.status === 'active' && new Date(subData.endDate) >= new Date();
            const credits = subData ? Math.max(0, (subData.maxDatabaseUnlocks || 0) - (subData.databaseUnlocksUsed || 0)) : 0;

            if (!hasActiveSub || credits <= 0) {
                Alert.alert(
                    t('limit_reached') || 'Subscription Required',
                    subData ? (t('unlock_limit_reached') || 'Database unlock limit reached. Please upgrade your plan.') : (t('active_sub_required') || 'An active subscription is required to unlock contact details.'),
                    [
                        { text: t('cancel') || 'Cancel', style: 'cancel' },
                        { text: t('upgrade_plan') || 'Upgrade Plan', onPress: () => router.push('/(employer)/subscription-plans') }
                    ]
                );
                return;
            }

            Alert.alert(
                t('unlock_profile_title') || 'Unlock Contact Details',
                (t('unlock_profile_confirm') || 'This will use 1 database unlock credit. You have {credits} credits remaining. Do you want to proceed?').replace('{credits}', credits),
                [
                    { text: t('cancel') || 'Cancel', style: 'cancel' },
                    {
                        text: t('unlock') || 'Unlock',
                        onPress: async () => {
                            try {
                                setUnlockLoading(true);
                                const workerId = currentWorker?._id || currentWorker?.id;
                                const response = await unlockWorkerProfile(workerId);
                                if (response && response.worker) {
                                    setCurrentWorker(response.worker);
                                    if (onWorkerUpdated) {
                                        onWorkerUpdated(response.worker);
                                    }
                                    Alert.alert(t('success') || 'Success', t('worker_profile_unlocked') || 'Contact details unlocked successfully!');
                                }
                            } catch (err) {
                                console.error('Unlock worker error:', err);
                                if (err.response && err.response.status === 403) {
                                    Alert.alert(
                                        t('limit_reached') || 'Limit Reached',
                                        err.response.data?.message || t('unlock_limit_reached') || 'Database unlock limit reached. Please upgrade your plan.',
                                        [
                                            { text: t('cancel') || 'Cancel', style: 'cancel' },
                                            { text: t('upgrade_plan') || 'Upgrade Plan', onPress: () => router.push('/(employer)/subscription-plans') }
                                        ]
                                    );
                                } else {
                                    Alert.alert(t('error_title') || 'Error', err.response?.data?.message || t('failed_to_unlock') || 'Failed to unlock profile. Please try again.');
                                }
                            } finally {
                                setUnlockLoading(false);
                            }
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error in handleUnlock:', error);
            Alert.alert(t('error_title') || 'Error', t('failed_to_unlock') || 'Failed to unlock profile. Please try again.');
        } finally {
            setUnlockLoading(false);
        }
    };

    const renderStars = (rating) => {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;

        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars.push(<Ionicons key={i} name="star" size={14} color="#FFD700" />);
            } else if (i === fullStars && hasHalfStar) {
                stars.push(<Ionicons key={i} name="star-half" size={14} color="#FFD700" />);
            } else {
                stars.push(<Ionicons key={i} name="star-outline" size={14} color="#FFD700" />);
            }
        }
        return stars;
    };

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
            <View style={styles.header}>
                <View style={styles.avatar}>
                    {currentWorker.profilePicture ? (
                        <Image
                            source={{ uri: getFullImageUrl(currentWorker.profilePicture) }}
                            style={styles.avatarImage}
                            onLoad={() => console.log('WorkerCard Image Loaded:', getFullImageUrl(currentWorker.profilePicture))}
                            onError={(e) => console.error('WorkerCard Image Error:', e.nativeEvent.error, getFullImageUrl(currentWorker.profilePicture))}
                        />
                    ) : (
                        <Ionicons name="person" size={30} color={COLORS.textSecondary} />
                    )}
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{currentWorker.name || t('worker')}</Text>
                    <View style={styles.ratingContainer}>
                        {renderStars(currentWorker.rating || 0)}
                        <Text style={styles.ratingText}>({currentWorker.rating?.toFixed(1) || '0.0'})</Text>
                    </View>
                </View>
                <View style={[styles.availabilityBadge,
                currentWorker.availability === 'available' && styles.available
                ]}>
                    <Text style={styles.availabilityText}>
                        {currentWorker.availability === 'available' ? t('available') : t('unavailable')}
                    </Text>
                </View>
            </View>

            {currentWorker.workerType && currentWorker.workerType.length > 0 && (
                <View style={styles.typesContainer}>
                    {currentWorker.workerType.slice(0, 2).map((type, index) => (
                        <View key={index} style={styles.typeBadge}>
                            <Text style={styles.typeText}>{t(type.toLowerCase())}</Text>
                        </View>
                    ))}
                    {currentWorker.workerType.length > 2 && (
                        <Text style={styles.moreTypes}>+{currentWorker.workerType.length - 2}</Text>
                    )}
                </View>
            )}

            <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                    <Ionicons name="briefcase-outline" size={13} color={COLORS.primary} />
                    <Text style={styles.detailText}>
                        {currentWorker.isFresher || !currentWorker.experience || Number(currentWorker.experience) === 0 ? t('fresher') : t('yrs_exp', { exp: currentWorker.experience })}
                    </Text>
                </View>

                {(currentWorker.age || currentWorker.gender) ? (
                    <View style={styles.detailItem}>
                        <Ionicons name="person-outline" size={13} color={COLORS.primary} />
                        <Text style={styles.detailText}>
                            {[currentWorker.age ? `${currentWorker.age} ${t('yrs') || 'yrs'}` : null, currentWorker.gender ? (t(currentWorker.gender.toLowerCase()) || currentWorker.gender) : null].filter(Boolean).join(' • ')}
                        </Text>
                    </View>
                ) : null}

                {currentWorker.qualification ? (
                    <View style={styles.detailItem}>
                        <Ionicons name="school-outline" size={13} color={COLORS.primary} />
                        <Text style={styles.detailText} numberOfLines={1}>
                            {t(currentWorker.qualification.toLowerCase().replace(/ /g, '_')) || currentWorker.qualification}
                        </Text>
                    </View>
                ) : null}

                {(displayCity || displayDistance) ? (
                    <View style={styles.detailItem}>
                        <Ionicons name="location-outline" size={13} color={COLORS.primary} />
                        <Text style={styles.detailText} numberOfLines={1}>
                            {[displayCity, displayDistance].filter(Boolean).join(' • ')}
                        </Text>
                    </View>
                ) : null}

                {(currentWorker.expectedSalary && (Number(currentWorker.expectedSalary.min) > 0 || Number(currentWorker.expectedSalary.max) > 0)) ? (
                    <View style={styles.detailItem}>
                        <Ionicons name="cash-outline" size={13} color="#059669" />
                        <Text style={[styles.detailText, { color: '#059669', fontWeight: 'bold' }]} numberOfLines={1}>
                            {currentWorker.expectedSalary.min > 0 && currentWorker.expectedSalary.max > 0
                                ? `₹${Number(currentWorker.expectedSalary.min).toLocaleString('en-IN')} – ₹${Number(currentWorker.expectedSalary.max).toLocaleString('en-IN')}`
                                : `₹${Number(currentWorker.expectedSalary.min || currentWorker.expectedSalary.max).toLocaleString('en-IN')}`} / {currentWorker.expectedSalary.period === 'daily' ? (t('day') || 'day') : (t('mo') || 'mo')}
                        </Text>
                    </View>
                ) : currentWorker.hourlyRate && Number(currentWorker.hourlyRate) > 0 ? (
                    <View style={styles.detailItem}>
                        <Ionicons name="cash-outline" size={13} color="#059669" />
                        <Text style={[styles.detailText, { color: '#059669', fontWeight: 'bold' }]} numberOfLines={1}>
                            ₹{currentWorker.hourlyRate}/hr
                        </Text>
                    </View>
                ) : null}
            </View>

            {currentWorker.languages && currentWorker.languages.length > 0 && (
                <View style={styles.languagesRow}>
                    <Ionicons name="chatbubbles-outline" size={13} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.languagesLabel}>{t('languages') || 'Languages'}: </Text>
                    <Text style={styles.languagesText} numberOfLines={1}>
                        {currentWorker.languages.join(', ')}
                    </Text>
                </View>
            )}

            {currentWorker.skills && currentWorker.skills.length > 0 && (
                <View style={styles.skillsContainer}>
                    {currentWorker.skills.slice(0, 4).map((skill, index) => (
                        <View key={index} style={styles.skillBadge}>
                            <Text style={styles.skillText}>{t(skill.toLowerCase())}</Text>
                        </View>
                    ))}
                </View>
            )}

            {onHire && (
                <TouchableOpacity style={styles.hireButton} onPress={onHire}>
                    <Text style={styles.hireButtonText}>{t('hire_worker')}</Text>
                </TouchableOpacity>
            )}

            {/* Action Buttons Section */}
            <View style={styles.actionsContainer}>
                {isContactUnlocked ? (
                    <View style={styles.unlockedActionsContainer}>
                        <View style={styles.contactButtonsRow}>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.whatsappBtn]}
                                onPress={() => handleWhatsApp(currentWorker.mobile)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="logo-whatsapp" size={16} color={COLORS.white} />
                                <Text style={styles.actionBtnWhiteText}>{t('whatsapp') || 'WhatsApp'}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionBtn, styles.callBtn]}
                                onPress={() => handleCall(currentWorker.mobile)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="call" size={15} color={COLORS.white} />
                                <Text style={styles.actionBtnWhiteText}>{t('call') || 'Call'}</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.viewProfileBtn}
                            onPress={onPress}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="person-outline" size={15} color={COLORS.primary} />
                            <Text style={styles.viewProfileBtnText}>{t('view_profile') || 'View Profile'}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.lockedActionsContainer}>
                        {isEmployer ? (
                            <TouchableOpacity
                                style={styles.unlockBtn}
                                onPress={handleUnlock}
                                disabled={unlockLoading}
                                activeOpacity={0.85}
                            >
                                {unlockLoading ? (
                                    <ActivityIndicator size="small" color={COLORS.white} />
                                ) : (
                                    <>
                                        <Ionicons name="lock-open" size={16} color={COLORS.white} />
                                        <Text style={styles.unlockBtnText}>
                                            {t('unlock_contact_details') || 'Unlock Contact Details'}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                            style={styles.viewProfileBtn}
                            onPress={onPress}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="person-outline" size={15} color={COLORS.primary} />
                            <Text style={styles.viewProfileBtnText}>{t('view_profile') || 'View Profile'}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    info: {
        flex: 1,
        marginLeft: 12,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    ratingText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginLeft: 4,
    },
    availabilityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        backgroundColor: COLORS.textSecondary,
    },
    available: {
        backgroundColor: COLORS.success,
    },
    availabilityText: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.white,
    },
    typesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 8,
    },
    typeBadge: {
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginRight: 6,
        marginBottom: 4,
    },
    typeText: {
        fontSize: 11,
        color: COLORS.primary,
        fontWeight: '500',
    },
    moreTypes: {
        fontSize: 11,
        color: COLORS.textSecondary,
        alignSelf: 'center',
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 8,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginRight: 6,
        marginBottom: 6,
    },
    detailText: {
        fontSize: 11,
        color: COLORS.text,
        marginLeft: 4,
        fontWeight: '500',
    },
    languagesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    languagesLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    languagesText: {
        fontSize: 11,
        color: COLORS.primary,
        fontWeight: '500',
        flex: 1,
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    skillBadge: {
        backgroundColor: COLORS.background,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginRight: 6,
        marginBottom: 4,
    },
    skillText: {
        fontSize: 10,
        color: COLORS.text,
    },
    hireButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 10,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 12,
    },
    hireButtonText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 14,
    },
    actionsContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    unlockedActionsContainer: {
        gap: 8,
    },
    contactButtonsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 6,
    },
    whatsappBtn: {
        backgroundColor: '#25D366',
    },
    callBtn: {
        backgroundColor: COLORS.primary,
    },
    actionBtnWhiteText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 13,
    },
    lockedActionsContainer: {
        gap: 8,
    },
    unlockBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F59E0B',
        paddingVertical: 11,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 8,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 2,
    },
    unlockBtnText: {
        color: COLORS.white,
        fontWeight: '700',
        fontSize: 14,
    },
    viewProfileBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderRadius: 8,
        gap: 6,
    },
    viewProfileBtnText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 13,
    },
});

export default WorkerCard;
