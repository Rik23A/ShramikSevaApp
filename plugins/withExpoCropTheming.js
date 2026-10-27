const { withAndroidColors, withAndroidColorsNight, withAndroidManifest, withGradleProperties, AndroidConfig } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to ensure high-visibility theming and status bar display
 * for the image crop screen on Android.
 *
 * Light mode: Clean white toolbar/status bar with high-contrast brand blue icons
 * and dark contrast image workspace.
 * Dark mode: Dark slate toolbar/status bar with high-contrast white icons.
 */
const withExpoCropTheming = (config) => {
    config = withAndroidColors(config, (colorsConfig) => {
        colorsConfig.modResults = AndroidConfig.Colors.setColorItem(
            { name: 'expoCropToolbarColor', value: '#FFFFFF' },
            colorsConfig.modResults
        );
        colorsConfig.modResults = AndroidConfig.Colors.setColorItem(
            { name: 'expoCropToolbarIconColor', value: '#24528E' },
            colorsConfig.modResults
        );
        colorsConfig.modResults = AndroidConfig.Colors.setColorItem(
            { name: 'expoCropToolbarActionTextColor', value: '#24528E' },
            colorsConfig.modResults
        );
        colorsConfig.modResults = AndroidConfig.Colors.setColorItem(
            { name: 'expoCropBackButtonIconColor', value: '#24528E' },
            colorsConfig.modResults
        );
        colorsConfig.modResults = AndroidConfig.Colors.setColorItem(
            { name: 'expoCropBackgroundColor', value: '#121212' },
            colorsConfig.modResults
        );
        return colorsConfig;
    });

    config = withAndroidColorsNight(config, (colorsNightConfig) => {
        colorsNightConfig.modResults = AndroidConfig.Colors.setColorItem(
            { name: 'expoCropToolbarColor', value: '#1E293B' },
            colorsNightConfig.modResults
        );
        colorsNightConfig.modResults = AndroidConfig.Colors.setColorItem(
            { name: 'expoCropToolbarIconColor', value: '#FFFFFF' },
            colorsNightConfig.modResults
        );
        colorsNightConfig.modResults = AndroidConfig.Colors.setColorItem(
            { name: 'expoCropToolbarActionTextColor', value: '#38BDF8' },
            colorsNightConfig.modResults
        );
        colorsNightConfig.modResults = AndroidConfig.Colors.setColorItem(
            { name: 'expoCropBackButtonIconColor', value: '#FFFFFF' },
            colorsNightConfig.modResults
        );
        colorsNightConfig.modResults = AndroidConfig.Colors.setColorItem(
            { name: 'expoCropBackgroundColor', value: '#0F172A' },
            colorsNightConfig.modResults
        );
        return colorsNightConfig;
    });

    config = withAndroidManifest(config, (manifestConfig) => {
        const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(manifestConfig.modResults);
        let activities = mainApplication.activity || [];

        let cropActivity = activities.find(
            (a) => a.$ && a.$['android:name'] === 'expo.modules.imagepicker.ExpoCropImageActivity'
        );

        if (!cropActivity) {
            cropActivity = {
                $: {
                    'android:name': 'expo.modules.imagepicker.ExpoCropImageActivity',
                    'android:theme': '@style/Theme.ExpoCropImage',
                    'android:exported': 'false',
                    'tools:replace': 'android:theme,android:exported'
                }
            };
            activities.push(cropActivity);
        } else {
            cropActivity.$['android:theme'] = '@style/Theme.ExpoCropImage';
            cropActivity.$['tools:replace'] = 'android:theme,android:exported';
        }
        mainApplication.activity = activities;
        return manifestConfig;
    });

    config = withGradleProperties(config, (gradleConfig) => {
        const propertiesToSet = [
            { key: 'android.enableMinifyInReleaseBuilds', value: 'true' },
            { key: 'android.enableShrinkResourcesInReleaseBuilds', value: 'true' },
            { key: 'android.enableR8.fullMode', value: 'true' },
            { key: 'android.enableResourceOptimizations', value: 'true' },
        ];
        propertiesToSet.forEach(({ key, value }) => {
            const existingIndex = gradleConfig.modResults.findIndex((item) => item.type === 'property' && item.key === key);
            if (existingIndex >= 0) {
                gradleConfig.modResults[existingIndex].value = value;
            } else {
                gradleConfig.modResults.push({ type: 'property', key, value });
            }
        });
        return gradleConfig;
    });

    return config;
};

module.exports = withExpoCropTheming;
