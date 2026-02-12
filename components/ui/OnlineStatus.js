import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/config';

export default function OnlineStatus({ isOnline, size = 12, style }) {
    return (
        <View
            style={[
                styles.indicator,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: isOnline ? COLORS.success : COLORS.textLight,
                },
                style,
            ]}
        />
    );
}

const styles = StyleSheet.create({
    indicator: {
        borderWidth: 2,
        borderColor: COLORS.white,
    },
});
