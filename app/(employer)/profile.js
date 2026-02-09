import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Linking,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import { getProfile } from '../../services/userService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function EmployerProfileScreen() {
    const { user, logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const data = await getProfile();
            setProfile(data);
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
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
            pending: { icon: 'time-outline', color: COLORS.warning, text: 'Verification Pending' },
            verified: { icon: 'shield-checkmark', color: COLORS.success, text: 'Verified Company' },
            rejected: { icon: 'close-circle-outline', color: COLORS.danger, text: 'Verification Rejected' },
        };
        return config[status];
    };

    if (loading) {
        return <LoadingSpinner fullScreen message="Loading profile..." />;
    }

    const companyDetails = profile?.companyDetails || {};
    const address = companyDetails.address || {};
    const contactPerson = companyDetails.contactPerson || {};
    const badge = getVerificationBadge();

    return (
        <View style={styles.container}>
            {/* Header Configuration */}
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'My Profile',
                    headerStyle: { backgroundColor: COLORS.primary },
                    headerTintColor: COLORS.white,
                    headerShadowVisible: false,
                }}
            />

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
                        <View style={styles.companyIcon}>
                            <Ionicons name="business" size={40} color={COLORS.primary} />
                        </View>
                        {badge && (
                            <View style={[styles.verificationBadge, { backgroundColor: badge.color }]}>
                                <Ionicons name={badge.icon} size={12} color={COLORS.white} />
                                <Text style={styles.verificationText}>{badge.text}</Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.companyName}>{profile?.companyName || 'Company Name'}</Text>
                    <Text style={styles.ownerName}>{profile?.name}</Text>

                    {/* Quick Stats Grid */}
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{profile?.stats?.totalJobs || 0}</Text>
                            <Text style={styles.statLabel}>Jobs</Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{profile?.stats?.totalHires || 0}</Text>
                            <Text style={styles.statLabel}>Hires</Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.statItem}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={styles.statNumber}>{profile?.rating?.toFixed(1) || '0.0'}</Text>
                                <Ionicons name="star" size={14} color="#FFD700" />
                            </View>
                            <Text style={styles.statLabel}>Rating</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Profile Completion Prompt */}
                {!companyDetails.isProfileComplete && (
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.alertCard}>
                        <View style={styles.alertContent}>
                            <Ionicons name="information-circle" size={24} color={COLORS.warning} />
                            <View style={styles.alertTextContainer}>
                                <Text style={styles.alertTitle}>Complete Your Profile</Text>
                                <Text style={styles.alertSubtitle}>Add details to build trust with workers</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.alertAction}
                            onPress={() => Alert.alert('Coming Soon', 'Edit profile feature coming soon!')}
                        >
                            <Text style={styles.alertActionText}>Complete Now</Text>
                            <Ionicons name="arrow-forward" size={16} color={COLORS.warning} />
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Menu / Info Sections */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionHeader}>Company Details</Text>

                    <View style={styles.menuCard}>
                        <View style={styles.menuItem}>
                            <View style={[styles.menuIcon, { backgroundColor: '#E3F2FD' }]}>
                                <Ionicons name="briefcase" size={20} color={COLORS.primary} />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuLabel}>Business Type</Text>
                                <Text style={styles.menuValue}>{profile?.businessType || 'Not specified'}</Text>
                            </View>
                        </View>
                        <View style={styles.menuItem}>
                            <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}>
                                <Ionicons name="people" size={20} color={COLORS.success} />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuLabel}>Employees</Text>
                                <Text style={styles.menuValue}>{companyDetails.employeeCount || 'Not specified'}</Text>
                            </View>
                        </View>
                        {companyDetails.website && (
                            <TouchableOpacity
                                style={[styles.menuItem, { borderBottomWidth: 0 }]}
                                onPress={() => Linking.openURL(companyDetails.website)}
                            >
                                <View style={[styles.menuIcon, { backgroundColor: '#F3E5F5' }]}>
                                    <Ionicons name="globe" size={20} color="#9C27B0" />
                                </View>
                                <View style={styles.menuContent}>
                                    <Text style={styles.menuLabel}>Website</Text>
                                    <Text style={[styles.menuValue, { color: COLORS.primary }]}>{companyDetails.website}</Text>
                                </View>
                                <Ionicons name="open-outline" size={16} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Contact Section */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionHeader}>Contact Information</Text>
                    <View style={styles.menuCard}>
                        <View style={styles.menuItem}>
                            <View style={[styles.menuIcon, { backgroundColor: '#FFF3E0' }]}>
                                <Ionicons name="person" size={20} color={COLORS.warning} />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuLabel}>Contact Person</Text>
                                <Text style={styles.menuValue}>{contactPerson.name || 'Not specified'}</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL(`tel:+91${profile?.mobile}`)}>
                            <View style={[styles.menuIcon, { backgroundColor: '#E0F2F1' }]}>
                                <Ionicons name="call" size={20} color="#009688" />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuLabel}>Mobile</Text>
                                <Text style={styles.menuValue}>+91 {profile?.mobile}</Text>
                            </View>
                        </TouchableOpacity>
                        {profile?.email && (
                            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => Linking.openURL(`mailto:${profile?.email}`)}>
                                <View style={[styles.menuIcon, { backgroundColor: '#FFEBEE' }]}>
                                    <Ionicons name="mail" size={20} color="#F44336" />
                                </View>
                                <View style={styles.menuContent}>
                                    <Text style={styles.menuLabel}>Email</Text>
                                    <Text style={styles.menuValue}>{profile?.email}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Address Section */}
                {(address.city || address.state) && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionHeader}>Location</Text>
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
                                    <Text style={styles.mapActionText}>View on Maps</Text>
                                    <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

                {/* Account Actions */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionHeader}>Settings</Text>
                    <View style={styles.menuCard}>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => Alert.alert('Coming Soon', 'Edit profile feature coming soon!')}
                        >
                            <View style={[styles.menuIcon, { backgroundColor: '#F5F5F5' }]}>
                                <Ionicons name="create-outline" size={20} color={COLORS.text} />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuValue}>Edit Profile</Text>
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
                                <Text style={[styles.menuValue, { color: COLORS.danger }]}>Logout</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
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
        marginBottom: -60,
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
    ownerName: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 20,
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
});
