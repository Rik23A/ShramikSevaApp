import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Linking,
    Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS, API_URL } from '../../constants/config';
import { getInvoices, downloadInvoice } from '../../services/subscriptionService';
import { getToken } from '../../utils/storage';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';

export default function BillingScreen() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [downloading, setDownloading] = useState(null);

    // Derived root URL (removes /api from the end)
    const API_ROOT = API_URL.replace(/\/api$/, '');

    const fetchInvoices = async () => {
        try {
            const data = await getInvoices();
            setInvoices(data);
        } catch (error) {
            console.error('Failed to fetch invoices:', error);
            Alert.alert('Error', 'Failed to load invoices. Please try again later.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchInvoices();
    };

    const handleView = async (invoice) => {
        if (!invoice.pdfUrl) {
            Alert.alert('Info', 'Invoice PDF is not yet generated or available.');
            return;
        }

        try {
            const token = await getToken();
            const baseUrl = invoice.pdfUrl.startsWith('http')
                ? invoice.pdfUrl
                : `${API_ROOT}${invoice.pdfUrl}`;

            const urlWithToken = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}token=${token}`;

            console.log('Mobile Billing: Opening PDF:', urlWithToken);
            Linking.openURL(urlWithToken).catch(err => {
                console.error('Failed to open URL:', err);
                Alert.alert('Error', 'Could not open the invoice PDF.');
            });
        } catch (error) {
            console.error('View error:', error);
            Alert.alert('Error', 'Failed to get auth token.');
        }
    };

    const handleDownload = async (invoiceId) => {
        setDownloading(invoiceId);
        try {
            const token = await getToken();
            const url = `${API_URL}/payments/invoices/${invoiceId}/download?token=${token}`;
            console.log('Mobile Billing: Downloading from:', url);
            Linking.openURL(url);
        } catch (error) {
            console.error('Download error:', error);
            Alert.alert('Error', 'Failed to trigger download.');
        } finally {
            setDownloading(null);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'paid':
                return COLORS.success;
            case 'pending':
                return COLORS.warning;
            case 'overdue':
                return COLORS.danger;
            default:
                return COLORS.textSecondary;
        }
    };

    if (loading && !refreshing) {
        return <LoadingSpinner fullScreen message="Loading invoices..." />;
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Billing & Invoices',
                    headerStyle: { backgroundColor: COLORS.primary },
                    headerTintColor: COLORS.white,
                }}
            />

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                }
            >
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Subscription History</Text>
                    <Text style={styles.headerSubtitle}>View and manage your plan invoices</Text>
                </View>

                {invoices.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="document-text-outline" size={64} color={COLORS.border} />
                        <Text style={styles.emptyText}>No invoices found</Text>
                        <Button
                            title="Refresh"
                            onPress={onRefresh}
                            style={styles.refreshButton}
                        />
                    </View>
                ) : (
                    invoices.map((invoice, index) => (
                        <Animated.View
                            key={invoice._id}
                            entering={FadeInDown.delay(index * 100).springify()}
                        >
                            <Card style={styles.invoiceCard}>
                                <View style={styles.cardHeader}>
                                    <View>
                                        <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                                        <Text style={styles.planType}>
                                            {invoice.subscription?.planType || 'Subscription'} Plan
                                        </Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) + '20' }]}>
                                        <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
                                            {invoice.status.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.divider} />

                                <View style={styles.cardContent}>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Date</Text>
                                        <Text style={styles.infoValue}>
                                            {new Date(invoice.issueDate).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Amount</Text>
                                        <Text style={styles.amount}>₹{invoice.totalAmount.toFixed(2)}</Text>
                                    </View>
                                </View>

                                <View style={styles.cardActions}>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => handleView(invoice)}
                                    >
                                        <Ionicons name="eye-outline" size={18} color={COLORS.primary} />
                                        <Text style={styles.actionButtonText}>View</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.downloadButton]}
                                        onPress={() => handleDownload(invoice._id)}
                                        disabled={downloading === invoice._id}
                                    >
                                        <Ionicons
                                            name={downloading === invoice._id ? "hourglass-outline" : "download-outline"}
                                            size={18}
                                            color={COLORS.primary}
                                        />
                                        <Text style={styles.actionButtonText}>
                                            {downloading === invoice._id ? "Processing..." : "Download"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </Card>
                        </Animated.View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
    },
    headerSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    invoiceCard: {
        marginBottom: 16,
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    invoiceNumber: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        fontFamily: 'monospace',
    },
    planType: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
        marginTop: 2,
        textTransform: 'capitalize',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 12,
    },
    cardContent: {
        gap: 8,
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    infoValue: {
        fontSize: 13,
        color: COLORS.text,
        fontWeight: '500',
    },
    amount: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.text,
    },
    cardActions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.primary,
        gap: 6,
    },
    downloadButton: {
        backgroundColor: COLORS.primary + '10',
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.primary,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginTop: 12,
        marginBottom: 20,
    },
    refreshButton: {
        width: 120,
    },
});
