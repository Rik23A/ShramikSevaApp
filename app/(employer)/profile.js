import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Linking,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS, API_URL, WEB_URL } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getProfile, updateProfile, getEmployerDashboard } from '../../services/userService';
import { uploadFile } from '../../services/uploadService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EditEmployerProfileModal from '../../components/profile/EditEmployerProfileModal';
import ProfileImagePicker from '../../components/profile/ProfileImagePicker';
import DocumentUploadSection from '../../components/profile/DocumentUploadSection';
import LanguageSelectionModal from '../../components/profile/LanguageSelectionModal';
import ChangePasswordModal from '../../components/profile/ChangePasswordModal';
import ProfileChecklistCard from '../../components/ProfileChecklistCard';
import { translations, LANGUAGES } from '../../constants/translations';
import { useUpdate } from '../../context/UpdateContext';
import { getCurrentAppVersion } from '../../services/updateService';

export default function EmployerProfileScreen() {
    const navigation = useNavigation();
    const { user, logout, updateUser, refreshProfile } = useAuth();
    const { t, locale, changeLanguage } = useLanguage();
    const [profile, setProfile] = useState(null);
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showLangModal, setShowLangModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const { checkForUpdates } = useUpdate();
    const appVersionInfo = getCurrentAppVersion();

    // Set custom headerRight button for the Profile tab in the Tabs navigator
    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity
                    onPress={() => setShowLangModal(true)}
                    style={styles.headerLangButton}
                    activeOpacity={0.7}
                >
                    <Ionicons name="language" size={22} color={COLORS.white} />
                </TouchableOpacity>
            ),
        });
    }, [navigation, locale]);

    const employerDocTypes = [
        { label: t('gst_certificate'), value: 'gst_certificate' },
        { label: t('pan_card'), value: 'pan_card' },
        { label: t('company_registration'), value: 'company_registration' },
        { label: t('other'), value: 'other' },
    ];

    useFocusEffect(
        useCallback(() => {
            fetchProfile();
        }, [])
    );

    const fetchProfile = async () => {
        try {
            const [profileData, dashboardData] = await Promise.all([
                getProfile(),
                getEmployerDashboard()
            ]);

            setProfile(profileData);
            setDashboardData(dashboardData);
            if (profileData) {
                await updateUser(profileData);
            }
        } catch (error) {
            console.error('Failed to fetch profile/dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            t('logout'),
            t('logout_confirm'),
            [
                { text: t('cancel'), style: 'cancel' },
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

    const openMapsLink = (link) => {
        if (link) {
            Linking.openURL(link);
        }
    };

    const getVerificationBadge = () => {
        const status = profile?.companyDetails?.verificationStatus || 'pending';

        const config = {
            pending: { icon: 'time-outline', color: COLORS.warning, text: t('pending') },
            verified: { icon: 'shield-checkmark', color: COLORS.success, text: t('verified') },
            rejected: { icon: 'close-circle-outline', color: COLORS.danger, text: t('rejected') },
        };
        return config[status] || config.pending;
    };

    const handleImageSelected = async (imageAsset) => {
        setUploading(true);
        try {
            const uploadResult = await uploadFile(imageAsset);
            await updateProfile({ profilePicture: uploadResult.fileUrl });

            if (refreshProfile) {
                const refreshed = await refreshProfile();
                if (refreshed) setProfile(refreshed);
            } else {
                setProfile({ ...profile, profilePicture: uploadResult.fileUrl });
                updateUser({ profilePicture: uploadResult.fileUrl });
            }
        } catch (error) {
            console.error('Failed to upload image:', error);
            Alert.alert(t('error_title'), t('failed_to_upload_doc') || 'Failed to upload company logo');
        } finally {
            setUploading(false);
        }
    };

    const handleSaveProfile = async (updatedData) => {
        try {
            const result = await updateProfile(updatedData);
            // Immediately apply updated data to local screen state
            const merged = { ...profile, ...updatedData, ...(result || {}) };
            setProfile(merged);
            updateUser(merged);

            // Silently refresh in the background if available
            if (refreshProfile) {
                refreshProfile().then((refreshed) => {
                    if (refreshed) setProfile(refreshed);
                }).catch((err) => {
                    console.warn('[Profile] Background refresh warning:', err?.message);
                });
            }
            Alert.alert(t('success') || 'Success', t('profile_updated_success') || 'Profile updated successfully');
        } catch (error) {
            console.error('Failed to update profile:', error);
            throw error;
        }
    };

    const handleLanguageChange = (langCode) => {
        changeLanguage(langCode);
        setShowLangModal(false);
    };

    if (loading) {
        return <LoadingSpinner fullScreen message={t('loading')} />;
    }

    const companyDetails = profile?.companyDetails || {};
    const address = companyDetails.address || {};
    const contactPerson = companyDetails.contactPerson || {};
    const badge = getVerificationBadge();

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Background */}
                <View style={styles.headerBackground} />

                {/* Overlapping Company Card */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.profileCard}>
                    <View style={styles.companyIconContainer}>
                        <ProfileImagePicker
                            imageUri={profile?.profilePicture}
                            onImageSelected={handleImageSelected}
                            size={80}
                            editable={true}
                        />
                        {badge && (
                            <View style={[styles.verificationBadge, { backgroundColor: badge.color }]}>
                                <Ionicons name={badge.icon} size={12} color={COLORS.white} />
                                <Text style={styles.verificationText}>{badge.text}</Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.companyName}>{profile?.companyName || t('company_name')}</Text>
                    <Text style={styles.ownerName}>{profile?.name}</Text>

                    {profile?.bio && (
                        <Text style={styles.bioText}>{profile.bio}</Text>
                    )}

                    {profile?.gender && (
                        <View style={styles.genderContainer}>
                            <Ionicons name={profile.gender === 'Male' ? 'male' : profile.gender === 'Female' ? 'female' : 'person'} size={14} color={COLORS.textSecondary} />
                            <Text style={styles.genderText}>{t('gender')}: {t(profile.gender)}</Text>
                        </View>
                    )}

                    <View style={styles.ratingHeader}>
                        <Ionicons name="star" size={16} color="#FFD700" />
                        <Text style={styles.ratingText}>{profile?.rating?.toFixed(1) || '0.0'}</Text>
                    </View>

                    {/* Quick Stats Grid */}
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{dashboardData?.activeJobs ?? profile?.stats?.totalJobs ?? 0}</Text>
                            <Text style={styles.statLabel}>{t('nav_jobs')}</Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{dashboardData?.totalApplicants ?? profile?.stats?.totalApplicants ?? 0}</Text>
                            <Text style={styles.statLabel}>{t('total_applicants')}</Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.statItem}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={styles.statNumber}>{dashboardData?.hires ?? profile?.stats?.totalHires ?? 0}</Text>
                            </View>
                            <Text style={styles.statLabel}>{t('hired')}</Text>
                        </View>
                    </View>

                    {/* Edit Profile Button */}
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => setShowEditModal(true)}
                    >
                        <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                        <Text style={styles.editButtonText}>{t('edit_profile')}</Text>
                    </TouchableOpacity>

                    {companyDetails.description && (
                        <View style={styles.companyDescription}>
                            <Text style={styles.descriptionText}>{companyDetails.description}</Text>
                        </View>
                    )}
                </Animated.View>

                {/* Subscription Status Card */}
                {profile?.subscription && (() => {
                    const isExpired = profile.subscription.endDate && new Date(profile.subscription.endDate) < new Date();
                    return (
                        <Animated.View entering={FadeInDown.delay(150).springify()} style={[styles.subscriptionCard, isExpired && { borderLeftColor: COLORS.danger }]}>
                            <View style={styles.subscriptionHeader}>
                                <View style={[styles.subscriptionIconContainer, isExpired && { backgroundColor: COLORS.dangerLight }]}>
                                    <Ionicons name="diamond" size={20} color={isExpired ? COLORS.danger : COLORS.primary} />
                                </View>
                                <View style={styles.subscriptionInfo}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={styles.subscriptionPlan}>{profile.subscription.plan || t('free')} {t('plan')}</Text>
                                        {isExpired && (
                                            <View style={[styles.statusBadgeSmall, { backgroundColor: COLORS.dangerLight }]}>
                                        <Text style={[styles.statusBadgeTextSmall, { color: COLORS.danger }]}>{t('expired_title')}</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={[styles.subscriptionStatus, isExpired && { color: COLORS.danger }]}>
                                {isExpired ? t('expired_title') : (profile.subscription.status === 'active' ? t('active') : t('inactive'))}
                            </Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.upgradeButton, isExpired && { backgroundColor: COLORS.danger }]}
                                    onPress={() => router.push('/(employer)/subscription-plans')}
                                >
                                    <Text style={styles.upgradeButtonText}>{isExpired ? t('renew_sub') : t('manage')}</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.subscriptionLimits}>
                                <View style={styles.limitItem}>
                                    <Text style={styles.limitLabel}>{t('nav_jobs')}</Text>
                                    <Text style={styles.limitValue}>
                                        {dashboardData?.activeJobs || 0}/{profile.subscription.maxActiveJobs || 1}
                                    </Text>
                                </View>
                                <View style={styles.limitItem}>
                                    <Text style={styles.limitLabel}>{t('database_unlocks')}</Text>
                                    <Text style={styles.limitValue}>
                                        {profile.subscription.databaseUnlocksUsed || 0}/{profile.subscription.maxDatabaseUnlocks || 0}
                                    </Text>
                                </View>
                            </View>
                        </Animated.View>
                    );
                })()}

                {/* Profile Completion Status & Checklist Card */}
                <ProfileChecklistCard
                    user={profile}
                    onEditPress={() => setShowEditModal(true)}
                    style={{ marginHorizontal: 20, marginBottom: 15 }}
                />

                {/* Menu / Info Sections */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionHeader}>{t('personal_info')}</Text>
                    <View style={styles.menuCard}>
                        <View style={styles.menuItem}>
                            <View style={[styles.menuIcon, { backgroundColor: '#E3F2FD' }]}>
                                <Ionicons name="person" size={20} color={COLORS.primary} />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuLabel}>{t('full_name')}</Text>
                                <Text style={styles.menuValue}>{profile?.name}</Text>
                            </View>
                        </View>
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
                        {profile?.gender && (
                            <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
                                <View style={[styles.menuIcon, { backgroundColor: '#F3E5F5' }]}>
                                    <Ionicons name={profile.gender === 'Male' ? 'male' : profile.gender === 'Female' ? 'female' : 'person'} size={20} color="#9C27B0" />
                                </View>
                                <View style={styles.menuContent}>
                                    <Text style={styles.menuLabel}>{t('gender')}</Text>
                                    <Text style={styles.menuValue}>{profile.gender}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionHeader}>{t('company_details')}</Text>

                    <View style={styles.menuCard}>
                        <View style={styles.menuItem}>
                            <View style={[styles.menuIcon, { backgroundColor: '#E3F2FD' }]}>
                                <Ionicons name="briefcase" size={20} color={COLORS.primary} />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuLabel}>{t('business_type')}</Text>
                                <Text style={styles.menuValue}>{profile?.businessType || t('not_specified')}</Text>
                            </View>
                        </View>
                        <View style={styles.menuItem}>
                            <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}>
                                <Ionicons name="people" size={20} color={COLORS.success} />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuLabel}>{t('employee_count')}</Text>
                                <Text style={styles.menuValue}>{companyDetails.employeeCount || t('not_specified')}</Text>
                            </View>
                        </View>
                        {companyDetails.foundedYear && (
                            <View style={styles.menuItem}>
                                <View style={[styles.menuIcon, { backgroundColor: '#FFF9C4' }]}>
                                    <Ionicons name="calendar-outline" size={20} color="#FBC02D" />
                                </View>
                                <View style={styles.menuContent}>
                                    <Text style={styles.menuLabel}>{t('founded_year')}</Text>
                                    <Text style={styles.menuValue}>{companyDetails.foundedYear}</Text>
                                </View>
                            </View>
                        )}
                        {companyDetails.website && (
                            <TouchableOpacity
                                style={[styles.menuItem, { borderBottomWidth: 0 }]}
                                onPress={() => Linking.openURL(companyDetails.website)}
                            >
                                <View style={[styles.menuIcon, { backgroundColor: '#F3E5F5' }]}>
                                    <Ionicons name="globe" size={20} color="#9C27B0" />
                                </View>
                                <View style={styles.menuContent}>
                                    <Text style={styles.menuLabel}>{t('website')}</Text>
                                    <Text style={[styles.menuValue, { color: COLORS.primary }]}>{companyDetails.website}</Text>
                                </View>
                                <Ionicons name="open-outline" size={16} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        )}
                        {profile?.gstNumber && (
                            <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
                                <View style={[styles.menuIcon, { backgroundColor: '#E0F7FA' }]}>
                                    <Ionicons name="document-text" size={20} color="#00ACC1" />
                                </View>
                                <View style={styles.menuContent}>
                                    <Text style={styles.menuLabel}>{t('gst_number')}</Text>
                                    <Text style={styles.menuValue}>{profile.gstNumber}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* Contact Section */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionHeader}>{t('contact_info')}</Text>
                    <View style={styles.menuCard}>
                        <View style={styles.menuItem}>
                            <View style={[styles.menuIcon, { backgroundColor: '#FFF3E0' }]}>
                                <Ionicons name="person" size={20} color={COLORS.warning} />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuLabel}>{t('contact_person')}</Text>
                                <Text style={styles.menuValue}>
                                    {contactPerson.name || t('not_specified')}
                                    {contactPerson.designation ? ` (${contactPerson.designation})` : ''}
                                </Text>
                            </View>
                        </View>
                        {contactPerson.phone && (
                            <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL(`tel:+91${contactPerson.phone}`)}>
                                <View style={[styles.menuIcon, { backgroundColor: '#E0F2F1' }]}>
                                    <Ionicons name="call" size={20} color="#009688" />
                                </View>
                                <View style={styles.menuContent}>
                                    <Text style={styles.menuLabel}>{t('mobile')}</Text>
                                    <Text style={styles.menuValue}>+91 {contactPerson.phone}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        {contactPerson.email && (
                            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => Linking.openURL(`mailto:${contactPerson.email}`)}>
                                <View style={[styles.menuIcon, { backgroundColor: '#FFEBEE' }]}>
                                    <Ionicons name="mail" size={20} color="#F44336" />
                                </View>
                                <View style={styles.menuContent}>
                                    <Text style={styles.menuLabel}>{t('email')}</Text>
                                    <Text style={styles.menuValue}>{contactPerson.email}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>


                {/* Address Section */}
                {(address.city || address.state) && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionHeader}>{t('location')}</Text>
                        <View style={styles.menuCard}>
                            <View style={[styles.menuItem, { borderBottomWidth: 0, alignItems: 'center' }]}>
                                <View style={[styles.menuIcon, { backgroundColor: '#EFEBE9' }]}>
                                    <Ionicons name="location" size={20} color="#795548" />
                                </View>
                                <View style={styles.menuContent}>
                                    <Text style={styles.menuValue}>
                                        {[address.street, address.city, address.state, address.pincode].filter(Boolean).join(', ')}
                                    </Text>
                                </View>
                            </View>
                            {address.mapsLink && (
                                <TouchableOpacity
                                    style={styles.mapAction}
                                    onPress={() => openMapsLink(address.mapsLink)}
                                >
                                    <Text style={styles.mapActionText}>{t('view_on_maps')}</Text>
                                    <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

                {/* Documents Section */}
                <DocumentUploadSection docTypes={employerDocTypes} onDocumentUploaded={() => fetchProfile()} />

                {/* Account Actions */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionHeader}>{t('quick_actions')}</Text>
                    <View style={styles.menuCard}>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => router.push('/(employer)/billing')}
                        >
                            <View style={[styles.menuIcon, { backgroundColor: '#F3E5F5' }]}>
                                <Ionicons name="receipt-outline" size={20} color="#9C27B0" />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuValue}>{t('nav_billing')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => setShowEditModal(true)}
                        >
                            <View style={[styles.menuIcon, { backgroundColor: '#F5F5F5' }]}>
                                <Ionicons name="create-outline" size={20} color={COLORS.text} />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuValue}>{t('edit_profile')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>

                        {/* Language Selection Option */}
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => setShowLangModal(true)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.menuIcon, { backgroundColor: '#E0F2FE' }]}>
                                <Ionicons name="language" size={20} color="#0284C7" />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuValue}>{t('change_language') || 'Language'}</Text>
                                <Text style={styles.menuLabel}>
                                    {(LANGUAGES || []).find(l => l.code === locale)?.label || 'English'} ({(LANGUAGES || []).find(l => l.code === locale)?.native || 'English'})
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => Linking.openURL(`${WEB_URL}/${locale}/contact`)}
                        >
                            <View style={[styles.menuIcon, { backgroundColor: '#E1F5FE' }]}>
                                <Ionicons name="help-buoy-outline" size={20} color={COLORS.info} />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuValue}>{t('help_support')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={async () => {
                                const res = await checkForUpdates();
                                if (res && !res.updateAvailable) {
                                    Alert.alert(
                                        t('up_to_date') || 'Up to Date 🎉',
                                        t('up_to_date_msg') || `You are using the latest version of Shramik Seva (v${appVersionInfo.version}).`,
                                        [{ text: t('ok') || 'OK' }]
                                    );
                                } else if (!res) {
                                    Alert.alert(
                                        t('notice') || 'Notice',
                                        t('update_check_failed') || 'Could not check for updates. Please check your internet connection.',
                                        [{ text: t('ok') || 'OK' }]
                                    );
                                }
                            }}
                        >
                            <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}>
                                <Ionicons name="cloud-download-outline" size={20} color={COLORS.success} />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuValue}>{t('check_for_updates') || "Check for App Updates"}</Text>
                                <Text style={styles.menuLabel}>Version {appVersionInfo.version} (Build {appVersionInfo.versionCode})</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => setShowPasswordModal(true)}
                        >
                            <View style={[styles.menuIcon, { backgroundColor: '#FFF9C4' }]}>
                                <Ionicons name="lock-closed-outline" size={20} color="#FBC02D" />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuValue}>{t('change_password')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.menuItem, { borderBottomWidth: 0 }]}
                            onPress={handleLogout}
                        >
                            <View style={[styles.menuIcon, { backgroundColor: '#FFEBEE' }]}>
                                <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={[styles.menuValue, { color: COLORS.danger }]}>{t('logout')}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ alignItems: 'center', marginVertical: 16 }}>
                    <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>
                        Shramik Seva v{appVersionInfo.version} ({appVersionInfo.platform})
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Edit Profile Modal */}
            <EditEmployerProfileModal
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

            <ChangePasswordModal
                visible={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
            />
        </View>
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
        height: 120,
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
        marginBottom: 24,
    },
    companyIconContainer: {
        alignItems: 'center',
        marginBottom: 12,
        position: 'relative',
    },
    companyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: COLORS.white,
    },
    verificationBadge: {
        position: 'absolute',
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 80,
        justifyContent: 'center',
    },
    verificationText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.white,
        marginLeft: 4,
    },
    companyName: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 4,
    },
    statusBadgeSmall: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusBadgeTextSmall: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    ownerName: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 10,
    },
    bioText: {
        fontSize: 14,
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 10,
        paddingHorizontal: 20,
        fontStyle: 'italic',
    },
    genderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 20,
        gap: 4,
    },
    genderText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    ratingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFDE7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 15,
        alignSelf: 'center',
        gap: 4,
        borderWidth: 1,
        borderColor: '#FFF59D',
    },
    ratingText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
    },
    statsGrid: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    verticalDivider: {
        width: 1,
        height: '80%',
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
    alertCard: {
        marginHorizontal: 20,
        marginBottom: 24,
        backgroundColor: COLORS.warningLight,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FFE082',
    },
    alertContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
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
    alertAction: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
    },
    alertActionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F57C00',
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
    mapAction: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginTop: 4,
        gap: 6,
    },
    mapActionText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
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
    subscriptionCard: {
        backgroundColor: COLORS.white,
        marginHorizontal: 20,
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    subscriptionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    subscriptionIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primaryLight + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    subscriptionInfo: {
        flex: 1,
        marginLeft: 12,
    },
    subscriptionPlan: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    subscriptionStatus: {
        fontSize: 13,
        color: COLORS.success,
        marginTop: 2,
    },
    upgradeButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
    },
    upgradeButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.white,
    },
    subscriptionLimits: {
        flexDirection: 'row',
        gap: 16,
    },
    limitItem: {
        flex: 1,
        backgroundColor: COLORS.background,
        padding: 12,
        borderRadius: 12,
    },
    limitLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    limitValue: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
    },
    companyDescription: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        width: '100%',
    },
    descriptionText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
        fontStyle: 'italic',
        textAlign: 'center',
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
    headerLangButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
});
