import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Animated,
    RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import { getSubscriptionPlans, purchaseSubscription, getCurrentSubscription } from '../../services/subscriptionService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';

export default function SubscriptionPlansScreen() {
    const params = useLocalSearchParams();
    const [activeTab, setActiveTab] = useState(params.tab || 'plans'); // 'myplan' or 'plans'
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [currentSubscription, setCurrentSubscription] = useState(null);
    const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
    const fadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (!loading) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start();
        }
    }, [loading]);

    // Set tab based on params (e.g., when redirected from post-job)
    useEffect(() => {
        if (params.tab) {
            setActiveTab(params.tab);
        }
    }, [params.tab]);

    const fetchData = async () => {
        try {
            const [plansData, subData] = await Promise.all([
                getSubscriptionPlans(),
                getCurrentSubscription()
            ]);
            setPlans(plansData);
            setCurrentSubscription(subData.subscription);
            setHasActiveSubscription(subData.hasActiveSubscription);

            // If no active subscription, default to plans tab
            if (!subData.hasActiveSubscription && !params.tab) {
                setActiveTab('plans');
            } else if (subData.hasActiveSubscription && !params.tab) {
                setActiveTab('myplan');
            }
        } catch (error) {
            console.error('Error fetching plans:', error);
            Alert.alert('Error', 'Failed to load subscription data');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }, []);

    const handleSelectPlan = (plan) => {
        setSelectedPlan(plan.id);
    };

    const handlePurchase = async () => {
        if (!selectedPlan) {
            Alert.alert('Select a Plan', 'Please select a subscription plan to continue');
            return;
        }

        const selectedPlanData = plans.find(p => p.id === selectedPlan);

        Alert.alert(
            'Confirm Purchase',
            `Purchase ${selectedPlanData?.name} for ₹${selectedPlanData?.price?.toLocaleString('en-IN')}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Purchase',
                    onPress: async () => {
                        setPurchasing(true);
                        try {
                            const result = await purchaseSubscription(selectedPlan);
                            Alert.alert(
                                'Success! 🎉',
                                result.message,
                                [{
                                    text: 'Post a Job',
                                    onPress: () => router.replace('/(employer)/post-job')
                                }]
                            );
                            // Refresh data after purchase
                            fetchData();
                            setActiveTab('myplan');
                        } catch (error) {
                            Alert.alert('Error', error.response?.data?.message || 'Failed to purchase subscription');
                        } finally {
                            setPurchasing(false);
                        }
                    }
                }
            ]
        );
    };

    const formatPrice = (price) => {
        return `₹${price?.toLocaleString('en-IN') || 0}`;
    };

    const getPlanIcon = (planId) => {
        if (planId?.includes('12')) return 'diamond';
        if (planId?.includes('3')) return 'star';
        return 'flash';
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    if (loading) {
        return <LoadingSpinner fullScreen message="Loading subscription data..." />;
    }

    // Tab Header Component
    const TabHeader = () => (
        <View style={styles.tabContainer}>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'myplan' && styles.tabActive]}
                onPress={() => setActiveTab('myplan')}
            >
                <Ionicons
                    name="person-circle-outline"
                    size={20}
                    color={activeTab === 'myplan' ? COLORS.white : COLORS.textSecondary}
                />
                <Text style={[styles.tabText, activeTab === 'myplan' && styles.tabTextActive]}>
                    My Plan
                </Text>
                {hasActiveSubscription && currentSubscription?.daysRemaining <= 7 && (
                    <View style={styles.warningBadge}>
                        <Text style={styles.warningBadgeText}>!</Text>
                    </View>
                )}
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'plans' && styles.tabActive]}
                onPress={() => setActiveTab('plans')}
            >
                <Ionicons
                    name="pricetags-outline"
                    size={20}
                    color={activeTab === 'plans' ? COLORS.white : COLORS.textSecondary}
                />
                <Text style={[styles.tabText, activeTab === 'plans' && styles.tabTextActive]}>
                    Buy Plans
                </Text>
            </TouchableOpacity>
        </View>
    );

    // My Plan Tab Content
    const MyPlanContent = () => {
        if (!hasActiveSubscription) {
            // No active subscription
            return (
                <View style={styles.noSubscriptionContainer}>
                    <View style={styles.noSubIcon}>
                        <Ionicons name="alert-circle-outline" size={80} color={COLORS.warning} />
                    </View>
                    <Text style={styles.noSubTitle}>No Active Subscription</Text>
                    <Text style={styles.noSubText}>
                        You need a subscription to post jobs and access candidate database.
                    </Text>
                    <Button
                        title="Browse Plans"
                        onPress={() => setActiveTab('plans')}
                        style={styles.browseBtn}
                        icon={<Ionicons name="arrow-forward" size={18} color={COLORS.white} />}
                    />
                </View>
            );
        }

        // Check if subscription is expired or expiring soon
        const isExpiringSoon = currentSubscription.daysRemaining <= 7;
        const isExpired = currentSubscription.daysRemaining <= 0;

        return (
            <View style={styles.myPlanContainer}>
                {/* Status Banner */}
                {isExpired ? (
                    <View style={[styles.statusBanner, styles.statusExpired]}>
                        <Ionicons name="warning" size={24} color={COLORS.white} />
                        <Text style={styles.statusBannerText}>Subscription Expired!</Text>
                    </View>
                ) : isExpiringSoon ? (
                    <View style={[styles.statusBanner, styles.statusWarning]}>
                        <Ionicons name="time" size={24} color={COLORS.white} />
                        <Text style={styles.statusBannerText}>
                            Expiring in {currentSubscription.daysRemaining} days!
                        </Text>
                    </View>
                ) : (
                    <View style={[styles.statusBanner, styles.statusActive]}>
                        <Ionicons name="checkmark-circle" size={24} color={COLORS.white} />
                        <Text style={styles.statusBannerText}>Active Subscription</Text>
                    </View>
                )}

                {/* Plan Details Card */}
                <View style={styles.planDetailsCard}>
                    <View style={styles.planDetailsHeader}>
                        <View style={styles.planTypeIcon}>
                            <Ionicons
                                name={getPlanIcon(currentSubscription.planType)}
                                size={32}
                                color={COLORS.secondary}
                            />
                        </View>
                        <View style={styles.planTypeInfo}>
                            <Text style={styles.planTypeName}>
                                {currentSubscription.planType?.toUpperCase()} PLAN
                            </Text>
                            <Text style={styles.planTypeDate}>
                                Expires: {formatDate(currentSubscription.endDate)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Ionicons name="time-outline" size={28} color={COLORS.secondary} />
                            <Text style={styles.statValue}>{Math.max(0, currentSubscription.daysRemaining)}</Text>
                            <Text style={styles.statLabel}>Days Left</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="briefcase-outline" size={28} color={COLORS.secondary} />
                            <Text style={styles.statValue}>{currentSubscription.maxJobs}</Text>
                            <Text style={styles.statLabel}>Job Slots</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="people-outline" size={28} color={COLORS.secondary} />
                            <Text style={styles.statValue}>{currentSubscription.credits}</Text>
                            <Text style={styles.statLabel}>DB Credits</Text>
                        </View>
                    </View>

                    {/* Features */}
                    {currentSubscription.features && currentSubscription.features.length > 0 && (
                        <>
                            <View style={styles.divider} />
                            <Text style={styles.featuresTitle}>Plan Features</Text>
                            {currentSubscription.features.map((feature, idx) => (
                                <View key={idx} style={styles.featureRow}>
                                    <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                                    <Text style={styles.featureText}>{feature}</Text>
                                </View>
                            ))}
                        </>
                    )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    {!isExpired && (
                        <Button
                            title="Post a Job"
                            onPress={() => router.push('/(employer)/post-job')}
                            style={styles.postJobBtn}
                            icon={<Ionicons name="add-circle" size={20} color={COLORS.white} />}
                        />
                    )}
                    <Button
                        title={isExpired ? "Renew Subscription" : "Upgrade Plan"}
                        onPress={() => setActiveTab('plans')}
                        style={isExpired ? styles.renewBtn : styles.upgradeBtn}
                        textStyle={isExpired ? {} : styles.upgradeBtnText}
                        icon={<Ionicons name="arrow-up-circle" size={20} color={isExpired ? COLORS.white : COLORS.secondary} />}
                    />
                </View>
            </View>
        );
    };

    // Buy Plans Tab Content  
    const PlansContent = () => (
        <Animated.View style={{ opacity: fadeAnim }}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Choose Your Plan</Text>
                <Text style={styles.headerSubtitle}>
                    Get unlimited candidate responses and hire the best workers
                </Text>
            </View>

            {/* Current subscription notice if upgrading */}
            {hasActiveSubscription && (
                <View style={styles.upgradeNotice}>
                    <Ionicons name="information-circle" size={20} color={COLORS.primary} />
                    <Text style={styles.upgradeNoticeText}>
                        Your current plan expires in {currentSubscription?.daysRemaining} days.
                        New plan will start after expiry.
                    </Text>
                </View>
            )}

            {/* Plans */}
            {plans.map((plan) => (
                <TouchableOpacity
                    key={plan.id}
                    style={[
                        styles.planCard,
                        selectedPlan === plan.id && styles.planCardSelected,
                        plan.popular && styles.planCardPopular
                    ]}
                    onPress={() => handleSelectPlan(plan)}
                    activeOpacity={0.8}
                >
                    {plan.popular && (
                        <View style={styles.popularBadge}>
                            <Text style={styles.popularText}>MOST POPULAR</Text>
                        </View>
                    )}

                    <View style={styles.planHeader}>
                        <View style={[styles.planIcon, plan.popular && styles.planIconPopular]}>
                            <Ionicons
                                name={getPlanIcon(plan.id)}
                                size={28}
                                color={plan.popular ? COLORS.white : COLORS.secondary}
                            />
                        </View>
                        <View style={styles.planInfo}>
                            <Text style={styles.planName}>{plan.name}</Text>
                            <Text style={styles.planDuration}>{plan.duration} days</Text>
                        </View>
                        <View style={styles.planPriceContainer}>
                            <Text style={styles.planPrice}>{formatPrice(plan.price)}</Text>
                            {plan.id.includes('3') && (
                                <Text style={styles.planSaving}>Save 40%</Text>
                            )}
                            {plan.id.includes('12') && (
                                <Text style={styles.planSaving}>Save 73%</Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.planFeatures}>
                        {plan.features?.map((feature, idx) => (
                            <View key={idx} style={styles.featureRow}>
                                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                                <Text style={styles.featureText}>{feature}</Text>
                            </View>
                        ))}
                    </View>

                    {selectedPlan === plan.id && (
                        <View style={styles.selectedIndicator}>
                            <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                        </View>
                    )}
                </TouchableOpacity>
            ))}

            {/* Purchase Button */}
            <Button
                title={purchasing ? 'Processing...' : `Purchase${selectedPlan ? '' : ' (Select a Plan)'}`}
                onPress={handlePurchase}
                loading={purchasing}
                disabled={!selectedPlan || purchasing}
                style={[styles.purchaseButton, !selectedPlan && styles.purchaseButtonDisabled]}
            />

            {/* Note */}
            <Text style={styles.noteText}>
                💡 Payment integration coming soon. For demo, subscription will be activated immediately.
            </Text>
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            <TabHeader />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.secondary]} />
                }
            >
                {activeTab === 'myplan' ? <MyPlanContent /> : <PlansContent />}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    // Tab Styles
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        padding: 6,
        margin: 16,
        marginBottom: 0,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        gap: 6,
    },
    tabActive: {
        backgroundColor: COLORS.secondary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    tabTextActive: {
        color: COLORS.white,
    },
    warningBadge: {
        backgroundColor: COLORS.danger,
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
    },
    warningBadgeText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: '700',
    },
    // No Subscription Styles
    noSubscriptionContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    noSubIcon: {
        marginBottom: 20,
    },
    noSubTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 12,
    },
    noSubText: {
        fontSize: 15,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    browseBtn: {
        backgroundColor: COLORS.secondary,
        paddingHorizontal: 24,
    },
    // My Plan Styles
    myPlanContainer: {
        flex: 1,
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        marginBottom: 20,
        gap: 10,
    },
    statusActive: {
        backgroundColor: COLORS.success,
    },
    statusWarning: {
        backgroundColor: COLORS.warning,
    },
    statusExpired: {
        backgroundColor: COLORS.danger,
    },
    statusBannerText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
    },
    planDetailsCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    planDetailsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    planTypeIcon: {
        width: 60,
        height: 60,
        borderRadius: 14,
        backgroundColor: '#E3F2FD',
        alignItems: 'center',
        justifyContent: 'center',
    },
    planTypeInfo: {
        flex: 1,
        marginLeft: 16,
    },
    planTypeName: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
    },
    planTypeDate: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.text,
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    featuresTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 12,
    },
    actionButtons: {
        gap: 12,
    },
    postJobBtn: {
        backgroundColor: COLORS.secondary,
    },
    renewBtn: {
        backgroundColor: COLORS.danger,
    },
    upgradeBtn: {
        backgroundColor: COLORS.background,
        borderWidth: 2,
        borderColor: COLORS.secondary,
    },
    upgradeBtnText: {
        color: COLORS.secondary,
    },
    // Plans Content Styles
    header: {
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 15,
        color: COLORS.textSecondary,
        lineHeight: 22,
    },
    upgradeNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        padding: 14,
        borderRadius: 10,
        marginBottom: 16,
        gap: 10,
    },
    upgradeNoticeText: {
        flex: 1,
        fontSize: 13,
        color: COLORS.text,
        lineHeight: 18,
    },
    planCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: COLORS.border,
        position: 'relative',
        overflow: 'hidden',
    },
    planCardSelected: {
        borderColor: COLORS.primary,
        borderWidth: 2,
    },
    planCardPopular: {
        borderColor: COLORS.secondary,
        borderWidth: 2,
    },
    popularBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: COLORS.secondary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderBottomLeftRadius: 12,
    },
    popularText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: '700',
    },
    planHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    planIcon: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
    },
    planIconPopular: {
        backgroundColor: COLORS.secondary,
    },
    planInfo: {
        flex: 1,
        marginLeft: 14,
    },
    planName: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    planDuration: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    planPriceContainer: {
        alignItems: 'flex-end',
    },
    planPrice: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.secondary,
    },
    planSaving: {
        fontSize: 11,
        color: COLORS.success,
        fontWeight: '600',
        marginTop: 2,
    },
    planFeatures: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 16,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    featureText: {
        fontSize: 14,
        color: COLORS.text,
        marginLeft: 10,
    },
    selectedIndicator: {
        position: 'absolute',
        top: 12,
        left: 12,
    },
    purchaseButton: {
        marginTop: 8,
        backgroundColor: COLORS.secondary,
    },
    purchaseButtonDisabled: {
        backgroundColor: COLORS.textSecondary,
    },
    noteText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 16,
    },
});
