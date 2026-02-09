import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { COLORS } from '../../constants/config';

const LoadingSpinner = ({ message = 'Loading...', fullScreen = false }) => {
    if (fullScreen) {
        return (
            <View style={styles.fullScreen}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.message}>{message}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            {message && <Text style={styles.message}>{message}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        alignItems: 'center',
    },
    fullScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    message: {
        marginTop: 12,
        fontSize: 14,
        color: COLORS.textSecondary,
    },
});

export default LoadingSpinner;
