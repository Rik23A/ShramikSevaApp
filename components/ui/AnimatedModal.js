import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/config';

const { width, height } = Dimensions.get('window');

/**
 * Modern Animated Modal for subscription prompts
 * @param {boolean} visible - Modal visibility
 * @param {string} type - 'subscription' | 'expired' | 'limit' | 'success' | 'error'
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {string} primaryButtonText - Primary action button text
 * @param {string} secondaryButtonText - Secondary action button text
 * @param {function} onPrimaryPress - Primary button callback
 * @param {function} onSecondaryPress - Secondary button callback
 * @param {function} onClose - Close callback
 */
export default function AnimatedModal({
    visible,
    type = 'subscription',
    title,
    message,
    primaryButtonText = 'Continue',
    secondaryButtonText = 'Cancel',
    onPrimaryPress,
    onSecondaryPress,
    onClose,
    icon,
}) {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const iconRotate = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (visible) {
            // Entry animations
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 65,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 65,
                    friction: 10,
                    useNativeDriver: true,
                }),
            ]).start();

            // Icon animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Rotation for certain types
            if (type === 'expired' || type === 'limit') {
                Animated.loop(
                    Animated.timing(iconRotate, {
                        toValue: 1,
                        duration: 3000,
                        useNativeDriver: true,
                    })
                ).start();
            }
        } else {
            // Exit animations
            Animated.parallel([
                Animated.timing(scaleAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const getIconConfig = () => {
        switch (type) {
            case 'subscription':
                return {
                    name: 'card-outline',
                    colors: ['#667eea', '#764ba2'],
                    bgColors: ['#EEF2FF', '#E0E7FF'],
                };
            case 'expired':
                return {
                    name: 'time-outline',
                    colors: ['#f093fb', '#f5576c'],
                    bgColors: ['#FEE2E2', '#FECACA'],
                };
            case 'limit':
                return {
                    name: 'trending-up-outline',
                    colors: ['#4facfe', '#00f2fe'],
                    bgColors: ['#DBEAFE', '#BFDBFE'],
                };
            case 'success':
                return {
                    name: 'checkmark-circle',
                    colors: ['#11998e', '#38ef7d'],
                    bgColors: ['#D1FAE5', '#A7F3D0'],
                };
            case 'error':
                return {
                    name: 'close-circle',
                    colors: ['#eb3349', '#f45c43'],
                    bgColors: ['#FEE2E2', '#FECACA'],
                };
            default:
                return {
                    name: 'information-circle',
                    colors: ['#667eea', '#764ba2'],
                    bgColors: ['#EEF2FF', '#E0E7FF'],
                };
        }
    };

    const iconConfig = getIconConfig();
    const rotateInterpolate = iconRotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />
            <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            transform: [
                                { scale: scaleAnim },
                                { translateY: slideAnim },
                            ],
                        },
                    ]}
                >
                    {/* Gradient Background Header */}
                    <LinearGradient
                        colors={iconConfig.colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.headerGradient}
                    >
                        {/* Decorative circles */}
                        <View style={[styles.decorCircle, styles.decorCircle1]} />
                        <View style={[styles.decorCircle, styles.decorCircle2]} />
                        <View style={[styles.decorCircle, styles.decorCircle3]} />
                    </LinearGradient>

                    {/* Floating Icon */}
                    <Animated.View
                        style={[
                            styles.iconContainer,
                            {
                                transform: [
                                    { scale: pulseAnim },
                                    ...(type === 'expired' || type === 'limit'
                                        ? [{ rotate: rotateInterpolate }]
                                        : []),
                                ],
                            },
                        ]}
                    >
                        <LinearGradient
                            colors={iconConfig.colors}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.iconGradient}
                        >
                            <Ionicons
                                name={icon || iconConfig.name}
                                size={40}
                                color="#FFFFFF"
                            />
                        </LinearGradient>
                    </Animated.View>

                    {/* Content */}
                    <View style={styles.content}>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message}>{message}</Text>

                        {/* Buttons */}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={onPrimaryPress}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={iconConfig.colors}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.primaryButtonGradient}
                                >
                                    <Text style={styles.primaryButtonText}>
                                        {primaryButtonText}
                                    </Text>
                                    <Ionicons name="arrow-forward" size={18} color="#FFF" />
                                </LinearGradient>
                            </TouchableOpacity>

                            {secondaryButtonText && (
                                <TouchableOpacity
                                    style={styles.secondaryButton}
                                    onPress={onSecondaryPress || onClose}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.secondaryButtonText}>
                                        {secondaryButtonText}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Close button */}
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={24} color="#9CA3AF" />
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        overflow: 'hidden',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.25,
        shadowRadius: 25,
    },
    headerGradient: {
        height: 100,
        position: 'relative',
        overflow: 'hidden',
    },
    decorCircle: {
        position: 'absolute',
        borderRadius: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    decorCircle1: {
        width: 100,
        height: 100,
        top: -30,
        right: -20,
    },
    decorCircle2: {
        width: 60,
        height: 60,
        top: 30,
        right: 80,
    },
    decorCircle3: {
        width: 40,
        height: 40,
        bottom: -10,
        left: 30,
    },
    iconContainer: {
        position: 'absolute',
        top: 55,
        left: '50%',
        marginLeft: -40,
        zIndex: 10,
    },
    iconGradient: {
        width: 80,
        height: 80,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 5,
        borderColor: '#FFFFFF',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
    },
    content: {
        paddingTop: 50,
        paddingHorizontal: 28,
        paddingBottom: 28,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    message: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
    primaryButton: {
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    primaryButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 8,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    secondaryButton: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6B7280',
    },
    closeButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
