import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/config';

import { getFullImageUrl } from '../utils/imageUtil';

const WorkerCard = ({ worker, onPress, onHire }) => {
    const renderStars = (rating) => {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;

        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars.push(<Ionicons key={i} name="star" size={14} color="#FFD700" />);
            } else if (i === fullStars && hasHalfStar) {
                stars.push(<Ionicons key={i} name="star-half" size={14} color="#FFD700" />);
            } else {
                stars.push(<Ionicons key={i} name="star-outline" size={14} color="#FFD700" />);
            }
        }
        return stars;
    };

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
            <View style={styles.header}>
                <View style={styles.avatar}>
                    {worker.profilePicture ? (
                        <Image
                            source={{ uri: getFullImageUrl(worker.profilePicture) }}
                            style={styles.avatarImage}
                            onLoad={() => console.log('WorkerCard Image Loaded:', getFullImageUrl(worker.profilePicture))}
                            onError={(e) => console.error('WorkerCard Image Error:', e.nativeEvent.error, getFullImageUrl(worker.profilePicture))}
                        />
                    ) : (
                        <Ionicons name="person" size={30} color={COLORS.textSecondary} />
                    )}
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{worker.name || 'Worker'}</Text>
                    <View style={styles.ratingContainer}>
                        {renderStars(worker.rating || 0)}
                        <Text style={styles.ratingText}>({worker.rating?.toFixed(1) || '0.0'})</Text>
                    </View>
                </View>
                <View style={[styles.availabilityBadge,
                worker.availability === 'available' && styles.available
                ]}>
                    <Text style={styles.availabilityText}>
                        {worker.availability === 'available' ? 'Available' : 'Unavailable'}
                    </Text>
                </View>
            </View>

            {worker.workerType && worker.workerType.length > 0 && (
                <View style={styles.typesContainer}>
                    {worker.workerType.slice(0, 2).map((type, index) => (
                        <View key={index} style={styles.typeBadge}>
                            <Text style={styles.typeText}>{type}</Text>
                        </View>
                    ))}
                    {worker.workerType.length > 2 && (
                        <Text style={styles.moreTypes}>+{worker.workerType.length - 2}</Text>
                    )}
                </View>
            )}

            <View style={styles.details}>
                <View style={styles.detailItem}>
                    <Ionicons name="briefcase-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>
                        {worker.isFresher ? 'Fresher' : `${worker.experience || 0} yrs exp`}
                    </Text>
                </View>
                {(worker.locationName || (typeof worker.location === 'string' && worker.location)) && (
                    <View style={styles.detailItem}>
                        <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.detailText} numberOfLines={1}>
                            {worker.locationName || worker.location}
                        </Text>
                    </View>
                )}
            </View>

            {worker.skills && worker.skills.length > 0 && (
                <View style={styles.skillsContainer}>
                    {worker.skills.slice(0, 4).map((skill, index) => (
                        <View key={index} style={styles.skillBadge}>
                            <Text style={styles.skillText}>{skill}</Text>
                        </View>
                    ))}
                </View>
            )}

            {onHire && (
                <TouchableOpacity style={styles.hireButton} onPress={onHire}>
                    <Text style={styles.hireButtonText}>Hire Worker</Text>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    info: {
        flex: 1,
        marginLeft: 12,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    ratingText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginLeft: 4,
    },
    availabilityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        backgroundColor: COLORS.textSecondary,
    },
    available: {
        backgroundColor: COLORS.success,
    },
    availabilityText: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.white,
    },
    typesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 8,
    },
    typeBadge: {
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginRight: 6,
        marginBottom: 4,
    },
    typeText: {
        fontSize: 11,
        color: COLORS.primary,
        fontWeight: '500',
    },
    moreTypes: {
        fontSize: 11,
        color: COLORS.textSecondary,
        alignSelf: 'center',
    },
    details: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    detailText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginLeft: 4,
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    skillBadge: {
        backgroundColor: COLORS.background,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginRight: 6,
        marginBottom: 4,
    },
    skillText: {
        fontSize: 10,
        color: COLORS.text,
    },
    hireButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 10,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 12,
    },
    hireButtonText: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 14,
    },
});

export default WorkerCard;
