import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    Alert,
    Image,
    Dimensions,
    StatusBar as RNStatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { COLORS, API_URL } from '../../constants/config';
import { getToken } from '../../utils/storage';
import { useLanguage } from '../../context/LanguageContext';

const { width, height } = Dimensions.get('window');

/**
 * In-App Document and Invoice Viewer Modal
 * 
 * Props:
 * - visible: boolean
 * - onClose: () => void
 * - title: string (e.g., 'Invoice INV-001' or 'Document Preview')
 * - fileUrl: string (API endpoint or relative/absolute URL to the document)
 * - isInvoice: boolean (if true, will format download endpoint)
 * - invoiceId: string (optional, for direct invoice API download)
 * - fileName: string (optional, display filename)
 */
export default function DocumentViewerModal({
    visible,
    onClose,
    title = 'Document Preview',
    fileUrl,
    isInvoice = false,
    invoiceId,
    fileName = 'document.pdf',
}) {
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [errorType, setErrorType] = useState(null); // '404', '403', 'network', null
    const [errorMessage, setErrorMessage] = useState('');
    const [localUri, setLocalUri] = useState(null);
    const [isPdf, setIsPdf] = useState(true);
    const [base64Pdf, setBase64Pdf] = useState(null);
    const [sharingLoading, setSharingLoading] = useState(false);

    // Calculate safe top inset across Android & iOS devices
    const topInset = Math.max(insets.top, Platform.OS === 'android' ? RNStatusBar.currentHeight || 24 : 0);

    useEffect(() => {
        if (visible) {
            loadFile();
        } else {
            // Reset state on close
            setLoading(true);
            setErrorType(null);
            setErrorMessage('');
            setLocalUri(null);
            setBase64Pdf(null);
        }
    }, [visible, fileUrl, invoiceId]);

    const getFullUrl = () => {
        if (invoiceId) {
            return `${API_URL}/payments/invoices/${invoiceId}/view`;
        }
        if (!fileUrl) return null;

        if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
            return fileUrl;
        }

        // Relative path
        const base = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
        return `${base}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
    };

    const loadFile = async () => {
        setLoading(true);
        setErrorType(null);
        setErrorMessage('');
        setLocalUri(null);
        setBase64Pdf(null);

        const targetUrl = getFullUrl();
        console.log('[DocumentViewer] Fetching target URL:', targetUrl);

        if (!targetUrl) {
            setErrorType('404');
            setErrorMessage(t('doc_not_found') || 'Document not found (404)');
            setLoading(false);
            return;
        }

        try {
            const token = await getToken();
            const ext = targetUrl.toLowerCase().endsWith('.png') ? 'png'
                : targetUrl.toLowerCase().endsWith('.jpg') || targetUrl.toLowerCase().endsWith('.jpeg') ? 'jpg'
                : 'pdf';

            setIsPdf(ext === 'pdf');

            const cacheFileName = `doc_cache_${Date.now()}.${ext}`;
            const targetPath = `${FileSystem.cacheDirectory}${cacheFileName}`;

            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const downloadResult = await FileSystem.downloadAsync(targetUrl, targetPath, {
                headers,
            });

            console.log('[DocumentViewer] Download status:', downloadResult.status);

            if (downloadResult.status === 404) {
                setErrorType('404');
                setErrorMessage(t('doc_not_found_desc') || 'The requested document or invoice does not exist or has been removed (404 Not Found).');
                setLoading(false);
                return;
            }

            if (downloadResult.status === 403 || downloadResult.status === 401) {
                setErrorType('403');
                setErrorMessage(t('access_denied_doc') || 'Access Denied (403): You do not have permission to view this document.');
                setLoading(false);
                return;
            }

            if (downloadResult.status !== 200) {
                setErrorType('error');
                setErrorMessage(`Failed to load document (Status: ${downloadResult.status})`);
                setLoading(false);
                return;
            }

            // Check if returned content is an HTML error page or JSON error rather than a real PDF
            const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
            if (fileInfo.size < 200) {
                const content = await FileSystem.readAsStringAsync(downloadResult.uri, { encoding: FileSystem.EncodingType.UTF8 }).catch(() => '');
                if (content.includes('404') || content.includes('not found') || content.includes('Invoice not found')) {
                    setErrorType('404');
                    setErrorMessage(t('doc_not_found_desc') || 'The requested document or invoice does not exist on the server (404 Not Found).');
                    setLoading(false);
                    return;
                }
            }

            setLocalUri(downloadResult.uri);

            // If PDF on Android, load base64 for reliable WebView rendering
            if (ext === 'pdf' && Platform.OS === 'android') {
                try {
                    const b64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                    setBase64Pdf(b64);
                } catch (e) {
                    console.log('[DocumentViewer] Base64 read skipped/failed:', e);
                }
            }

            setLoading(false);
        } catch (err) {
            console.error('[DocumentViewer] Error loading document:', err);
            setErrorType('error');
            setErrorMessage(err.message || 'An error occurred while loading the document.');
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!localUri) return;
        try {
            setSharingLoading(true);
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert(t('info') || 'Info', 'Sharing is not available on this device');
                return;
            }

            await Sharing.shareAsync(localUri, {
                mimeType: isPdf ? 'application/pdf' : 'image/jpeg',
                dialogTitle: title || 'Share Document',
                UTI: isPdf ? 'com.adobe.pdf' : 'public.jpeg',
            });
        } catch (err) {
            console.error('[DocumentViewer] Share error:', err);
            Alert.alert(t('error_title') || 'Error', 'Failed to share document.');
        } finally {
            setSharingLoading(false);
        }
    };

    const renderHtmlPdfViewer = () => {
        if (!base64Pdf) {
            return `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0">
                    <style>
                        body { margin: 0; padding: 24px; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 80vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F8FAFC; color: #1E293B; }
                        .card { background: white; padding: 24px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); text-align: center; max-width: 90%; }
                        h3 { color: #1976D2; margin-top: 0; font-size: 18px; }
                        p { font-size: 14px; line-height: 1.6; color: #64748B; margin-bottom: 0; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <h3>📄 Document Prepared</h3>
                        <p>Use the share or print button below to view or export this document.</p>
                    </div>
                </body>
            </html>
            `;
        }

        return `
        <!DOCTYPE html>
        <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=4.0, user-scalable=yes">
                <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    html, body {
                        background-color: #525659;
                        margin: 0;
                        padding: 0;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    }
                    #container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        padding: 12px 8px;
                        gap: 12px;
                    }
                    .page-box {
                        background: #FFFFFF;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
                        border-radius: 4px;
                        overflow: hidden;
                        max-width: 100%;
                    }
                    canvas {
                        display: block;
                        width: 100% !important;
                        height: auto !important;
                    }
                    #loader {
                        color: #FFFFFF;
                        font-size: 15px;
                        text-align: center;
                        padding: 60px 20px;
                    }
                    .spinner {
                        border: 3px solid rgba(255, 255, 255, 0.3);
                        border-radius: 50%;
                        border-top: 3px solid #FFFFFF;
                        width: 32px;
                        height: 32px;
                        animation: spin 0.8s linear infinite;
                        margin: 0 auto 16px auto;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    #error-box {
                        display: none;
                        background: #FFFFFF;
                        color: #DC2626;
                        padding: 20px;
                        border-radius: 12px;
                        margin: 40px 16px;
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <div id="loader">
                    <div class="spinner"></div>
                    <div>Rendering document...</div>
                </div>
                <div id="error-box"></div>
                <div id="container"></div>

                <script>
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

                    try {
                        const base64Data = "${base64Pdf}";
                        const raw = window.atob(base64Data);
                        const rawLength = raw.length;
                        const array = new Uint8Array(new ArrayBuffer(rawLength));
                        for (let i = 0; i < rawLength; i++) {
                            array[i] = raw.charCodeAt(i);
                        }

                        pdfjsLib.getDocument({ data: array }).promise.then(async function(pdf) {
                            document.getElementById('loader').style.display = 'none';
                            const container = document.getElementById('container');

                            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                                const page = await pdf.getPage(pageNum);
                                const viewport = page.getViewport({ scale: 2.0 });

                                const pageBox = document.createElement('div');
                                pageBox.className = 'page-box';

                                const canvas = document.createElement('canvas');
                                const context = canvas.getContext('2d');
                                canvas.height = viewport.height;
                                canvas.width = viewport.width;

                                pageBox.appendChild(canvas);
                                container.appendChild(pageBox);

                                await page.render({ canvasContext: context, viewport: viewport }).promise;
                            }
                        }).catch(function(err) {
                            document.getElementById('loader').style.display = 'none';
                            const errBox = document.getElementById('error-box');
                            errBox.style.display = 'block';
                            errBox.innerHTML = '<h3 style="margin-bottom:8px;">Failed to render PDF preview</h3><p style="color:#64748B;font-size:13px;">' + (err.message || 'Please use the share/print button below to view the original PDF.') + '</p>';
                        });
                    } catch (e) {
                        document.getElementById('loader').style.display = 'none';
                        const errBox = document.getElementById('error-box');
                        errBox.style.display = 'block';
                        errBox.innerHTML = '<h3 style="margin-bottom:8px;">Preview Error</h3><p style="color:#64748B;font-size:13px;">' + e.message + '</p>';
                    }
                </script>
            </body>
        </html>
        `;
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
            statusBarTranslucent={true}
        >
            <View style={styles.container}>
                <StatusBar style="light" backgroundColor={COLORS.primary || '#1976D2'} translucent={true} />

                {/* Top Header with Safe Area Inset */}
                <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={onClose}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="close" size={22} color="#FFFFFF" />
                        </TouchableOpacity>

                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle} numberOfLines={1}>
                                {title}
                            </Text>
                            <Text style={styles.headerSubtitle} numberOfLines={1}>
                                {fileName || (isPdf ? 'PDF Document' : 'Image File')}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.headerButton, (!localUri || loading || errorType) && styles.headerButtonDisabled]}
                            onPress={handleShare}
                            disabled={!localUri || loading || errorType || sharingLoading}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            {sharingLoading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Ionicons
                                    name="share-outline"
                                    size={20}
                                    color="#FFFFFF"
                                />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Content Body */}
                <View style={styles.body}>
                    {loading ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text style={styles.loadingText}>
                                {t('loading_document') || 'Loading document...'}
                            </Text>
                        </View>
                    ) : errorType === '404' ? (
                        /* 404 Not Found State */
                        <View style={styles.centerContainer}>
                            <View style={styles.errorIconCircle404}>
                                <Ionicons name="document-text-outline" size={48} color={COLORS.danger} />
                                <View style={styles.badge404}>
                                    <Text style={styles.badge404Text}>404</Text>
                                </View>
                            </View>
                            <Text style={styles.errorTitle}>
                                {t('doc_not_found') || 'Document Not Found'}
                            </Text>
                            <Text style={styles.errorDescription}>
                                {errorMessage || (t('doc_not_found_desc') || 'The requested document or invoice does not exist or has not been generated yet on the server.')}
                            </Text>
                            <View style={styles.errorActions}>
                                <TouchableOpacity style={styles.retryButton} onPress={loadFile}>
                                    <Ionicons name="refresh-outline" size={18} color={COLORS.primary} />
                                    <Text style={styles.retryButtonText}>{t('retry') || 'Retry'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                    <Text style={styles.closeButtonText}>{t('close') || 'Close'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : errorType === '403' ? (
                        /* 403 Forbidden State */
                        <View style={styles.centerContainer}>
                            <View style={[styles.errorIconCircle404, { backgroundColor: '#FEF3C7' }]}>
                                <Ionicons name="lock-closed" size={44} color="#D97706" />
                            </View>
                            <Text style={styles.errorTitle}>
                                {t('access_denied') || 'Access Denied'}
                            </Text>
                            <Text style={styles.errorDescription}>
                                {errorMessage || 'You do not have permission to view or download this file.'}
                            </Text>
                            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                <Text style={styles.closeButtonText}>{t('close') || 'Close'}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : errorType ? (
                        /* General Error State */
                        <View style={styles.centerContainer}>
                            <View style={styles.errorIconCircle}>
                                <Ionicons name="alert-circle" size={48} color={COLORS.danger} />
                            </View>
                            <Text style={styles.errorTitle}>
                                {t('error_loading_doc') || 'Failed to Load Document'}
                            </Text>
                            <Text style={styles.errorDescription}>
                                {errorMessage}
                            </Text>
                            <View style={styles.errorActions}>
                                <TouchableOpacity style={styles.retryButton} onPress={loadFile}>
                                    <Ionicons name="refresh-outline" size={18} color={COLORS.primary} />
                                    <Text style={styles.retryButtonText}>{t('retry') || 'Retry'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                    <Text style={styles.closeButtonText}>{t('close') || 'Close'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : isPdf ? (
                        /* PDF Render */
                        Platform.OS === 'ios' ? (
                            <WebView
                                source={{ uri: localUri }}
                                style={styles.webView}
                                startInLoadingState={true}
                                scalesPageToFit={true}
                                bounces={false}
                            />
                        ) : (
                            <WebView
                                originWhitelist={['*']}
                                source={{ html: renderHtmlPdfViewer() }}
                                style={styles.webView}
                                allowFileAccess={true}
                                allowFileAccessFromFileURLs={true}
                                allowUniversalAccessFromFileURLs={true}
                                startInLoadingState={true}
                                scalesPageToFit={true}
                                javaScriptEnabled={true}
                                domStorageEnabled={true}
                            />
                        )
                    ) : (
                        /* Image Render */
                        <View style={styles.imageContainer}>
                            <Image
                                source={{ uri: localUri }}
                                style={styles.image}
                                resizeMode="contain"
                            />
                        </View>
                    )}
                </View>

                {/* Footer Bar when document is successfully loaded */}
                {localUri && !errorType && !loading && (
                    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                        <TouchableOpacity
                            style={styles.footerShareButton}
                            onPress={handleShare}
                        >
                            <Ionicons name="share-social-outline" size={20} color={COLORS.white} />
                            <Text style={styles.footerShareButtonText}>
                                {t('share_or_print') || 'Share / Print Document'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    headerContainer: {
        backgroundColor: COLORS.primary || '#1976D2',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.08)',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
    },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    headerButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    headerButtonDisabled: {
        opacity: 0.35,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.85)',
        marginTop: 2,
    },
    body: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    webView: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 15,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    errorIconCircle404: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    badge404: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: COLORS.danger,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    badge404Text: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
    },
    errorIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    errorDescription: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    errorActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        maxWidth: 280,
    },
    retryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        backgroundColor: '#FFFFFF',
        gap: 6,
    },
    retryButtonText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    closeButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
    },
    closeButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    footer: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    footerShareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    footerShareButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
