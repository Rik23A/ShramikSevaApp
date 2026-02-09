import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../constants/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [locale, setLocale] = useState('en');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLanguage();
    }, []);

    const loadLanguage = async () => {
        try {
            const savedLanguage = await AsyncStorage.getItem('user-language');
            if (savedLanguage) {
                setLocale(savedLanguage);
            }
        } catch (error) {
            console.error('Failed to load language', error);
        } finally {
            setLoading(false);
        }
    };

    const changeLanguage = async (newLocale) => {
        try {
            await AsyncStorage.setItem('user-language', newLocale);
            setLocale(newLocale);
        } catch (error) {
            console.error('Failed to save language', error);
        }
    };

    const t = (key) => {
        const keys = key.split('.');
        let value = translations[locale];

        for (const k of keys) {
            value = value?.[k];
            if (!value) break;
        }

        return value || translations['en'][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ locale, changeLanguage, t, loading }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
