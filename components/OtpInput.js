import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { COLORS } from '../constants/config';

const OtpInput = ({ length = 6, value, onChange }) => {
    const inputRefs = useRef([]);
    const [otp, setOtp] = useState(new Array(length).fill(''));

    const handleChange = (text, index) => {
        // Handle multi-character input (like paste or fast typing)
        const cleanedText = text.replace(/[^0-9]/g, '');
        if (!cleanedText) {
            const newOtp = [...otp];
            newOtp[index] = '';
            setOtp(newOtp);
            onChange(newOtp.join(''));
            return;
        }

        const newOtp = [...otp];
        const chars = cleanedText.split('');

        let nextIndex = index;
        chars.forEach((char, i) => {
            if (index + i < length) {
                newOtp[index + i] = char;
                nextIndex = index + i + 1;
            }
        });

        setOtp(newOtp);
        onChange(newOtp.join(''));

        // Move focus
        if (nextIndex < length) {
            inputRefs.current[nextIndex].focus();
        } else if (nextIndex === length) {
            inputRefs.current[length - 1].blur();
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace') {
            if (!otp[index] && index > 0) {
                inputRefs.current[index - 1].focus();
            }
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
                    onChangeText={(text) => handleChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={length - index} // Allow pasting remaining digits
                    selectTextOnFocus
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        paddingHorizontal: 0,
        width: '100%',
    },
    input: {
        width: 42,
        height: 52,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        borderRadius: 10,
        textAlign: 'center',
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.text,
        backgroundColor: COLORS.white,
    },
    inputFilled: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryLight + '10',
    },
});

export default OtpInput;
