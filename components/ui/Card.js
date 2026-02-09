import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../constants/config';

const Card = ({
    children,
    title,
    onPress,
    style = {},
    titleStyle = {},
}) => {
    const CardWrapper = onPress ? TouchableOpacity : View;

    return (
        <CardWrapper
            style={[styles.card, style]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            {title && <Text style={[styles.title, titleStyle]}>{title}</Text>}
            {children}
        </CardWrapper>
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
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 12,
    },
});

export default Card;
