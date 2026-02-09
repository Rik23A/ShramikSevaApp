import React from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/config';

const Input = ({
    label,
    value,
    onChangeText,
    placeholder,
    error,
    secureTextEntry = false,
    keyboardType = 'default',
    autoCapitalize = 'sentences',
    multiline = false,
    numberOfLines = 1,
    style = {},
    ...props
}) => {
    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TextInput
                style={[
                    styles.input,
                    multiline && styles.multiline,
                    error && styles.inputError,
                    style,
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                multiline={multiline}
                numberOfLines={numberOfLines}
                {...props}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text,
        marginBottom: 6,
    },
    input: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        color: COLORS.text,
    },
    multiline: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    inputError: {
        borderColor: COLORS.danger,
    },
    errorText: {
        color: COLORS.danger,
        fontSize: 12,
        marginTop: 4,
    },
});

export default Input;
