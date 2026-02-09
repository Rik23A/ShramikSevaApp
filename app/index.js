import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function Index() {
    const { isAuthenticated, isLoading, user } = useAuth();

    if (isLoading) {
        return <LoadingSpinner fullScreen message="Loading..." />;
    }

    if (isAuthenticated && user) {
        // Redirect to appropriate dashboard based on role
        if (user.role === 'worker') {
            return <Redirect href="/(worker)/dashboard" />;
        } else if (user.role === 'employer') {
            return <Redirect href="/(employer)/dashboard" />;
        }
    }

    // Not authenticated, redirect to language selection first (WorkIndia style)
    return <Redirect href="/language-selection" />;
}
