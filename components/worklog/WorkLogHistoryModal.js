import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import { useLanguage } from '../../context/LanguageContext';
import { getWorkLogsByJob } from '../../services/worklogService';
import { getFullImageUrl } from '../../utils/imageUtil';

const WorkLogHistoryModal = ({ visible, jobId, onClose }) => {
    const { t } = useLanguage();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPhoto, setSelectedPhoto] = useState(null);

    useEffect(() => {
        if (visible && jobId) {
            fetchLogs();
        }
    }, [visible, jobId]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await getWorkLogsByJob(jobId);
            setLogs(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch work logs:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    const formatDate = (dateString) => {
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>{t('work_history')}</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : logs.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="calendar-outline" size={48} color={COLORS.textSecondary} />
                        <Text style={styles.emptyText}>{t('no_work_logs_found')}</Text>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.listContainer}>
                        {logs.map((log, index) => (
                            <View key={log._id} style={styles.logCard}>
                                <View style={styles.logHeader}>
                                    <View>
                                        <Text style={styles.logDate}>{formatDate(log.workDate)}</Text>
                                        <Text style={styles.dayCount}>{t('day')} {logs.length - index}</Text>
                                    </View>
                                    <View style={[
                                        styles.statusBadge,
                                        log.status === 'completed' && styles.statusCompleted,
                                        log.status === 'in-progress' && styles.statusProgress,
                                        log.status === 'incomplete' && styles.statusIncomplete,
                                    ]}>
                                        <Text style={[
                                            styles.statusText,
                                            log.status === 'completed' && styles.statusTextCompleted,
                                            log.status === 'in-progress' && styles.statusTextProgress,
                                            log.status === 'incomplete' && styles.statusTextIncomplete,
                                        ]}>{log.status}</Text>
                                    </View>
                                </View>

                                <View style={styles.timeContainer}>
                                    <View style={styles.timeBlock}>
                                        <Text style={styles.timeLabel}>{t('start_time')}</Text>
                                        <Text style={styles.timeValue}>
                                            {log.startTime ? formatTime(log.startTime) : '-'}
                                        </Text>
                                    </View>
                                    <View style={styles.durationLine} />
                                    <View style={styles.timeBlock}>
                                        <Text style={styles.timeLabel}>{t('end_time')}</Text>
                                        <Text style={styles.timeValue}>
                                            {log.endTime ? formatTime(log.endTime) : '-'}
                                        </Text>
                                    </View>
                                </View>

                                {(log.startPhoto || log.endPhoto) && (
                                    <View style={styles.photosContainer}>
                                        {log.startPhoto && (
                                            <TouchableOpacity
                                                style={styles.photoWrapper}
                                                onPress={() => setSelectedPhoto(getFullImageUrl(log.startPhoto))}
                                            >
                                                <Image
                                                    source={{ uri: getFullImageUrl(log.startPhoto) }}
                                                    style={styles.logPhoto}
                                                />
                                                <View style={styles.photoLabel}>
                                                    <Text style={styles.photoLabelText}>{t('start')}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        )}
                                        {log.endPhoto && (
                                            <TouchableOpacity
                                                style={styles.photoWrapper}
                                                onPress={() => setSelectedPhoto(getFullImageUrl(log.endPhoto))}
                                            >
                                                <Image
                                                    source={{ uri: getFullImageUrl(log.endPhoto) }}
                                                    style={styles.logPhoto}
                                                />
                                                <View style={styles.photoLabel}>
                                                    <Text style={styles.photoLabelText}>{t('end')}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>

            {/* Full Screen Photo Modal */}
            <Modal
                visible={!!selectedPhoto}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedPhoto(null)}
            >
                <View style={styles.fullScreenModalContainer}>
                    <TouchableOpacity
                        style={styles.fullScreenCloseButton}
                        onPress={() => setSelectedPhoto(null)}
                    >
                        <Ionicons name="close-circle" size={48} color={COLORS.white} />
                    </TouchableOpacity>
                    <Image
                        source={{ uri: selectedPhoto }}
                        style={styles.fullScreenPhoto}
                        resizeMode="contain"
                    />
                </View>
            </Modal>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
    },
    closeButton: {
        padding: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 12,
        color: COLORS.textSecondary,
        fontSize: 16,
    },
    listContainer: {
        padding: 16,
    },
    logCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    logDate: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    dayCount: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: COLORS.border,
    },
    statusCompleted: { backgroundColor: 'rgba(76, 175, 80, 0.1)' },
    statusProgress: { backgroundColor: 'rgba(33, 150, 243, 0.1)' },
    statusIncomplete: { backgroundColor: 'rgba(244, 67, 54, 0.1)' },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    statusTextCompleted: { color: COLORS.success },
    statusTextProgress: { color: COLORS.secondary },
    statusTextIncomplete: { color: COLORS.danger },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        backgroundColor: COLORS.background,
        padding: 12,
        borderRadius: 12,
    },
    timeBlock: {
        alignItems: 'center',
        flex: 1,
    },
    timeLabel: {
        fontSize: 10,
        color: COLORS.textSecondary,
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    timeValue: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    durationLine: {
        height: 1,
        flex: 1,
        backgroundColor: COLORS.border,
        marginHorizontal: 16,
    },
    photosContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    photoWrapper: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: COLORS.background,
    },
    logPhoto: {
        width: '100%',
        height: '100%',
    },
    photoLabel: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    photoLabelText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    fullScreenModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenPhoto: {
        width: '100%',
        height: '100%',
    },
    fullScreenCloseButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 10,
    },
});

export default WorkLogHistoryModal;
