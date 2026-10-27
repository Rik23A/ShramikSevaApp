import { Stack } from 'expo-router';

import { StatusBar } from 'expo-status-bar';

export default function AuthLayout() {
    return (
        <>
            <StatusBar backgroundColor="#FFFFFF" style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="login" />
                <Stack.Screen name="select-role" />
                <Stack.Screen name="register" />
                <Stack.Screen name="verify-otp" />
            </Stack>
        </>
    );
}
