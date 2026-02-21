import React from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import { LANGUAGES } from '../../constants/translations';

const { height } = Dimensions.get('window');

const LanguageSelectionModal = ({ visible, onClose, onSelect, currentLocale, t }) => {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('change_language')}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.listContainer}>
                        <FlatList
                            data={LANGUAGES}
                            keyExtractor={(item) => item.code}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.langOption,
                                        currentLocale === item.code && styles.selectedLang
                                    ]}
                                    onPress={() => onSelect(item.code)}
                                >
                                    <Text style={styles.langIcon}>{item.icon}</Text>
                                    <View style={styles.langTextContainer}>
                                        <Text style={[
                                            styles.langLabel,
                                            currentLocale === item.code && styles.selectedLangText
                                        ]}>
                                            {item.label}
                                        </Text>
                                        <Text style={styles.langNative}>{item.native || item.label}</Text>
                                    </View>
                                    {currentLocale === item.code && (
                                        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        />
                    </View>
                </View>
            </View>
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
