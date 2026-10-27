import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Linking,
    Platform,
    Animated,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetwork } from '../../context/NetworkContext';
import { useLanguage } from '../../context/LanguageContext';

export default function OfflineBanner() {
    const { isOffline, refreshNetwork } = useNetwork();
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();

    const [isVisible, setIsVisible] = useState(false);
    const [isReconnected, setIsReconnected] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);

    const wasOffline = useRef(false);
    const slideAnim = useRef(new Animated.Value(-150)).current;
    const hideTimerRef = useRef(null);

    const animateIn = useCallback(() => {
        setIsVisible(true);
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
            speed: 12,
        }).start();
    }, [slideAnim]);

    const animateOut = useCallback((callback) => {
        Animated.timing(slideAnim, {
            toValue: -150,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setIsVisible(false);
            if (callback) callback();
        });
    }, [slideAnim]);

    useEffect(() => {
        if (isOffline) {
            // Device just went offline
            wasOffline.current = true;
            setIsReconnected(false);
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
                hideTimerRef.current = null;
            }
            animateIn();
        } else if (wasOffline.current && !isOffline) {
            // Device was offline and is now back online
            setIsReconnected(true);
            animateIn();

            // Display "Back online" message for 2.5 seconds, then dismiss
            hideTimerRef.current = setTimeout(() => {
                animateOut(() => {
                    wasOffline.current = false;
                    setIsReconnected(false);
                });
            }, 2500);
        }

        return () => {
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
            }
        };
    }, [isOffline, animateIn, animateOut]);

    const handleOpenSettings = async () => {
        try {
            if (Platform.OS === 'android') {
                try {
                    // Directly open Wireless / Network settings screen
                    await Linking.sendIntent('android.settings.WIRELESS_SETTINGS');
                } catch {
                    try {
                        await Linking.sendIntent('android.settings.SETTINGS');
                    } catch {
                        await Linking.openSettings();
                    }
                }
            } else {
                await Linking.openSettings();
            }
        } catch (error) {
            console.warn('[OfflineBanner] Error opening settings:', error);
            Linking.openSettings();
        }
    };

    const handleRetry = async () => {
        if (isRetrying) return;
        setIsRetrying(true);
        try {
            await refreshNetwork();
        } finally {
            setTimeout(() => {
                setIsRetrying(false);
            }, 600);
        }
    };

    if (!isVisible) {
        return null;
    }

    const title = isReconnected
        ? t('back_online')
        : t('offline_title');

    const description = isReconnected
        ? null
        : t('offline_desc');

    const settingsLabel = t('settings');
    const retryLabel = t('retry');

    return (
        <Animated.View
            style={[
                styles.wrapper,
                {
                    paddingTop: Math.max(insets.top, 12),
                    transform: [{ translateY: slideAnim }],
                },
                isReconnected ? styles.onlineWrapper : styles.offlineWrapper,
            ]}
        >
            <View style={styles.content}>
                <View style={[styles.iconBox, isReconnected ? styles.onlineIconBox : styles.offlineIconBox]}>
                    <Ionicons
                        name={isReconnected ? 'wifi' : 'cloud-offline'}
                        size={22}
                        color="#FFFFFF"
                    />
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.titleText} numberOfLines={2}>
                        {title}
                    </Text>
                    {description ? (
                        <Text style={styles.descText} numberOfLines={2}>
                            {description}
                        </Text>
                    ) : null}
                </View>

                {!isReconnected && (
                    <View style={styles.actionGroup}>
                        <TouchableOpacity
                            style={styles.settingsBtn}
                            onPress={handleOpenSettings}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel={settingsLabel}
                        >
                            <Text style={styles.settingsBtnText}>{settingsLabel}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.retryBtn}
                            onPress={handleRetry}
                            disabled={isRetrying}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={retryLabel}
                        >
                            {isRetrying ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Ionicons name="refresh" size={18} color="#FFFFFF" />
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999999,
        paddingHorizontal: 16,
        paddingBottom: 10,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 5,
            },
            android: {
                elevation: 12,
            },
        }),
    },
    offlineWrapper: {
        backgroundColor: '#C62828', // Deep Vibrant Red
    },
    onlineWrapper: {
        backgroundColor: '#2E7D32', // Vibrant Forest Green
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    offlineIconBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    onlineIconBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    titleText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    descText: {
        color: 'rgba(255, 255, 255, 0.88)',
        fontSize: 11,
        marginTop: 2,
        lineHeight: 15,
    },
    actionGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
        gap: 6,
    },
    settingsBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.35)',
    },
    settingsBtnText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    retryBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
        width: 32,
        height: 32,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.35)',
    },
});
