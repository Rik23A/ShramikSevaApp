import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    Modal,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS } from '../../constants/config';
import { translations, LANGUAGES } from '../../constants/translations';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getProfile, updateProfile } from '../../services/userService';
import { uploadFile } from '../../services/uploadService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EditWorkerProfileModal from '../../components/profile/EditWorkerProfileModal';
import ProfileImagePicker from '../../components/profile/ProfileImagePicker';
import DocumentUploadSection from '../../components/profile/DocumentUploadSection';
import LanguageSelectionModal from '../../components/profile/LanguageSelectionModal';

export default function ProfileScreen() {
    const { user, logout, updateUser, refreshProfile } = useAuth();
    const { t, locale, changeLanguage } = useLanguage();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showLangModal, setShowLangModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const data = await getProfile();
            setProfile(data);

            // Update AuthContext with fresh profile data (includes workerType and skills)
            await updateUser(data);
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            t('logout'),
            t('logout_confirm'),
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: t('logout'),
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        router.replace('/auth/login');
                    }
                },
            ]
        );
    };

    const toggleAvailability = async () => {
        const newAvailability = profile.availability === 'available' ? 'unavailable' : 'available';
        try {
            await updateProfile({ availability: newAvailability });
            setProfile({ ...profile, availability: newAvailability });
            updateUser({ availability: newAvailability });
        } catch (error) {
            Alert.alert('Error', 'Failed to update availability');
        }
    };

    const handleLanguageChange = (langCode) => {
        changeLanguage(langCode);
        setShowLangModal(false);
    };

    const handleImageSelected = async (imageAsset) => {
        setUploading(true);
        try {
            // Upload image directly (uploadService handles FormData)
            const uploadResult = await uploadFile(imageAsset, (progress) => {
                console.log('Upload progress:', progress);
            });

            // Update profile with new image URL
            await updateProfile({ profilePicture: uploadResult.fileUrl });

            // Update local state
            setProfile({ ...profile, profilePicture: uploadResult.fileUrl });
            updateUser({ profilePicture: uploadResult.fileUrl });
        } catch (error) {
            console.error('Failed to upload image:', error);
            Alert.alert('Error', 'Failed to upload profile picture');
        } finally {
            setUploading(false);
        }
    };

    const handleSaveProfile = async (updatedData) => {
        try {
            await updateProfile(updatedData);
            setProfile({ ...profile, ...updatedData });
            updateUser(updatedData);
            Alert.alert('Success', 'Profile updated successfully');
        } catch (error) {
            throw error;
        }
    };

    if (loading) {
        return <LoadingSpinner fullScreen message={t('loading')} />;
    }

    const renderStars = (rating) => {
        const stars = [];
        for (let i = 0; i < 5; i++) {
            stars.push(
                <Ionicons
                    key={i}
                    name={i < Math.floor(rating) ? "star" : "star-outline"}
                    size={16}
                    color="#FFD700"
                />
            );
        }
        return stars;
    };

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: t('my_profile'),
                    headerStyle: { backgroundColor: COLORS.primary },
                    headerTintColor: COLORS.white,
                    headerShadowVisible: false,
                    headerRight: () => (
                        <TouchableOpacity onPress={() => setShowLangModal(true)} style={{ marginRight: 10 }}>
                            <Ionicons name="language" size={24} color={COLORS.white} />
                        </TouchableOpacity>
                    ),
                }}
            />

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Background */}
                <View style={styles.headerBackground} />

                {/* Overlapping Profile Card */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        <ProfileImagePicker
                            imageUri={profile?.profilePicture}
                            onImageSelected={handleImageSelected}
                            size={100}
                            editable={true}
                        />
                        <TouchableOpacity
                            style={[styles.statusIndicator, profile?.availability === 'available' ? styles.statusOnline : styles.statusOffline]}
                            onPress={toggleAvailability}
                        />
                    </View>

                    <Text style={styles.name}>{profile?.name || 'Worker'}</Text>

                    <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={14} color="#FFD700" />
                        <Text style={styles.ratingValue}>{profile?.rating?.toFixed(1) || '0.0'}</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.availabilityBadge, profile?.availability === 'available' ? styles.bgSuccess : styles.bgDanger]}
                        onPress={toggleAvailability}
                    >
                        <Text style={[styles.availabilityText, { color: profile?.availability === 'available' ? '#1B5E20' : '#B71C1C' }]}>
                            {profile?.availability === 'available' ? t('available') : t('unavailable')}
                        </Text>
                    </TouchableOpacity>

                    {/* Quick Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{profile?.stats?.totalJobs || 0}</Text>
                            <Text style={styles.statLabel}>{t('nav_jobs')}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>₹{profile?.stats?.totalEarnings || 0}</Text>
                            <Text style={styles.statLabel}>{t('total_earned')}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>
                                {profile?.hourlyRate ? `₹${profile.hourlyRate}` : '₹0'}
                            </Text>
                            <Text style={styles.statLabel}>{t('hourly_rate') || t('work_rate')}</Text>
                        </View>
                    </View>

                    {/* Bio Section */}
                    {profile?.bio && (
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionHeader}>{t('about_me')}</Text>
                            <Text style={styles.bioText}>{profile.bio}</Text>
                        </View>
                    )}
                    {/* Edit Profile Button */}
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => setShowEditModal(true)}
                    >
                        <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                        <Text style={styles.editButtonText}>{t('edit_profile')}</Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* Worker Type Chips */}
                {profile?.workerType && profile.workerType.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionHeader}>{t('worker_type')}</Text>
                        <View style={styles.tagsContainer}>
                            {profile.workerType.map((type, index) => (
                                <View key={index} style={styles.tag}>
                                    <Text style={styles.tagText}>{type}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Skills Chips */}
                {profile?.skills && profile.skills.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionHeader}>{t('skills')}</Text>
                        <View style={styles.tagsContainer}>
                            {profile.skills.map((skill, index) => (
                                <View key={index} style={styles.skillTag}>
                                    <Text style={styles.skillText}>{skill}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Info List */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionHeader}>{t('contact_info')}</Text>
                    <View style={styles.menuCard}>
                        <View style={styles.menuItem}>
                            <View style={[styles.menuIcon, { backgroundColor: '#E0F2F1' }]}>
                                <Ionicons name="call" size={20} color="#009688" />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuLabel}>{t('mobile')}</Text>
                                <Text style={styles.menuValue}>+91 {profile?.mobile}</Text>
                            </View>
                        </View>
                        {profile?.email && (
                            <View style={styles.menuItem}>
                                <View style={[styles.menuIcon, { backgroundColor: '#FFEBEE' }]}>
                                    <Ionicons name="mail" size={20} color="#F44336" />
                                </View>
                                <View style={styles.menuContent}>
                                    <Text style={styles.menuLabel}>{t('email')}</Text>
                                    <Text style={styles.menuValue}>{profile.email}</Text>
                                </View>
                            </View>
                        )}
                        {profile?.locationName && (
                            <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
                                <View style={[styles.menuIcon, { backgroundColor: '#EFEBE9' }]}>
                                    <Ionicons name="location" size={20} color="#795548" />
                                </View>
                                <View style={styles.menuContent}>
                                    <Text style={styles.menuLabel}>{t('location')}</Text>
                                    <Text style={styles.menuValue}>{profile.locationName}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* Personal Info Section */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionHeader}>{t('personal_info')}</Text>
                    <View style={styles.menuCard}>
                        <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
                            <View style={[styles.menuIcon, { backgroundColor: '#F3E5F5' }]}>
                                <Ionicons name="person-outline" size={20} color="#9C27B0" />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuLabel}>{t('gender')}</Text>
                                <Text style={styles.menuValue}>
                                    {profile?.gender ? t(profile.gender) : '-'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionHeader}>{t('bank_details')}</Text>
                    <View style={styles.menuCard}>
                        <View style={styles.menuItem}>
                            <View style={[styles.menuIcon, { backgroundColor: '#E8EAF6' }]}>
                                <Ionicons name="card-outline" size={20} color="#3F51B5" />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuLabel}>{t('bank_name')}</Text>
                                <Text style={styles.menuValue}>{profile?.bankDetails?.bankName || '-'}</Text>
                            </View>
                        </View>
                        <View style={styles.menuItem}>
                            <View style={[styles.menuIcon, { backgroundColor: '#F1F8E9' }]}>
                                <Ionicons name="wallet-outline" size={20} color="#689F38" />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuLabel}>{t('account_number')}</Text>
                                <Text style={styles.menuValue}>
                                    {profile?.bankDetails?.accountNumber
                                        ? `XXXX ${profile.bankDetails.accountNumber.slice(-4)}`
                                        : '-'}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
                            <View style={[styles.menuIcon, { backgroundColor: '#FFF8E1' }]}>
                                <Ionicons name="key-outline" size={20} color="#FFA000" />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuLabel}>{t('ifsc_code')}</Text>
                                <Text style={styles.menuValue}>{profile?.bankDetails?.ifscCode || '-'}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionHeader}>{t('experience')}</Text>
                    <View style={styles.menuCard}>
                        <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
                            <View style={[styles.menuIcon, { backgroundColor: '#E3F2FD' }]}>
                                <Ionicons name="briefcase" size={20} color={COLORS.primary} />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuValue}>
                                    {profile?.isFresher ? t('fresher') : `${profile?.experience || 0} ${t('years_exp')}`}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Document Upload Section */}
                <DocumentUploadSection />

                {/* Profile Completion Prompt */}
                {!profile?.isProfileComplete && (
                    <TouchableOpacity
                        style={styles.alertCard}
                        onPress={() => setShowEditModal(true)}
                    >
                        <View style={styles.alertContent}>
                            <Ionicons name="create" size={24} color={COLORS.warning} />
                            <View style={styles.alertTextContainer}>
                                <Text style={styles.alertTitle}>{t('complete_profile')}</Text>
                                <Text style={styles.alertSubtitle}>{t('complete_profile_sub')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.warning} />
                        </View>
                    </TouchableOpacity>
                )}

                <View style={styles.actions}>
                    <Button
                        title={t('logout')}
                        onPress={handleLogout}
                        style={styles.logoutButton}
                    />
                </View>
            </ScrollView>

            {/* Edit Profile Modal */}
            <EditWorkerProfileModal
                visible={showEditModal}
                onClose={() => setShowEditModal(false)}
                profile={profile}
                onSave={handleSaveProfile}
            />

            {/* Language Selection Modal */}
            <LanguageSelectionModal
                visible={showLangModal}
                onClose={() => setShowLangModal(false)}
                onSelect={handleLanguageChange}
                currentLocale={locale}
                t={t}
            />
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    contentContainer: {
        paddingBottom: 40,
    },
    headerBackground: {
        backgroundColor: COLORS.primary,
        height: 100,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        marginBottom: -95,
    },
    profileCard: {
        backgroundColor: COLORS.white,
        marginHorizontal: 20,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        marginBottom: 20,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusIndicator: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 3,
        borderColor: COLORS.white,
    },
    statusOnline: {
        backgroundColor: COLORS.success,
    },
    statusOffline: {
        backgroundColor: COLORS.danger,
    },
    name: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFDE7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFF59D',
        marginBottom: 12,
    },
    ratingValue: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
        marginLeft: 4,
    },
    availabilityBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    bgSuccess: {
        backgroundColor: '#E8F5E9',
    },
    bgDanger: {
        backgroundColor: '#FFEBEE',
    },
    availabilityText: {
        fontSize: 14,
        fontWeight: '600',
    },
    statsRow: {
        flexDirection: 'row',
        width: '100%',
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: COLORS.border,
    },
    statNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 16,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryLight + '10',
    },
    editButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
    },
    sectionContainer: {
        marginHorizontal: 20,
        marginBottom: 24,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 12,
        marginLeft: 4,
    },
    bioText: {
        fontSize: 15,
        color: COLORS.text,
        lineHeight: 22,
        backgroundColor: COLORS.white,
        padding: 16,
        borderRadius: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    menuCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    menuIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuContent: {
        flex: 1,
        marginLeft: 12,
    },
    menuLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    menuValue: {
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.text,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    tag: {
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 8,
    },
    tagText: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '500',
    },
    skillTag: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 8,
    },
    skillText: {
        fontSize: 13,
        color: COLORS.text,
    },
    alertCard: {
        marginHorizontal: 20,
        marginBottom: 24,
        backgroundColor: COLORS.warningLight,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FFE082',
    },
    alertContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    alertTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    alertTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#F57C00',
    },
    alertSubtitle: {
        fontSize: 13,
        color: '#E65100',
    },
    actions: {
        padding: 20,
        marginBottom: 20,
    },
    logoutButton: {
        backgroundColor: COLORS.danger,
    },
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
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
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
    langLabel: {
        fontSize: 16,
        color: COLORS.text,
        flex: 1,
    },
    selectedLangText: {
        color: COLORS.primary,
        fontWeight: '600',
    },
});
