import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Animated, Easing, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';

const { width } = Dimensions.get('window');

const STEPS = [
    { icon: 'search', label: 'Find Jobs', color: COLORS.primaryLight },
    { icon: 'document-text', label: 'Apply', color: COLORS.primary },
    { icon: 'checkmark-circle', label: 'Get Hired', color: COLORS.success },
];

const LoadingSpinner = ({ message = 'Loading...', fullScreen = false }) => {
    // ── Animated values ──
    const logoScale = useRef(new Animated.Value(0)).current;
    const logoRotate = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const dotAnims = useRef(STEPS.map(() => new Animated.Value(0))).current;
    const stepOpacity = useRef(STEPS.map(() => new Animated.Value(0))).current;
    const stepScale = useRef(STEPS.map(() => new Animated.Value(0.3))).current;
    const lineWidths = useRef(STEPS.map(() => new Animated.Value(0))).current;
    const shimmer = useRef(new Animated.Value(0)).current;
    const messageOpacity = useRef(new Animated.Value(0)).current;
    const [activeStep, setActiveStep] = useState(0);

    // ── Orchestrate the entrance ──
    useEffect(() => {
        // 1) Logo bounces in
        Animated.spring(logoScale, {
            toValue: 1,
            friction: 4,
            tension: 60,
            useNativeDriver: true,
        }).start();

        // 2) Continuous gentle pulse on the outer ring
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.25,
                    duration: 1200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ]),
        ).start();

        // 3) Spinning ring
        Animated.loop(
            Animated.timing(logoRotate, {
                toValue: 1,
                duration: 3000,
                easing: Easing.linear,
                useNativeDriver: true,
            }),
        ).start();

        // 4) Shimmer effect
        Animated.loop(
            Animated.timing(shimmer, {
                toValue: 1,
                duration: 2000,
                easing: Easing.linear,
                useNativeDriver: true,
            }),
        ).start();

        // 5) Staggered step animations
        STEPS.forEach((_, i) => {
            setTimeout(() => {
                setActiveStep(i);
                Animated.parallel([
                    Animated.spring(stepOpacity[i], {
                        toValue: 1,
                        friction: 6,
                        tension: 40,
                        useNativeDriver: true,
                    }),
                    Animated.spring(stepScale[i], {
                        toValue: 1,
                        friction: 5,
                        tension: 50,
                        useNativeDriver: true,
                    }),
                    Animated.spring(dotAnims[i], {
                        toValue: 1,
                        friction: 5,
                        tension: 60,
                        useNativeDriver: true,
                    }),
                ]).start();

                // Animate connecting line (except last)
                if (i < STEPS.length - 1) {
                    Animated.timing(lineWidths[i], {
                        toValue: 1,
                        duration: 500,
                        delay: 200,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    }).start();
                }
            }, 600 + i * 800);
        });

        // 6) Message fades in
        Animated.timing(messageOpacity, {
            toValue: 1,
            duration: 800,
            delay: 400,
            useNativeDriver: true,
        }).start();

        // 7) Cycle active step after initial animation
        const interval = setInterval(() => {
            setActiveStep(prev => (prev + 1) % STEPS.length);
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    const spin = logoRotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const shimmerTranslate = shimmer.interpolate({
        inputRange: [0, 1],
        outputRange: [-width, width],
    });

    // ── Simple inline version ──
    if (!fullScreen) {
        return (
            <View style={styles.container}>
                <View style={styles.inlineLoader}>
                    <Animated.View
                        style={[
                            styles.inlineRing,
                            { transform: [{ rotate: spin }] },
                        ]}
                    />
                    <Ionicons name="briefcase" size={20} color={COLORS.primary} style={styles.inlineIcon} />
                </View>
                {message && (
                    <Text style={styles.inlineMessage}>{message}</Text>
                )}
            </View>
        );
    }

    // ── Full-screen animated version ──
    return (
        <View style={styles.fullScreen}>
            {/* Background shimmer */}
            <Animated.View
                style={[
                    styles.shimmerBar,
                    { transform: [{ translateX: shimmerTranslate }] },
                ]}
            />

            {/* Pulsing ring */}
            <Animated.View
                style={[
                    styles.pulseRing,
                    {
                        transform: [{ scale: pulseAnim }],
                        opacity: pulseAnim.interpolate({
                            inputRange: [1, 1.25],
                            outputRange: [0.3, 0],
                        }),
                    },
                ]}
            />

            {/* Logo area */}
            <Animated.View
                style={[
                    styles.logoContainer,
                    { transform: [{ scale: logoScale }] },
                ]}
            >
                {/* Spinning outer ring */}
                <Animated.View
                    style={[
                        styles.spinRing,
                        { transform: [{ rotate: spin }] },
                    ]}
                />

                {/* Inner icon */}
                <View style={styles.logoInner}>
                    <Ionicons name="briefcase" size={36} color={COLORS.white} />
                </View>
            </Animated.View>

            {/* App Name */}
            <Animated.View style={{ opacity: messageOpacity }}>
                <Text style={styles.appName}>श्रमिक सेवा</Text>
                <Text style={styles.appTagline}>Shramik Seva</Text>
            </Animated.View>

            {/* Step indicators: Find → Apply → Get Hired */}
            <View style={styles.stepsRow}>
                {STEPS.map((step, i) => (
                    <React.Fragment key={i}>
                        <Animated.View
                            style={[
                                styles.stepItem,
                                {
                                    opacity: stepOpacity[i],
                                    transform: [{ scale: stepScale[i] }],
                                },
                            ]}
                        >
                            <Animated.View
                                style={[
                                    styles.stepDot,
                                    {
                                        backgroundColor: activeStep === i ? step.color : COLORS.border,
                                        transform: [
                                            {
                                                scale: dotAnims[i].interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [0.3, 1],
                                                }),
                                            },
                                        ],
                                    },
                                ]}
                            >
                                <Ionicons
                                    name={step.icon}
                                    size={18}
                                    color={activeStep === i ? COLORS.white : COLORS.textLight}
                                />
                            </Animated.View>
                            <Text
                                style={[
                                    styles.stepLabel,
                                    activeStep === i && styles.stepLabelActive,
                                ]}
                            >
                                {step.label}
                            </Text>
                        </Animated.View>

                        {/* Connecting line */}
                        {i < STEPS.length - 1 && (
                            <Animated.View
                                style={[
                                    styles.stepLine,
                                    {
                                        flex: lineWidths[i].interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, 1],
                                        }),
                                        backgroundColor:
                                            activeStep > i
                                                ? COLORS.primary
                                                : COLORS.border,
                                    },
                                ]}
                            />
                        )}
                    </React.Fragment>
                ))}
            </View>

            {/* Loading message */}
            <Animated.View
                style={[styles.messageContainer, { opacity: messageOpacity }]}
            >
                <Text style={styles.message}>{message}</Text>
                <LoadingDots />
            </Animated.View>
        </View>
    );
};

/* ── Animated dots "..." ── */
const LoadingDots = () => {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animateDot = (dot, delay) =>
            Animated.loop(
                Animated.sequence([
                    Animated.timing(dot, {
                        toValue: 1,
                        duration: 400,
                        delay,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(dot, {
                        toValue: 0,
                        duration: 400,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
            );
        animateDot(dot1, 0).start();
        animateDot(dot2, 200).start();
        animateDot(dot3, 400).start();
    }, []);

    return (
        <View style={styles.dotsRow}>
            {[dot1, dot2, dot3].map((dot, i) => (
                <Animated.View
                    key={i}
                    style={[
                        styles.dot,
                        {
                            opacity: dot.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.3, 1],
                            }),
                            transform: [
                                {
                                    scale: dot.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.6, 1.2],
                                    }),
                                },
                            ],
                        },
                    ]}
                />
            ))}
        </View>
    );
};

/* ── Styles ── */
const styles = StyleSheet.create({
    /* Inline (non-full-screen) */
    container: {
        padding: 20,
        alignItems: 'center',
    },
    inlineLoader: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inlineRing: {
        position: 'absolute',
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 3,
        borderColor: COLORS.border,
        borderTopColor: COLORS.primary,
    },
    inlineIcon: {
        position: 'absolute',
    },
    inlineMessage: {
        marginTop: 12,
        fontSize: 14,
        color: COLORS.textSecondary,
    },

    /* Full-screen */
    fullScreen: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        // elevation for Android
        elevation: 10000,
    },
    shimmerBar: {
        position: 'absolute',
        top: 0,
        width: 120,
        height: '100%',
        backgroundColor: 'rgba(25, 118, 210, 0.03)',
        transform: [{ skewX: '-15deg' }],
    },

    /* Logo */
    pulseRing: {
        position: 'absolute',
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: COLORS.primary,
    },
    logoContainer: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    spinRing: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: 'transparent',
        borderTopColor: COLORS.primaryLight,
        borderRightColor: COLORS.primary,
    },
    logoInner: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
    },

    /* App Name */
    appName: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.primary,
        textAlign: 'center',
        letterSpacing: 1,
    },
    appTagline: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 2,
        letterSpacing: 2,
        textTransform: 'uppercase',
    },

    /* Steps row */
    stepsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 40,
        paddingHorizontal: 20,
        width: '100%',
        maxWidth: 340,
    },
    stepItem: {
        alignItems: 'center',
    },
    stepDot: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    stepLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textLight,
        marginTop: 8,
        textAlign: 'center',
    },
    stepLabelActive: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    stepLine: {
        height: 2.5,
        borderRadius: 2,
        marginHorizontal: 4,
        marginBottom: 24,
    },

    /* Message + dots */
    messageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 40,
    },
    message: {
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.textSecondary,
    },
    dotsRow: {
        flexDirection: 'row',
        marginLeft: 4,
        gap: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
    },
});

export default LoadingSpinner;