import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentSubscription, getSubscriptionPlans } from '../services/subscriptionService';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext(null);

export const SubscriptionProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [subscription, setSubscription] = useState(null);
    const [plans, setPlans] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [plansLoading, setPlansLoading] = useState(false);

    const fetchPlans = useCallback(async () => {
        try {
            setPlansLoading(true);
            const data = await getSubscriptionPlans();
            setPlans(data);
        } catch (error) {
            console.error('Error fetching plans in context:', error);
        } finally {
            setPlansLoading(false);
        }
    }, []);

    const refreshSubscription = useCallback(async () => {
        if (!isAuthenticated || (user && user.role !== 'employer')) {
            setSubscription(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const data = await getCurrentSubscription();

            if (data) {
                const endDate = new Date(data.endDate);
                const daysRemaining = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
                const credits = Math.max(0, (data.maxDatabaseUnlocks || 0) - (data.databaseUnlocksUsed || 0));

                setSubscription({
                    ...data,
                    daysRemaining,
                    credits,
                    maxJobs: data.maxActiveJobs
                });
            } else {
                setSubscription(null);
            }

            // Also fetch plans if they haven't been loaded yet
            if (plans.length === 0) {
                await fetchPlans();
            }
        } catch (error) {
            console.error('Error fetching subscription in context:', error);
            setSubscription(null);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, user, plans.length, fetchPlans]);

    useEffect(() => {
        if (isAuthenticated && user?.role === 'employer') {
            refreshSubscription();
        } else {
            setSubscription(null);
            setLoading(false);
        }
    }, [refreshSubscription, isAuthenticated, user]);

    const hasActiveSubscription = subscription !== null &&
        subscription.status === 'active' &&
        new Date(subscription.endDate) >= new Date();

    const canUnlockWorker = hasActiveSubscription &&
        subscription.databaseUnlocksUsed < subscription.maxDatabaseUnlocks;

    const canChangeLocation = hasActiveSubscription &&
        subscription.locationChangesUsed < subscription.maxLocationChanges;

    const canPostJob = hasActiveSubscription &&
        subscription.maxActiveJobs > 0; // Simple check, backend has thorough validation

    const hasWorklogAccess = hasActiveSubscription && (
        subscription.planType === 'premium' ||
        (subscription.worklogAccessExpiry && new Date(subscription.worklogAccessExpiry) > new Date())
    );

    return (
        <SubscriptionContext.Provider
            value={{
                subscription,
                plans,
                selectedPlan,
                setSelectedPlan,
                loading,
                plansLoading,
                refreshSubscription,
                hasActiveSubscription,
                canUnlockWorker,
                canChangeLocation,
                canPostJob,
                hasWorklogAccess
            }}
        >
            {children}
        </SubscriptionContext.Provider>
    );
};

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (!context) {
        throw new Error('useSubscription must be used within SubscriptionProvider');
    }
    return context;
};
