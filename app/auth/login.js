import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Platform,
    KeyboardAvoidingView,
    ScrollView,
    Alert,
    Animated,
    Dimensions,
    TouchableOpacity,
    Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { COLORS } from '../../constants/config';
import { requestOtp, loginUser } from '../../services/authService';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();
    const { login } = useAuth();
    const [loginMethod, setLoginMethod] = useState('mobile'); // 'mobile' or 'email'
    const [mobile, setMobile] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const validateMobile = (number) => {
        return /^[6-9]\d{9}$/.test(number);
    };

    const validateEmail = (email) => {
        return /\S+@\S+\.\S+/.test(email);
    };

    const handleRequestOtp = async () => {
        if (!mobile) {
            setError(t('enter_mobile'));
            return;
        }

        if (!validateMobile(mobile)) {
            setError(t('valid_mobile_error'));
            return;
        }

        setError('');
        setLoading(true);

        try {
            await requestOtp(mobile);
            // Navigate to OTP verification screen
            router.push({
                pathname: '/auth/verify-otp',
                params: { mobile, isLogin: 'true' }
            });
        } catch (err) {
            Alert.alert(
                t('error_title'),
                err.response?.data?.message || t('otp_send_fail')
            );
        } finally {
            setLoading(false);
        }
    };

    const handleEmailLogin = async () => {
        if (!email || !password) {
            setError(t('enter_email_password') || "Enter Email & Password");
            return;
        }

        if (!validateEmail(email)) {
            setError(t('valid_email_error') || "Invalid Email Format");
            return;
        }

        setError('');
        setLoading(true);

        try {
            const data = await loginUser(email, password);
            if (data && data.token) {
                const success = await login(data);
                if (success) {
                    router.replace('/(tabs)/home');
                } else {
                    setError('Login failed during local save');
                }
            } else {
                setError('Invalid server response');
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const renderToggle = () => (
        <View style={styles.toggleContainer}>
            <View style={styles.toggleWrapper}>
                <TouchableOpacity
                    style={[styles.toggleOption, loginMethod === 'mobile' && styles.toggleOptionActive]}
                    onPress={() => {
                        setLoginMethod('mobile');
                        setError('');
                    }}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name="phone-portrait-outline"
                        size={18}
                        color={loginMethod === 'mobile' ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text style={[styles.toggleText, loginMethod === 'mobile' && styles.toggleTextActive]}>
                        Mobile OTP
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleOption, loginMethod === 'email' && styles.toggleOptionActive]}
                    onPress={() => {
                        setLoginMethod('email');
                        setError('');
                    }}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name="mail-outline"
                        size={18}
                        color={loginMethod === 'email' ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text style={[styles.toggleText, loginMethod === 'email' && styles.toggleTextActive]}>
                        Email Login
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {loading && <LoadingSpinner fullScreen={true} message={loginMethod === 'mobile' ? "Sending OTP..." : "Logging in..."} />}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* Header Section with Gradient */}
                    <View style={styles.headerContainer}>
                        <LinearGradient
                            colors={[COLORS.primary, COLORS.primaryDark]}
                            style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.headerContent}>
                                <View style={styles.logoCircle}>
                                    <Ionicons name="briefcase" size={40} color={COLORS.primary} />
                                </View>
                                <Text style={styles.headerTitle}>श्रमिक सेवा</Text>
                                <Text style={styles.headerSubtitle}>Shramik Seva</Text>
                                <Text style={styles.headerTagline}>{t('tagline')}</Text>
                            </View>
                            <View style={styles.headerCurve} />
                        </LinearGradient>
                    </View>

                    <Animated.View
                        style={[
                            styles.formContainer,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }]
                            }
                        ]}
                    >
                        <View style={styles.formCard}>
                            <Text style={styles.welcomeText}>{t('welcome_back')}</Text>
                            <Text style={styles.instructionText}>{t('login_subtitle')}</Text>

                            {renderToggle()}

                            {loginMethod === 'mobile' ? (
                                <View style={styles.inputSection}>
                                    <View style={styles.phoneInputWrapper}>
                                        <View style={styles.countryCodeBadge}>
                                            <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Input
                                                placeholder={t('enter_mobile_placeholder')}
                                                value={mobile}
                                                onChangeText={(text) => {
                                                    setMobile(text.replace(/[^0-9]/g, '').slice(0, 10));
                                                    setError('');
                                                }}
                                                keyboardType="phone-pad"
                                                error={error}
                                                maxLength={10}
                                                icon="call-outline"
                                                style={{ marginBottom: 0 }} // Remove default bottom margin for alignment
                                                containerStyle={{ marginBottom: 0 }} // New prop to handle container margin if added to Input component
                                            />
                                        </View>
                                    </View>

                                    <Button
                                        title={t('get_otp')}
                                        onPress={handleRequestOtp}
                                        disabled={!mobile || loading}
                                        style={styles.actionButton}
                                    />
                                </View>
                            ) : (
                                <View style={styles.inputSection}>
                                    <View style={styles.inputGroup}>
                                        <Input
                                            placeholder="Enter Email Address"
                                            value={email}
                                            onChangeText={(text) => {
                                                setEmail(text);
                                                setError('');
                                            }}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            icon="mail-outline"
                                        />
                                        <View style={{ height: 16 }} />
                                        <Input
                                            placeholder="Enter Password"
                                            value={password}
                                            onChangeText={(text) => {
                                                setPassword(text);
                                                setError('');
                                            }}
                                            secureTextEntry
                                            icon="lock-closed-outline"
                                            error={error}
                                        />
                                    </View>

                                    <Button
                                        title="Login Securely"
                                        onPress={handleEmailLogin}
                                        disabled={!email || !password || loading}
                                        style={styles.actionButton}
                                    />
                                </View>
                            )}

                            <View style={styles.footerSection}>
                                <View style={styles.divider}>
                                    <View style={styles.dividerLine} />
                                    <Text style={styles.dividerText}>{t('or')}</Text>
                                    <View style={styles.dividerLine} />
                                </View>

                                <View style={styles.signupContainer}>
                                    <Text style={styles.signupText}>New to Shramik Seva?</Text>
                                    <TouchableOpacity onPress={() => router.push('/auth/select-role')}>
                                        <Text style={styles.signupLink}>{t('create_new_account')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    keyboardView: {
        flex: 1,
    },
    headerGradient: {
        paddingTop: 40,
        paddingBottom: 60,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerContent: {
        alignItems: 'center',
        zIndex: 1,
    },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        elevation: 8,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.white,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        letterSpacing: 1,
        marginBottom: 8,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    headerTagline: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        fontStyle: 'italic',
    },
    scrollContent: {
        flexGrow: 1,
    },
    formContainer: {
        marginTop: -40,
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    formCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 24,
        elevation: 4,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    instructionText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    toggleContainer: {
        marginBottom: 24,
    },
    toggleWrapper: {
        flexDirection: 'row',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    toggleOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    toggleOptionActive: {
        backgroundColor: COLORS.white,
        elevation: 2,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    toggleTextActive: {
        color: COLORS.primary,
    },
    inputSection: {
        marginBottom: 8,
    },
    phoneInputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-start', // Accurately align with the input box, not including its bottom margin
        marginBottom: 16,
        gap: 12,
    },
    countryCodeBadge: {
        backgroundColor: COLORS.background,
        paddingHorizontal: 16,
        paddingVertical: 12, // Match input height roughly
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        height: 50, // Fixed height to match Input component
    },
    countryCodeText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    actionButton: {
        marginTop: 8,
    },
    footerSection: {
        marginTop: 24,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.border,
    },
    dividerText: {
        marginHorizontal: 16,
        color: COLORS.textLight,
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    signupText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    signupLink: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
});
