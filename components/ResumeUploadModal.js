import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { uploadFile } from '../services/uploadService';
import { uploadDocument, getDocuments } from '../services/documentService';
import { COLORS as Colors } from '../constants/config';
import { useLanguage } from '../context/LanguageContext';

const ResumeUploadModal = ({ visible, onClose, onUploadSuccess, onSkip }) => {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [fetchingCVs, setFetchingCVs] = useState(false);
    const [existingCVs, setExistingCVs] = useState([]);
    const [selectedCVId, setSelectedCVId] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);

    useEffect(() => {
        if (visible) {
            fetchCVs();
        }
    }, [visible]);

    const fetchCVs = async () => {
        try {
            setFetchingCVs(true);
            const docs = await getDocuments();
            const cvs = docs.filter(doc =>
                doc.type === 'biodata' ||
                doc.name.toLowerCase().includes('resume') ||
                doc.name.toLowerCase().includes('cv') ||
                doc.name.toLowerCase().includes('biodata')
            );
            setExistingCVs(cvs);
        } catch (error) {
            console.error('Error fetching CVs:', error);
        } finally {
            setFetchingCVs(false);
        }
    };

    const handlePickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled) {
                setSelectedFile(result.assets[0]);
                setSelectedCVId(null);
            }
        } catch (error) {
            Alert.alert(t('error'), t('failed_to_pick_doc'));
            console.error(error);
        }
    };

    const handleApply = async () => {
        if (selectedCVId) {
            onUploadSuccess(selectedCVId);
            return;
        }

        if (!selectedFile) {
            Alert.alert(t('selection_required'), t('selection_required_msg'));
            return;
        }

        setLoading(true);
        try {
            const uploadResponse = await uploadFile({
                uri: selectedFile.uri,
                name: selectedFile.name,
                mimeType: selectedFile.mimeType || 'application/pdf',
            });
            const newDoc = await uploadDocument({
                name: `${t('resume')} - ${new Date().toLocaleDateString()}`,
                url: uploadResponse.fileUrl,
                type: 'biodata',
            });

            onUploadSuccess(newDoc._id);
        } catch (error) {
            Alert.alert(t('error'), t('failed_to_upload_resume'));
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('upload_resume_title')}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={Colors.text} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.description}>
                        {t('resume_upload_desc')}
                    </Text>

                    <ScrollView style={styles.scrollArea}>
                        {fetchingCVs ? (
                            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 20 }} />
                        ) : existingCVs.length > 0 ? (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>{t('select_existing_cv')}</Text>
                                {existingCVs.map((cv) => (
                                    <TouchableOpacity
                                        key={cv._id}
                                        style={[
                                            styles.cvItem,
                                            selectedCVId === cv._id && styles.cvItemSelected
                                        ]}
                                        onPress={() => {
                                            if (selectedCVId === cv._id) {
                                                setSelectedCVId(null);
                                            } else {
                                                setSelectedCVId(cv._id);
                                                setSelectedFile(null);
                                            }
                                        }}
                                    >
                                        <View style={[
                                            styles.radio,
                                            selectedCVId === cv._id && styles.radioSelected
                                        ]}>
                                            {selectedCVId === cv._id && <View style={styles.radioInner} />}
                                        </View>
                                        <View style={styles.cvInfo}>
                                            <Text style={styles.cvName} numberOfLines={1}>{cv.name}</Text>
                                            <Text style={styles.cvDate}>{new Date(cv.createdAt).toLocaleDateString()}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                                <View style={styles.dividerContainer}>
                                    <View style={styles.divider} />
                                    <Text style={styles.dividerText}>{t('or_upload_new')}</Text>
                                    <View style={styles.divider} />
                                </View>
                            </View>
                        ) : null}

                        <TouchableOpacity
                            style={styles.uploadBox}
                            onPress={handlePickDocument}
                        >
                            <Ionicons name="cloud-upload-outline" size={32} color={Colors.primary} />
                            <Text style={styles.uploadText}>
                                {selectedFile ? selectedFile.name : t('select_file_placeholder')}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.applyButton, (!selectedCVId && !selectedFile) && styles.buttonDisabled]}
                            onPress={handleApply}
                            disabled={loading || (!selectedCVId && !selectedFile)}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.applyButtonText}>
                                    {selectedCVId ? t('use_selected_apply') : t('upload_and_apply')}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.bottomButtons}>
                            <TouchableOpacity onPress={onClose} style={styles.secondaryButton}>
                                <Text style={styles.secondaryButtonText}>{t('cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
                                <Text style={styles.skipButtonText}>{t('skip_apply')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        maxHeight: '80%',
        paddingVertical: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
    },
    closeButton: {
        padding: 5,
    },
    description: {
        fontSize: 14,
        color: '#666',
        paddingHorizontal: 20,
        marginBottom: 20,
        lineHeight: 20,
    },
    scrollArea: {
        paddingHorizontal: 20,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
        color: '#444',
    },
    cvItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
        marginBottom: 8,
    },
    cvItemSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '08',
    },
    radio: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1.5,
        borderColor: '#ccc',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    radioSelected: {
        borderColor: Colors.primary,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.primary,
    },
    cvInfo: {
        flex: 1,
    },
    cvName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    cvDate: {
        fontSize: 10,
        color: '#999',
        marginTop: 2,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 15,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: '#eee',
    },
    dividerText: {
        fontSize: 10,
        color: '#999',
        marginHorizontal: 10,
        fontWeight: 'bold',
    },
    uploadBox: {
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9f9f9',
    },
    uploadText: {
        marginTop: 10,
        fontSize: 14,
        color: Colors.primary,
        textAlign: 'center',
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    applyButton: {
        backgroundColor: Colors.primary,
        height: 50,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
    },
    applyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    bottomButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    secondaryButton: {
        paddingVertical: 10,
    },
    secondaryButtonText: {
        color: '#666',
        fontSize: 14,
    },
    skipButton: {
        borderWidth: 1,
        borderColor: Colors.primary + '33',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 8,
    },
    skipButtonText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '500',
    },
});

export default ResumeUploadModal;
