import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    Image,
} from 'react-native';
import { router } from 'expo-router';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { COLORS } from '../../constants/config';
import { requestOtp } from '../../services/authService';
import { useLanguage } from '../../context/LanguageContext';

export default function LoginScreen() {
    const { t } = useLanguage();
    const [mobile, setMobile] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const validateMobile = (number) => {
        return /^[6-9]\d{9}$/.test(number);
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

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Logo/Header */}
                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <Text style={styles.logoText}>श्रमिक</Text>
                            <Text style={styles.logoSubtext}>सेवा</Text>
                        </View>
                        <Text style={styles.tagline}>{t('tagline')}</Text>
                    </View>

                    {/* Login Form */}
                    <View style={styles.formContainer}>
                        <Text style={styles.title}>{t('welcome_back')}</Text>
                        <Text style={styles.subtitle}>{t('login_subtitle')}</Text>

                        <View style={styles.inputContainer}>
                            <Text style={styles.countryCode}>+91</Text>
                            <View style={styles.mobileInput}>
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
                                />
                            </View>
                        </View>

                        <Button
                            title={t('get_otp')}
                            onPress={handleRequestOtp}
                            loading={loading}
                            disabled={!mobile || loading}
                        />

                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>{t('or')}</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <Button
                            title={t('create_new_account')}
                            variant="outline"
                            onPress={() => router.push('/auth/select-role')}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
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
    scrollContent: {
        flexGrow: 1,
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 40,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    logoText: {
        fontSize: 42,
        fontWeight: '700',
        color: COLORS.primary,
    },
    logoSubtext: {
        fontSize: 42,
        fontWeight: '700',
        color: COLORS.secondary,
    },
    tagline: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 8,
    },
    formContainer: {
        flex: 1,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginBottom: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    countryCode: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.text,
        backgroundColor: COLORS.white,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        marginRight: 8,
        marginTop: 22,
    },
    mobileInput: {
        flex: 1,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.border,
    },
    dividerText: {
        marginHorizontal: 16,
        color: COLORS.textSecondary,
        fontSize: 14,
    },
});
