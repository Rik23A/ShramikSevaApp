import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Linking,
    Modal,
    ScrollView,
    Dimensions,
    Animated,
    Platform,
    Pressable
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import API from '../../services/api';
import { COLORS } from '../../constants/config';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const DISMISSED_ANNOUNCEMENTS_KEY = 'shramik_dismissed_mobile_announcements';
const { width, height } = Dimensions.get('window');

/**
 * Industry-Standard Announcement Pop-up Modal
 * Replaces static top status bar banners with a high-engagement, centered dialog popup.
 */
export default function AnnouncementBanner() {
    const [announcements, setAnnouncements] = useState([]);
    const [dismissedIds, setDismissedIds] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [visible, setVisible] = useState(true);

    const { socket } = useSocket();
    const { user } = useAuth();
    const { t } = useLanguage();

    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    // Fetch active announcements from server
    const fetchActive = useCallback(async () => {
        try {
            const saved = await AsyncStorage.getItem(DISMISSED_ANNOUNCEMENTS_KEY);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed)) {
                        setDismissedIds(parsed);
                    }
                } catch (err) {
                    console.warn('[Announcement] Error parsing dismissed IDs', err);
                }
            }

            const response = await API.get('/announcements/active', {
                params: {
                    platform: 'mobile',
                    role: user?.role || 'all'
                }
            });

            if (response.data && response.data.success && Array.isArray(response.data.announcements)) {
                setAnnouncements(response.data.announcements);
            }
        } catch (error) {
            // Silently handle network or offline errors
        }
    }, [user?.role]);

    useEffect(() => {
        fetchActive();
    }, [fetchActive]);

    // Real-time socket events for broadcast announcements
    useEffect(() => {
        if (!socket || typeof socket.on !== 'function') return;

        const handleNewAnnouncement = (announcement) => {
            if (!announcement) return;

            if (announcement.isActive) {
                // Check if target platform matches mobile or all
                if (announcement.platform && announcement.platform !== 'all' && announcement.platform !== 'mobile') {
                    return;
                }
                // Check audience matches user role or all
                if (announcement.targetAudience && announcement.targetAudience !== 'all' && user?.role && announcement.targetAudience !== user.role) {
                    return;
                }

                setAnnouncements((prev) => {
                    const exists = prev.some((a) => a._id === announcement._id);
                    if (exists) {
                        return prev.map((a) => (a._id === announcement._id ? announcement : a));
                    }
                    return [announcement, ...prev];
                });
                setVisible(true);
            } else {
                setAnnouncements((prev) => prev.filter((a) => a._id !== announcement._id));
            }
        };

        socket.on('announcement:active', handleNewAnnouncement);
        return () => {
            if (typeof socket.off === 'function') {
                socket.off('announcement:active', handleNewAnnouncement);
            }
        };
    }, [socket, user?.role]);

    // Filter out dismissed announcements
    const visibleAnnouncements = announcements.filter(
        (a) => a.isActive !== false && (!a.isDismissible || !dismissedIds.includes(a._id))
    );

    // Keep currentIndex valid
    useEffect(() => {
        if (currentIndex >= visibleAnnouncements.length && visibleAnnouncements.length > 0) {
            setCurrentIndex(visibleAnnouncements.length - 1);
        }
    }, [visibleAnnouncements.length, currentIndex]);

    // Animate on popup visibility
    useEffect(() => {
        if (visibleAnnouncements.length > 0 && visible) {
            scaleAnim.setValue(0.92);
            opacityAnim.setValue(0);
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 50,
                    useNativeDriver: true
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 220,
                    useNativeDriver: true
                })
            ]).start();
        }
    }, [visibleAnnouncements.length, visible, currentIndex]);

    if (visibleAnnouncements.length === 0 || !visible) {
        return null;
    }

    const currentItem = visibleAnnouncements[currentIndex] || visibleAnnouncements[0];
    const totalCount = visibleAnnouncements.length;
    const isDismissible = currentItem.isDismissible !== false;

    // Dismiss current announcement permanently
    const handleDismiss = async (id) => {
        if (!id) return;
        const updated = [...dismissedIds, id];
        setDismissedIds(updated);
        try {
            await AsyncStorage.setItem(DISMISSED_ANNOUNCEMENTS_KEY, JSON.stringify(updated));
        } catch (e) {
            console.warn('[Announcement] Failed to save dismissed announcement', e);
        }

        // If there are more announcements, advance or keep index within bounds
        if (visibleAnnouncements.length <= 1) {
            setVisible(false);
        } else if (currentIndex >= visibleAnnouncements.length - 1) {
            setCurrentIndex(Math.max(0, currentIndex - 1));
        }
    };

    // Close modal temporarily or dismiss current item
    const handleClose = () => {
        if (isDismissible) {
            handleDismiss(currentItem._id);
        }
    };

    // Handle primary action press
    const handleActionPress = async (actionUrl) => {
        if (!actionUrl) return;
        try {
            if (actionUrl.startsWith('http://') || actionUrl.startsWith('https://')) {
                await Linking.openURL(actionUrl);
            } else {
                router.push(actionUrl);
            }
        } catch (err) {
            console.warn('[Announcement] Could not open action URL:', err);
        }
    };

    // Next / Previous navigation for multiple announcements
    const handleNext = () => {
        if (currentIndex < totalCount - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    // Theme configuration based on announcement type
    const getTheme = (type) => {
        switch (type) {
            case 'critical':
                return {
                    gradient: ['#991B1B', '#DC2626', '#EF4444'],
                    iconColor: '#DC2626',
                    icon: <Ionicons name="alert-circle" size={36} color="#DC2626" />,
                    tag: t('critical_alert') || 'CRITICAL ALERT',
                    accentColor: '#DC2626',
                    glowColor: 'rgba(220, 38, 38, 0.25)'
                };
            case 'maintenance':
                return {
                    gradient: ['#92400E', '#D97706', '#F59E0B'],
                    iconColor: '#D97706',
                    icon: <MaterialCommunityIcons name="tools" size={34} color="#D97706" />,
                    tag: t('maintenance') || 'SCHEDULED MAINTENANCE',
                    accentColor: '#D97706',
                    glowColor: 'rgba(217, 119, 6, 0.25)'
                };
            case 'warning':
                return {
                    gradient: ['#C2410C', '#EA580C', '#F97316'],
                    iconColor: '#EA580C',
                    icon: <Ionicons name="warning" size={34} color="#EA580C" />,
                    tag: t('notice') || 'IMPORTANT NOTICE',
                    accentColor: '#EA580C',
                    glowColor: 'rgba(234, 88, 12, 0.25)'
                };
            case 'success':
                return {
                    gradient: ['#065F46', '#059669', '#10B981'],
                    iconColor: '#059669',
                    icon: <Ionicons name="sparkles" size={34} color="#059669" />,
                    tag: t('new_update') || 'SERVICE UPDATE',
                    accentColor: '#059669',
                    glowColor: 'rgba(5, 150, 105, 0.25)'
                };
            case 'info':
            default:
                return {
                    gradient: ['#1E40AF', '#2563EB', '#3B82F6'],
                    iconColor: '#2563EB',
                    icon: <Ionicons name="megaphone" size={34} color="#2563EB" />,
                    tag: t('announcement') || 'ANNOUNCEMENT',
                    accentColor: '#2563EB',
                    glowColor: 'rgba(37, 99, 235, 0.25)'
                };
        }
    };

    const theme = getTheme(currentItem.type);

    return (
        <Modal
            visible={visible && visibleAnnouncements.length > 0}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={isDismissible ? handleClose : undefined}
        >
            <View style={styles.backdrop}>
                {/* Backdrop pressable area (taps outside dismiss if allowed) */}
                {isDismissible && (
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                )}

                <Animated.View
                    style={[
                        styles.popupContainer,
                        {
                            opacity: opacityAnim,
                            transform: [{ scale: scaleAnim }]
                        }
                    ]}
                >
                    {/* Header Banner */}
                    <LinearGradient
                        colors={theme.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.headerGradient}
                    >
                        {/* Top Bar: Tag badge, Pager Pill, and Close button */}
                        <View style={styles.headerTopBar}>
                            <View style={styles.tagBadge}>
                                <Text style={styles.tagBadgeText}>{theme.tag}</Text>
                            </View>

                            {totalCount > 1 && (
                                <View style={styles.pagerPill}>
                                    <Text style={styles.pagerPillText}>
                                        {currentIndex + 1} / {totalCount}
                                    </Text>
                                </View>
                            )}

                            {isDismissible && (
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={handleClose}
                                    style={styles.headerCloseBtn}
                                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                >
                                    <Ionicons name="close" size={20} color="#FFFFFF" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Centered Themed Icon Circle */}
                        <View style={styles.iconCircleWrapper}>
                            <View style={styles.iconCircle}>
                                {theme.icon}
                            </View>
                        </View>

                        {/* Title */}
                        <Text style={styles.popupTitle} numberOfLines={2}>
                            {currentItem.title}
                        </Text>
                    </LinearGradient>

                    {/* Scrollable Message Content */}
                    <ScrollView
                        style={styles.contentScroll}
                        contentContainerStyle={styles.contentScrollInner}
                        showsVerticalScrollIndicator={true}
                        bounces={false}
                    >
                        <Text style={styles.popupMessage}>
                            {currentItem.message}
                        </Text>

                        {!isDismissible && (
                            <View style={styles.mandatoryNoticeBox}>
                                <Ionicons name="shield-checkmark" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                                <Text style={styles.mandatoryNoticeText}>
                                    {t('mandatory_announcement') || 'Mandatory notice. Action or acknowledgment required.'}
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Carousel Navigation (if multiple announcements) */}
                    {totalCount > 1 && (
                        <View style={styles.carouselNavRow}>
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={handlePrev}
                                disabled={currentIndex === 0}
                                style={[styles.navArrowBtn, currentIndex === 0 && styles.navArrowBtnDisabled]}
                            >
                                <Ionicons
                                    name="chevron-back"
                                    size={18}
                                    color={currentIndex === 0 ? '#CBD5E1' : '#475569'}
                                />
                                <Text style={[styles.navArrowText, currentIndex === 0 && styles.navArrowTextDisabled]}>
                                    {t('prev') || 'Prev'}
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.dotsRow}>
                                {visibleAnnouncements.map((_, idx) => (
                                    <View
                                        key={idx}
                                        style={[
                                            styles.dot,
                                            idx === currentIndex
                                                ? [styles.activeDot, { backgroundColor: theme.accentColor }]
                                                : styles.inactiveDot
                                        ]}
                                    />
                                ))}
                            </View>

                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={handleNext}
                                disabled={currentIndex === totalCount - 1}
                                style={[styles.navArrowBtn, currentIndex === totalCount - 1 && styles.navArrowBtnDisabled]}
                            >
                                <Text style={[styles.navArrowText, currentIndex === totalCount - 1 && styles.navArrowTextDisabled]}>
                                    {t('next') || 'Next'}
                                </Text>
                                <Ionicons
                                    name="chevron-forward"
                                    size={18}
                                    color={currentIndex === totalCount - 1 ? '#CBD5E1' : '#475569'}
                                />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Action & Dismiss Buttons */}
                    <View style={styles.actionsContainer}>
                        {currentItem.actionUrl ? (
                            <>
                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={() => handleActionPress(currentItem.actionUrl)}
                                    style={styles.primaryActionBtnWrapper}
                                >
                                    <LinearGradient
                                        colors={theme.gradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.primaryActionBtn}
                                    >
                                        <Text style={styles.primaryActionBtnText}>
                                            {currentItem.actionLabel || t('learn_more') || 'Learn More'}
                                        </Text>
                                        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                                    </LinearGradient>
                                </TouchableOpacity>

                                {isDismissible && (
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={handleClose}
                                        style={styles.secondaryDismissBtn}
                                    >
                                        <Text style={styles.secondaryDismissBtnText}>
                                            {t('got_it') || 'Got it, Dismiss'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        ) : (
                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={handleClose}
                                style={styles.primaryActionBtnWrapper}
                            >
                                <LinearGradient
                                    colors={theme.gradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.primaryActionBtn}
                                >
                                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                                    <Text style={styles.primaryActionBtnText}>
                                        {t('got_it') || 'Understood / Got It'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 30
    },
    popupContainer: {
        width: Math.min(width - 32, 420),
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.28,
        shadowRadius: 24,
        elevation: 16
    },
    headerGradient: {
        paddingTop: 18,
        paddingBottom: 20,
        paddingHorizontal: 18,
        alignItems: 'center'
    },
    headerTopBar: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10
    },
    tagBadge: {
        backgroundColor: 'rgba(0, 0, 0, 0.22)',
        paddingHorizontal: 10,
        paddingVertical: 3.5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)'
    },
    tagBadgeText: {
        color: '#FFFFFF',
        fontSize: 10.5,
        fontWeight: '800',
        letterSpacing: 0.6,
        textTransform: 'uppercase'
    },
    pagerPill: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 12
    },
    pagerPillText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700'
    },
    headerCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.22)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    iconCircleWrapper: {
        marginBottom: 12
    },
    iconCircle: {
        width: 66,
        height: 66,
        borderRadius: 33,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 6
    },
    popupTitle: {
        fontSize: 19,
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 8,
        letterSpacing: -0.2
    },
    contentScroll: {
        maxHeight: Math.min(height * 0.35, 260)
    },
    contentScrollInner: {
        paddingHorizontal: 22,
        paddingTop: 20,
        paddingBottom: 12
    },
    popupMessage: {
        fontSize: 14.5,
        lineHeight: 22,
        color: '#334155',
        textAlign: 'center',
        fontWeight: '400'
    },
    mandatoryNoticeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginTop: 14
    },
    mandatoryNoticeText: {
        fontSize: 11.5,
        color: '#991B1B',
        fontWeight: '600',
        flexShrink: 1
    },
    carouselNavRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9'
    },
    navArrowBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 6,
        borderRadius: 6
    },
    navArrowBtnDisabled: {
        opacity: 0.4
    },
    navArrowText: {
        fontSize: 12.5,
        fontWeight: '600',
        color: '#475569',
        marginHorizontal: 2
    },
    navArrowTextDisabled: {
        color: '#94A3B8'
    },
    dotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    dot: {
        height: 6,
        borderRadius: 3
    },
    activeDot: {
        width: 16
    },
    inactiveDot: {
        width: 6,
        backgroundColor: '#E2E8F0'
    },
    actionsContainer: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
        gap: 8
    },
    primaryActionBtnWrapper: {
        width: '100%',
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.16,
        shadowRadius: 6,
        elevation: 3
    },
    primaryActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
        paddingHorizontal: 18
    },
    primaryActionBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.2
    },
    secondaryDismissBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    secondaryDismissBtnText: {
        fontSize: 13.5,
        fontWeight: '600',
        color: '#64748B'
    }
});
