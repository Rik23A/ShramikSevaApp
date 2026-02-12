import React from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS } from '../../constants/config';

export default function TypingIndicator({ userName, style }) {
    const dot1 = React.useRef(new Animated.Value(0)).current;
    const dot2 = React.useRef(new Animated.Value(0)).current;
    const dot3 = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        const createAnimation = (dot, delay) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(dot, {
                        toValue: 1,
                        duration: 400,
                        easing: Easing.ease,
                        useNativeDriver: true,
                    }),
                    Animated.timing(dot, {
                        toValue: 0,
                        duration: 400,
                        easing: Easing.ease,
                        useNativeDriver: true,
                    }),
                ])
            );
        };

        const anim1 = createAnimation(dot1, 0);
        const anim2 = createAnimation(dot2, 200);
        const anim3 = createAnimation(dot3, 400);

        anim1.start();
        anim2.start();
        anim3.start();

        return () => {
            anim1.stop();
            anim2.stop();
            anim3.stop();
        };
    }, []);

    const dotStyle = (animatedValue) => ({
        opacity: animatedValue,
        transform: [
            {
                translateY: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -5],
                }),
            },
        ],
    });

    return (
        <View style={[styles.container, style]}>
            <View style={styles.dotsContainer}>
                <Animated.View style={[styles.dot, dotStyle(dot1)]} />
                <Animated.View style={[styles.dot, dotStyle(dot2)]} />
                <Animated.View style={[styles.dot, dotStyle(dot3)]} />
            </View>
            {userName && (
                <Text style={styles.text}>{userName} is typing...</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: COLORS.background,
    },
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
        marginHorizontal: 2,
    },
    text: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
    },
});
