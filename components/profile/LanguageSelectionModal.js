import React from 'react';
import { View, Text, Modal, TouchableOpacity, TouchableWithoutFeedback, FlatList, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import { LANGUAGES as TRANSLATION_LANGUAGES } from '../../constants/translations';

const { height } = Dimensions.get('window');

const DEFAULT_LANGUAGES = [
    { code: 'en', label: 'English', native: 'English', icon: '🌐' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी', icon: '🇮🇳' },
    { code: 'mr', label: 'Marathi', native: 'मराठी', icon: '🇮🇳' },
    { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', icon: '🇮🇳' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்', icon: '🇮🇳' },
    { code: 'te', label: 'Telugu', native: 'తెలుగు', icon: '🇮🇳' },
    { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', icon: '🇮🇳' },
    { code: 'bn', label: 'Bengali', native: 'বাংলা', icon: '🇮🇳' },
    { code: 'ml', label: 'Malayalam', native: 'മലയാളം', icon: '🇮🇳' },
    { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', icon: '🇮🇳' },
    { code: 'or', label: 'Odia', native: 'ଓଡ଼িଆ', icon: '🇮🇳' },
    { code: 'as', label: 'Assamese', native: 'অসমীয়া', icon: '🇮🇳' },
];

const LanguageSelectionModal = ({ visible, onClose, onSelect, currentLocale, t }) => {
    const listData = (TRANSLATION_LANGUAGES && TRANSLATION_LANGUAGES.length > 0) ? TRANSLATION_LANGUAGES : DEFAULT_LANGUAGES;
    const titleText = (t && typeof t === 'function' ? t('change_language') : 'Change Language') || 'Change Language';

    return (
        <Modal
            visible={!!visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity 
                style={styles.modalOverlay} 
                activeOpacity={1} 
                onPress={onClose}
            >
                <TouchableWithoutFeedback>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={styles.titleRow}>
                                <Ionicons name="language" size={22} color={COLORS.primary} style={{ marginRight: 8 }} />
                                <Text style={styles.modalTitle}>{titleText}</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Ionicons name="close" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.listContainer}>
                            <FlatList
                                data={listData}
                                keyExtractor={(item) => item.code}
                                renderItem={({ item }) => {
                                    const isSelected = currentLocale === item.code;
                                    return (
                                        <TouchableOpacity
                                            style={[
                                                styles.langOption,
                                                isSelected && styles.selectedLang
                                            ]}
                                            onPress={() => {
                                                if (onSelect) onSelect(item.code);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.langIcon}>{item.icon || '🌐'}</Text>
                                            <View style={styles.langTextContainer}>
                                                <Text style={[
                                                    styles.langLabel,
                                                    isSelected && styles.selectedLangText
                                                ]}>
                                                    {item.label || item.name}
                                                </Text>
                                                <Text style={styles.langNative}>{item.native || item.label}</Text>
                                            </View>
                                            {isSelected && (
                                                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                }}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 20 }}
                            />
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        maxHeight: height * 0.8, // Limit height to 80% of screen
        display: 'flex',
        flexDirection: 'column',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingBottom: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
    },
    closeButton: {
        padding: 4,
    },
    listContainer: {
        flexShrink: 1, // Allow list to shrink if needed
    },
    langOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    selectedLang: {
        backgroundColor: '#F0F7FF',
        marginHorizontal: -24,
        paddingHorizontal: 24,
        borderBottomColor: 'transparent',
    },
    langIcon: {
        fontSize: 24,
        marginRight: 16,
    },
    langTextContainer: {
        flex: 1,
    },
    langLabel: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '500',
    },
    langNative: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    selectedLangText: {
        color: COLORS.primary,
        fontWeight: '700',
    },
});

export default LanguageSelectionModal;
