import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MessageStatus({ status, style }) {
    const getStatusIcon = () => {
        switch (status) {
            case 'sent':
                // Single gray checkmark
                return <Ionicons name="checkmark" size={16} color="rgba(0,0,0,0.45)" />;
            case 'delivered':
                // Double gray checkmarks
                return (
                    <View style={styles.doubleCheck}>
                        <Ionicons name="checkmark" size={16} color="rgba(0,0,0,0.45)" style={styles.check1} />
                        <Ionicons name="checkmark" size={16} color="rgba(0,0,0,0.45)" style={styles.check2} />
                    </View>
                );
            case 'read':
                // Double blue checkmarks (WhatsApp blue)
                return (
                    <View style={styles.doubleCheck}>
                        <Ionicons name="checkmark" size={16} color="#53BDEB" style={styles.check1} />
                        <Ionicons name="checkmark" size={16} color="#53BDEB" style={styles.check2} />
                    </View>
                );
            default:
                return null;
        }
    };

    return <View style={[styles.container, style]}>{getStatusIcon()}</View>;
}

const styles = StyleSheet.create({
    container: {
        marginLeft: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    doubleCheck: {
        flexDirection: 'row',
        position: 'relative',
        width: 20,
        height: 16,
    },
    check1: {
        position: 'absolute',
        left: 0,
    },
    check2: {
        position: 'absolute',
        left: 5,
    },
});
