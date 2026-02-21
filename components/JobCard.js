import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, WORKER_TYPES } from '../constants/config';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 360;

const JobCard = ({ job, onPress, isRecommended }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const formatSalary = (salary) => {
        return `₹${salary.toLocaleString('en-IN')}`;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-IN');
    };

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.97,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={[styles.card, isRecommended && styles.recommendedCard]}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
            >
                {isRecommended && (
                    <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.recommendedBadge}
                    >
                        <Ionicons name="sparkles" size={12} color="#FFF" />
                        <Text style={styles.recommendedText}>Recommended</Text>
                    </LinearGradient>
                )}

                <View style={styles.header}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title} numberOfLines={2}>{job.title}</Text>
                        <View style={[styles.statusDot,
                        job.status === 'open' ? { backgroundColor: COLORS.success } :
                            job.status === 'closed' ? { backgroundColor: COLORS.danger } :
                                { backgroundColor: COLORS.warning }
                        ]} />
                    </View>
                </View>

                {job.employer?.companyName && (
                    <View style={styles.row}>
                        <Ionicons name="business-outline" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.company} numberOfLines={1}>{job.employer.companyName}</Text>
                    </View>
                )}

                {/* Skills Tags */}
                {job.skills && job.skills.length > 0 && (
                    <View style={styles.skillsContainer}>
                        {job.skills.slice(0, 3).map((skill, index) => (
                            <View key={index} style={styles.skillTag}>
                                <Text style={styles.skillText}>{skill}</Text>
                            </View>
                        ))}
                        {job.skills.length > 3 && (
                            <View style={styles.moreSkillsTag}>
                                <Text style={styles.moreSkillsText}>+{job.skills.length - 3}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Enhanced Salary Display */}
                <View style={styles.salaryContainer}>
                    <View style={styles.salaryBadge}>
                        <Ionicons name="cash" size={18} color={COLORS.success} />
                        <Text style={styles.salaryAmount}>{formatSalary(job.salary)}</Text>
                        <Text style={styles.salaryPeriod}>/ day</Text>
                    </View>
                </View>

                <View style={styles.infoGrid}>
                    {/* Location */}
                    <View style={styles.infoItem}>
                        <Ionicons name="location" size={14} color={COLORS.primary} />
                        <Text style={styles.infoText} numberOfLines={1}>
                            {job.location?.address ? job.location.address.split(',')[0].trim() : 'Remote'}
                        </Text>
                    </View>

                    {/* Experience */}
                    <View style={styles.infoItem}>
                        <Ionicons name="briefcase" size={14} color={COLORS.primary} />
                        <Text style={styles.infoText}>
                            {job.minExperience === 0 && job.maxExperience === 0 ? 'Fresher' : `${job.minExperience}-${job.maxExperience} Yrs`}
                        </Text>
                    </View>

                    {/* Openings */}
                    <View style={styles.infoItem}>
                        <Ionicons name="people" size={14} color={COLORS.primary} />
                        <Text style={styles.infoText}>{job.totalOpenings || 1} Openings</Text>
                    </View>

                    {/* Applicants */}
                    <View style={styles.infoItem}>
                        <Ionicons name="person" size={14} color={COLORS.primary} />
                        <Text style={styles.infoText}>{job.applicants?.length || 0} Applied</Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <View style={styles.meta}>
                        <View style={[styles.typeBadge,
                        job.workType === 'permanent' && styles.permanentBadge
                        ]}>
                            <Text style={styles.typeText}>{job.workType}</Text>
                        </View>
                        <Text style={styles.date}>{formatDate(job.createdAt)}</Text>
                    </View>

                    <TouchableOpacity style={styles.viewButton} onPress={onPress}>
                        <Text style={styles.viewButtonText}>View</Text>
                        <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.card,
        borderRadius: isSmallScreen ? 14 : 16,
        padding: isSmallScreen ? 14 : 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    recommendedCard: {
        borderColor: '#667eea',
        borderWidth: 1.5,
        backgroundColor: '#FAFBFF',
    },
    recommendedBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        borderBottomLeftRadius: 16,
        borderTopRightRadius: isSmallScreen ? 14 : 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 4,
    },
    recommendedText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    header: {
        marginBottom: 10,
    },
    titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingRight: 80, // Space for recommended badge
    },
    title: {
        fontSize: isSmallScreen ? 15 : 17,
        fontWeight: '700',
        color: COLORS.text,
        flex: 1,
        marginRight: 8,
        letterSpacing: -0.3,
        lineHeight: isSmallScreen ? 20 : 22,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 6,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    company: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginLeft: 6,
        fontWeight: '500',
        flex: 1,
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12,
    },
    skillTag: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#90CAF9',
    },
    skillText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#1976D2',
    },
    moreSkillsTag: {
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    moreSkillsText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    salaryContainer: {
        marginBottom: 12,
    },
    salaryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        alignSelf: 'flex-start',
        gap: 6,
        borderWidth: 1,
        borderColor: '#A5D6A7',
    },
    salaryAmount: {
        fontSize: isSmallScreen ? 16 : 18,
        fontWeight: '800',
        color: COLORS.success,
        letterSpacing: -0.5,
    },
    salaryPeriod: {
        fontSize: 12,
        color: '#66BB6A',
        fontWeight: '500',
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 12,
        backgroundColor: COLORS.background,
        padding: 12,
        borderRadius: 10,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        minWidth: isSmallScreen ? '45%' : '42%',
    },
    infoText: {
        fontSize: 12,
        color: COLORS.text,
        fontWeight: '600',
        flex: 1,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
    },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    typeBadge: {
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#FFB74D',
    },
    permanentBadge: {
        backgroundColor: '#E8F5E9',
        borderColor: '#81C784',
    },
    typeText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.text,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    date: {
        fontSize: 11,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    viewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
        borderWidth: 1,
        borderColor: '#90CAF9',
    },
    viewButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
    },
});

export default JobCard;
