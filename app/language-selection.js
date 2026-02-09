import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    FlatList,
    Dimensions,
    Animated,
    Easing,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/config';
import { useLanguage } from '../context/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// List of Indian Languages (Supported)
const LANGUAGES = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'hi', name: 'Hindi', native: 'हिंदी' },
    { code: 'mr', name: 'Marathi', native: 'मराठी' },
    { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'te', name: 'Telugu', native: 'తెలుగు' },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা' },
];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function LanguageSelectionScreen() {
    const { changeLanguage, locale } = useLanguage();
    const [selectedLang, setSelectedLang] = useState(locale || 'en');

    // Animations
    const headerOpacity = useRef(new Animated.Value(0)).current;
    const headerTranslateY = useRef(new Animated.Value(-20)).current;
    const buttonTranslateY = useRef(new Animated.Value(100)).current;

    useEffect(() => {
        // Animate Header
        Animated.parallel([
            Animated.timing(headerOpacity, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(headerTranslateY, {
                toValue: 0,
                duration: 600,
                easing: Easing.out(Easing.back(1.5)),
                useNativeDriver: true,
            }),
            Animated.timing(buttonTranslateY, {
                toValue: 0,
                duration: 600,
                delay: 400,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleLanguageSelect = (langCode) => {
        setSelectedLang(langCode);
    };

    const handleContinue = async () => {
        await changeLanguage(selectedLang);
        router.replace('/auth/login');
    };

    return (
        <LinearGradient
            colors={[COLORS.background, '#E3F2FD', '#E1F5FE']}
            style={styles.container}
        >
            <SafeAreaView style={{ flex: 1 }}>
                <Animated.View style={[
                    styles.header,
                    { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }
                ]}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="language" size={36} color={COLORS.primary} />
                    </View>
                    <Text style={styles.title}>Welcome / नमस्ते</Text>
                    <Text style={styles.subtitle}>Select your language to continue</Text>
                </Animated.View>

                <FlatList
                    data={LANGUAGES}
                    renderItem={({ item, index }) => (
                        <LanguageItem
                            item={item}
                            index={index}
                            isSelected={selectedLang === item.code}
                            onSelect={handleLanguageSelect}
                        />
                    )}
                    keyExtractor={item => item.code}
                    numColumns={2}
                    contentContainerStyle={styles.listContent}
                    columnWrapperStyle={styles.columnWrapper}
                    showsVerticalScrollIndicator={false}
                />

                <Animated.View style={[
                    styles.footer,
                    { transform: [{ translateY: buttonTranslateY }] }
                ]}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleContinue}
                    >
                        <LinearGradient
                            colors={[COLORS.primary, '#2962FF']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.continueButton}
                        >
                            <Text style={styles.continueButtonText}>Continue</Text>
                            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </SafeAreaView>
        </LinearGradient>
    );
}

// Separate component to handle individual item animations properly
const LanguageItem = ({ item, index, isSelected, onSelect }) => {
    // Staggered animation for items
    const itemScale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(itemScale, {
            toValue: 1,
            duration: 400,
            delay: index * 50 + 200, // Stagger effect
            useNativeDriver: true,
            easing: Easing.out(Easing.back(1.5)),
        }).start();
    }, []);

    return (
        <AnimatedTouchable
            style={[
                styles.languageCard,
                isSelected && styles.languageCardSelected,
                { transform: [{ scale: itemScale }] }
            ]}
            onPress={() => onSelect(item.code)}
            activeOpacity={0.9}
        >
            <View style={styles.languageInfo}>
                <Text style={[
                    styles.nativeName,
                    isSelected && styles.nativeNameSelected
                ]}>
                    {item.native}
                </Text>
                <Text style={[
                    styles.englishName,
                    isSelected && styles.englishNameSelected
                ]}>
                    {item.name}
                </Text>
            </View>
            {isSelected && (
                <View style={styles.checkIcon}>
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                </View>
            )}
        </AnimatedTouchable>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // Background color handled by LinearGradient
    },
    header: {
        padding: 24,
        alignItems: 'center',
        paddingTop: 40,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    listContent: {
        padding: 16,
        paddingBottom: 120, // Extra padding for footer
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    languageCard: {
        width: (width - 48) / 2,
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 20,
        height: 110,
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
    },
    languageCardSelected: {
        borderColor: COLORS.primary,
        borderWidth: 2,
        backgroundColor: '#F0F9FF',
        shadowColor: COLORS.primary,
        shadowOpacity: 0.2,
        elevation: 6,
    },
    languageInfo: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center', // Center text
    },
    nativeName: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    nativeNameSelected: {
        color: COLORS.primary,
        transform: [{ scale: 1.05 }],
    },
    englishName: {
        fontSize: 14,
        color: COLORS.textLight,
        fontWeight: '500',
    },
    englishNameSelected: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    checkIcon: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        paddingBottom: 34,
    },
    continueButton: {
        borderRadius: 16,
        paddingVertical: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    continueButtonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
