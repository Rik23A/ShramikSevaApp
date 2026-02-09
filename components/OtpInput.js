import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { COLORS } from '../constants/config';

const OtpInput = ({ length = 6, value, onChange }) => {
    const inputRefs = useRef([]);
    const [otp, setOtp] = useState(new Array(length).fill(''));

    const handleChange = (text, index) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);
        onChange(newOtp.join(''));

        // Move to next input
        if (text && index < length - 1) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyPress = (e, index) => {
        // Move to previous input on backspace
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    return (
        <View style={styles.container}>
            {otp.map((digit, index) => (
                <TextInput
                    key={index}
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    style={[styles.input, digit && styles.inputFilled]}
                    value={digit}
                    onChangeText={(text) => handleChange(text.slice(-1), index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    input: {
        width: 45,
        height: 55,
        borderWidth: 2,
        borderColor: COLORS.border,
        borderRadius: 10,
        textAlign: 'center',
        fontSize: 24,
        fontWeight: '600',
        color: COLORS.text,
        backgroundColor: COLORS.white,
    },
    inputFilled: {
        borderColor: COLORS.primary,
        backgroundColor: '#FFF3E0',
    },
});

export default OtpInput;
