import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    Modal,
    Image,
    Linking,
    Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, API_URL } from '../../constants/config';
import { useLanguage } from '../../context/LanguageContext';
import { getWorkerWorkLogs } from '../../services/worklogService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const getFullImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const baseUrl = API_URL.replace(/\/api\/?$/, '');
    return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

export default function WorkLogsScreen() {
    const { t } = useLanguage();
    const [workLogs, setWorkLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);

    useEffect(() => {
        fetchWorkLogs();
    }, []);

    const fetchWorkLogs = async () => {
        try {
            setLoading(true);
            const data = await getWorkerWorkLogs();
            setWorkLogs(data);
        } catch (error) {
            console.error('Failed to fetch work logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredAndGroupedLogs = useMemo(() => {
        if (!workLogs || workLogs.length === 0) return [];

        let filtered = workLogs.filter(log => {
            const searchLower = searchQuery.toLowerCase();
            const jobTitle = log.job?.title?.toLowerCase() || "";
            const employerName = log.job?.employer?.name?.toLowerCase() || "";
            const companyName = log.job?.employer?.companyName?.toLowerCase() || "";
            const status = log.status?.toLowerCase() || "";

            const searchMatch = jobTitle.includes(searchLower) ||
                employerName.includes(searchLower) ||
                companyName.includes(searchLower) ||
                status.includes(searchLower);

            let dateMatch = true;
            const logDate = new Date(log.workDate);
            logDate.setHours(0, 0, 0, 0);

            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                if (logDate < start) dateMatch = false;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(0, 0, 0, 0);
                if (logDate > end) dateMatch = false;
            }

            return searchMatch && dateMatch;
        });

        // Group by Date
        const grouped = {};
        filtered.forEach(log => {
            if (log.workDate) {
                const date = new Date(log.workDate).toLocaleDateString('en-CA');
                if (!grouped[date]) {
                    grouped[date] = [];
                }
                grouped[date].push(log);
            }
        });

        const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        return sortedDates.map(date => ({
            date,
            data: grouped[date].sort((a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime())
        }));

    }, [workLogs, searchQuery, startDate, endDate]);

    const formatDuration = (startTime, endTime) => {
        if (!startTime) return "N/A";
        const start = new Date(startTime).getTime();
        const end = endTime ? new Date(endTime).getTime() : Date.now();
        const durationMs = end - start;

        const seconds = Math.floor(durationMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        const parts = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
        if (seconds % 60 > 0 && parts.length === 0) parts.push(`${seconds % 60}s`);

        return parts.length > 0 ? parts.join(' ') : '0m';
    };

    const StatusBadge = ({ status }) => {
        let bgColor, textColor, borderColor;
        switch (status) {
            case 'completed':
                bgColor = 'rgba(34, 197, 94, 0.1)';
                textColor = '#22c55e';
                borderColor = 'rgba(34, 197, 94, 0.2)';
                break;
            case 'in-progress':
                bgColor = 'rgba(59, 130, 246, 0.1)';
                textColor = '#3b82f6';
                borderColor = 'rgba(59, 130, 246, 0.2)';
                break;
            default:
                bgColor = 'rgba(234, 179, 8, 0.1)';
                textColor = '#eab308';
                borderColor = 'rgba(234, 179, 8, 0.2)';
        }
        return (
            <View style={[styles.statusBadge, { backgroundColor: bgColor, borderColor }]}>
                <Text style={[styles.statusText, { color: textColor }]}>{status.toUpperCase()}</Text>
            </View>
        );
    };

    const handleStartDateChange = (event, selectedDate) => {
        setShowStartPicker(Platform.OS === 'ios');

        if (event.type === 'dismissed') {
            return; // Do nothing if the user cancelled
        }

        if (selectedDate) {
            setStartDate(selectedDate);
            // Auto-adjust end date if it's before the new start date
            if (endDate && selectedDate > endDate) {
                setEndDate(selectedDate);
            }
        }
    };

    const handleEndDateChange = (event, selectedDate) => {
        setShowEndPicker(Platform.OS === 'ios');

        if (event.type === 'dismissed') {
            return; // Do nothing if the user cancelled
        }

        if (selectedDate) {
            setEndDate(selectedDate);
            // Auto-adjust start date if it's after the new end date
            if (startDate && selectedDate < startDate) {
                setStartDate(selectedDate);
            }
        }
    };

    const formatDateString = (date) => {
        if (!date) return '';
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const renderPhoto = (photoUrl, label) => {
        if (!photoUrl) return null;
        const fullPhotoUrl = getFullImageUrl(photoUrl);
        return (
            <TouchableOpacity
                style={styles.photoContainer}
                onPress={() => {
                    if (fullPhotoUrl) setSelectedPhoto(fullPhotoUrl);
                }}
                activeOpacity={0.8}
            >
                <Image source={{ uri: fullPhotoUrl }} style={styles.photo} />
                <View style={styles.photoOverlay}>
                    <Ionicons name="camera" size={16} color="#fff" />
                </View>
                <View style={styles.photoLabelContainer}>
                    <Text style={styles.photoLabel}>{label}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderItem = ({ item }) => (
        <View style={styles.logCard}>
            <View style={styles.logHeader}>
                <Text style={styles.jobTitle} numberOfLines={1}>{item.job?.title || t('unknown_job') || 'Unknown Job'}</Text>
                <StatusBadge status={item.status} />
            </View>

            <View style={styles.detailsGrid}>
                <View style={styles.infoRowGrid}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="business" size={14} color={COLORS.textSecondary} />
                    </View>
                    <Text style={styles.infoText} numberOfLines={1}>
                        {item.job?.employer?.companyName || item.job?.employer?.name || t('unknown_employer') || 'Unknown Employer'}
                    </Text>
                </View>

                {item.startTime && (
                    <View style={styles.infoRowGrid}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                        </View>
                        <Text style={styles.infoText} numberOfLines={1}>
                            {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {item.endTime ? ` - ${new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ` - (${t('active') || 'Active'})`}
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.footerContainer}>
                <View style={styles.footerRow}>
                    {item.startTime && item.endTime && (
                        <View style={styles.durationBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                            <Text style={styles.durationText}>
                                {t('duration') || 'Duration'}: {formatDuration(item.startTime, item.endTime)}
                            </Text>
                        </View>
                    )}
                </View>

                {(item.startPhoto || item.endPhoto) && (
                    <View style={styles.photosRow}>
                        {renderPhoto(item.startPhoto, "START")}
                        {renderPhoto(item.endPhoto, "END")}
                    </View>
                )}
            </View>
        </View>
    );

    if (loading) {
        return <LoadingSpinner fullScreen />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={COLORS.textSecondary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={t('search') || 'Search jobs, employers...'}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={COLORS.textSecondary}
                />
            </View>

            <View style={styles.dateFilterContainer}>
                <TouchableOpacity
                    style={styles.dateInputWrapper}
                    onPress={() => setShowStartPicker(true)}
                >
                    <Ionicons name="calendar-outline" size={16} color={startDate ? COLORS.primary : COLORS.textSecondary} />
                    <Text style={[styles.dateInput, !startDate && styles.dateInputPlaceholder]}>
                        {startDate ? formatDateString(startDate) : (t('start_date') || 'Start Date')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.dateInputWrapper}
                    onPress={() => setShowEndPicker(true)}
                >
                    <Ionicons name="calendar-outline" size={16} color={endDate ? COLORS.primary : COLORS.textSecondary} />
                    <Text style={[styles.dateInput, !endDate && styles.dateInputPlaceholder]}>
                        {endDate ? formatDateString(endDate) : (t('end_date') || 'End Date')}
                    </Text>
                </TouchableOpacity>

                {(startDate || endDate) && (
                    <TouchableOpacity
                        style={styles.clearDateBtn}
                        onPress={() => {
                            setStartDate(null);
                            setEndDate(null);
                        }}
                    >
                        <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            {showStartPicker && (
                <DateTimePicker
                    value={startDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={handleStartDateChange}
                    maximumDate={endDate || undefined}
                />
            )}

            {showEndPicker && (
                <DateTimePicker
                    value={endDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={handleEndDateChange}
                    minimumDate={startDate || undefined}
                />
            )}

            {filteredAndGroupedLogs.length > 0 ? (
                <FlatList
                    data={filteredAndGroupedLogs}
                    keyExtractor={(item) => item.date}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <View style={styles.dateGroup}>
                            <View style={styles.dateHeader}>
                                <View style={styles.dateIcon}>
                                    <Ionicons name="calendar" size={18} color={COLORS.primary} />
                                </View>
                                <Text style={styles.dateText}>
                                    {new Date(item.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </Text>
                            </View>
                            {item.data.map(log => (
                                <React.Fragment key={log._id}>
                                    {renderItem({ item: log })}
                                </React.Fragment>
                            ))}
                        </View>
                    )}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconContainer}>
                        <Ionicons name="clipboard-outline" size={48} color={COLORS.textSecondary} />
                    </View>
                    <Text style={styles.emptyTitle}>
                        {searchQuery ? (t('no_results_found') || 'No Logs Found') : (t('no_logs_yet') || 'No Logs Yet')}
                    </Text>
                    <Text style={styles.emptyText}>
                        {searchQuery ?
                            (t('try_adjusting_search') || 'Try adjusting your search keywords.') :
                            (t('logs_will_appear_here') || 'When you start working on jobs, your activity logs will appear here.')}
                    </Text>
                </View>
            )}

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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        marginHorizontal: 20,
        marginBottom: 10,
        paddingHorizontal: 15,
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    dateFilterContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginBottom: 20,
        alignItems: 'center',
        gap: 10,
    },
    dateInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    dateInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
    dateInputPlaceholder: {
        color: COLORS.textSecondary,
        fontWeight: '400',
    },
    clearDateBtn: {
        padding: 4,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: COLORS.text,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    dateGroup: {
        marginBottom: 24,
    },
    dateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    dateIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    dateText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    logCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 3,
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    jobTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginRight: 10,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 12,
        marginBottom: 16,
    },
    infoRowGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '50%',
        marginBottom: 10,
        paddingRight: 8,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    footerContainer: {
        flexDirection: 'column',
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.background,
    },
    durationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(34, 197, 94, 0.05)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.15)',
        gap: 6,
    },
    durationText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#16a34a',
    },
    photosRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    photoContainer: {
        width: 80,
        height: 80,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: COLORS.background,
        position: 'relative',
        transform: [{ rotate: '-2deg' }],
    },
    photo: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    photoOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    photoLabelContainer: {
        position: 'absolute',
        top: 4,
        left: 4,
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    photoLabel: {
        fontSize: 8,
        fontWeight: '900',
        color: '#000',
        textTransform: 'uppercase',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 15,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
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
