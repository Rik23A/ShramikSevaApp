import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/config';
import { useLanguage } from '../../context/LanguageContext';
import { openStore } from '../../services/updateService';

const { width } = Dimensions.get('window');

export default function AppUpdateModal({
    visible,
    updateInfo,
    onDismiss
}) {
    const { t } = useLanguage();

    if (!visible || !updateInfo || !updateInfo.updateAvailable) {
        return null;
    }

    const {
        forceUpdate = false,
        currentVersion = '1.0.0',
        latestVersion = '1.0.1',
        title = 'New Update Available 🎉',
        message = 'A newer version of Shramik Seva is available on the Google Play Store.',
        releaseNotes = [],
        storeUrl,
        marketUrl
    } = updateInfo;

    const handleUpdatePress = () => {
        openStore(storeUrl, marketUrl);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => {
                if (!forceUpdate && onDismiss) {
                    onDismiss();
                }
            }}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header Banner */}
                    <LinearGradient
                        colors={['#1565C0', '#1976D2', '#42A5F5']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.headerBanner}
                    >
                        <View style={styles.iconCircle}>
                            <MaterialCommunityIcons name="rocket-launch" size={36} color="#1976D2" />
                        </View>
                        <Text style={styles.bannerTitle}>{title}</Text>
                        <View style={styles.versionBadgeRow}>
                            <View style={styles.versionPill}>
                                <Text style={styles.versionPillText}>{t('current_version_label') || 'Current'}: v{currentVersion}</Text>
                            </View>
                            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={{ marginHorizontal: 6 }} />
                            <View style={[styles.versionPill, styles.versionPillNew]}>
                                <Text style={[styles.versionPillText, styles.versionPillNewText]}>
                                    {t('latest_version_label') || 'Latest'}: v{latestVersion}
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>

                    {/* Content Section */}
                    <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentInner}>
                        <Text style={styles.messageText}>{message}</Text>

                        {/* Release notes */}
                        {releaseNotes && releaseNotes.length > 0 && (
                            <View style={styles.notesBox}>
                                <View style={styles.notesHeader}>
                                    <Ionicons name="sparkles" size={16} color="#1976D2" />
                                    <Text style={styles.notesHeaderText}>{t('whats_new') || "What's New in This Version"}</Text>
                                </View>
                                {releaseNotes.map((note, index) => (
                                    <View key={index} style={styles.noteItem}>
                                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={styles.noteCheck} />
                                        <Text style={styles.noteText}>{note}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {forceUpdate && (
                            <View style={styles.forceUpdateNotice}>
                                <Ionicons name="alert-circle" size={18} color="#D32F2F" />
                                <Text style={styles.forceUpdateText}>
                                    {t('force_update_notice') || 'This update is mandatory to ensure service security and compatibility.'}
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Actions */}
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={handleUpdatePress}
                            style={styles.updateButtonWrapper}
                        >
                            <LinearGradient
                                colors={['#1976D2', '#2196F3']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.updateButton}
                            >
                                <Ionicons
                                    name={Platform.OS === 'android' ? 'logo-google-playstore' : 'logo-apple-appstore'}
                                    size={20}
                                    color="#FFFFFF"
                                    style={{ marginRight: 8 }}
                                />
                                <Text style={styles.updateButtonText}>
                                    {Platform.OS === 'android'
                                        ? (t('update_on_play_store') || 'Update on Google Play')
                                        : (t('update_now') || 'Update Now')}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {!forceUpdate && (
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={onDismiss}
                                style={styles.laterButton}
                            >
                                <Text style={styles.laterButtonText}>{t('remind_me_later') || 'Remind Me Later'}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    container: {
        width: Math.min(width - 32, 400),
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 12
    },
    headerBanner: {
        paddingTop: 28,
        paddingBottom: 22,
        paddingHorizontal: 20,
        alignItems: 'center'
    },
    iconCircle: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6
    },
    bannerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 10
    },
    versionBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
    },
    versionPill: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12
    },
    versionPillText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600'
    },
    versionPillNew: {
        backgroundColor: '#FFFFFF'
    },
    versionPillNewText: {
        color: '#1565C0',
        fontWeight: '700'
    },
    contentScroll: {
        maxHeight: 250
    },
    contentInner: {
        padding: 20
    },
    messageText: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 16
    },
    notesBox: {
        backgroundColor: '#F3F8FF',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#D0E3FA',
        marginBottom: 12
    },
    notesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 6
    },
    notesHeaderText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1976D2'
    },
    noteItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8
    },
    noteCheck: {
        marginTop: 2,
        marginRight: 8
    },
    noteText: {
        fontSize: 12.5,
        color: '#374151',
        flex: 1,
        lineHeight: 18
    },
    forceUpdateNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFCDD2',
        gap: 8,
        marginTop: 4
    },
    forceUpdateText: {
        fontSize: 11.5,
        color: '#C62828',
        fontWeight: '600',
        flex: 1
    },
    actionsContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 4,
        gap: 10
    },
    updateButtonWrapper: {
        width: '100%',
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#1976D2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    updateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20
    },
    updateButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700'
    },
    laterButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10
    },
    laterButtonText: {
        fontSize: 13.5,
        color: '#6B7280',
        fontWeight: '600'
    }
});
