import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, API_URL } from '../../constants/config';
import { useLanguage } from '../../context/LanguageContext';
import { getUserDocuments, uploadDocument as apiUploadDocument } from '../../services/userService';
import { uploadFile } from '../../services/uploadService';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import Input from '../ui/Input';

const DocumentUploadSection = ({ docTypes }) => {
    const { t } = useLanguage();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [docName, setDocName] = useState('');
    const [docType, setDocType] = useState('');

    const workerDefaults = [
        { label: 'Biodata', value: 'biodata' },
        { label: 'Aadhaar Card', value: 'adhaar_card' },
        { label: 'Voter ID', value: 'voter_id' },
        { label: 'Skill Certificate', value: 'skill_certificate' },
        { label: 'Experience Certificate', value: 'experience_certificate' },
        { label: 'Other', value: 'other' },
    ];

    const documentTypes = docTypes || workerDefaults;

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const data = await getUserDocuments();
            setDocuments(data || []);
        } catch (error) {
            console.error('Failed to fetch documents:', error);
            // Alert.alert('Error', 'Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    const handlePickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const file = result.assets[0];

            // Check file size (limit to 5MB)
            if (file.size > 5 * 1024 * 1024) {
                Alert.alert('Error', 'File size must be less than 5MB');
                return;
            }

            setSelectedFile(file);
            // Auto-fill name if empty
            if (!docName) {
                setDocName(file.name.split('.')[0]); // Remove extension
            }
        } catch (error) {
            console.error('Error picking document:', error);
            Alert.alert('Error', 'Failed to pick document');
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !docName || !docType) {
            Alert.alert('Error', 'Please fill all fields and select a file');
            return;
        }

        setUploading(true);
        try {
            // 1. Upload file to server
            // uploadFile expects the asset/file object directly
            const uploadResult = await uploadFile(selectedFile);

            if (!uploadResult || !uploadResult.fileUrl) {
                throw new Error('Upload failed - No URL returned');
            }

            // 2. Create document record
            await apiUploadDocument({
                name: docName,
                type: docType,
                url: uploadResult.fileUrl,
            });

            Alert.alert('Success', 'Document uploaded successfully');

            // Reset form
            setDocName('');
            setDocType('');
            setSelectedFile(null);
            setShowUploadForm(false);

            // Refresh list
            fetchDocuments();
        } catch (error) {
            console.error('Upload error:', error);
            Alert.alert('Error', error.message || 'Failed to upload document. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const renderDocumentItem = (doc) => (
        <View key={doc._id} style={styles.documentCard}>
            <View style={styles.docIconContainer}>
                <Ionicons name="document-text" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.docInfo}>
                <Text style={styles.docName}>{doc.name}</Text>
                <Text style={styles.docType}>
                    {documentTypes.find(t => t.value === doc.type)?.label || doc.type}
                </Text>
                <View style={styles.statusContainer}>
                    {doc.status === 'approved' && <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />}
                    {doc.status === 'pending' && <Ionicons name="time" size={14} color={COLORS.warning} />}
                    {doc.status === 'rejected' && <Ionicons name="close-circle" size={14} color={COLORS.danger} />}
                    <Text style={[
                        styles.statusText,
                        doc.status === 'approved' && { color: COLORS.success },
                        doc.status === 'pending' && { color: COLORS.warning },
                        doc.status === 'rejected' && { color: COLORS.danger },
                    ]}>
                        {doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : 'Pending'}
                    </Text>
                </View>
            </View>
            <TouchableOpacity
                style={styles.viewButton}
                onPress={async () => {
                    try {
                        let url = doc.url;
                        if (!url) return;

                        // Handle relative URLs
                        if (!url.startsWith('http')) {
                            // Remove /api if present in API_URL to get base URL, then append relative path
                            const baseUrl = API_URL.endsWith('/api')
                                ? API_URL.slice(0, -4)
                                : API_URL;
                            url = `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
                        }

                        // Encode URL to handle spaces and special characters
                        // This fixes "Not Found" errors for files with spaces in their names
                        const encodedUrl = encodeURI(url);

                        const supported = await Linking.canOpenURL(encodedUrl);
                        if (supported) {
                            await Linking.openURL(encodedUrl);
                        } else {
                            Alert.alert('Error', 'Cannot open this document');
                        }
                    } catch (error) {
                        console.error('Error opening document:', error);
                        Alert.alert('Error', 'Failed to open document');
                    }
                }}
            >
                <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('documents') || "Documents"}</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowUploadForm(!showUploadForm)}
                >
                    <Ionicons name={showUploadForm ? "close" : "add"} size={20} color={COLORS.white} />
                    <Text style={styles.addButtonText}>{showUploadForm ? "Cancel" : "Add New"}</Text>
                </TouchableOpacity>
            </View>

            {showUploadForm && (
                <View style={styles.uploadForm}>
                    <Input
                        label="Document Name"
                        placeholder="Enter document name e.g. Resume"
                        value={docName}
                        onChangeText={setDocName}
                    />

                    <Text style={styles.formLabel}>Document Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                        {documentTypes.map((type) => (
                            <TouchableOpacity
                                key={type.value}
                                style={[
                                    styles.typeChip,
                                    docType === type.value && styles.activeTypeChip
                                ]}
                                onPress={() => setDocType(type.value)}
                            >
                                <Text style={[
                                    styles.typeChipText,
                                    docType === type.value && styles.activeTypeChipText
                                ]}>
                                    {type.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <Text style={styles.formLabel}>File</Text>
                    <TouchableOpacity
                        style={styles.filePicker}
                        onPress={handlePickDocument}
                    >
                        <Ionicons name={selectedFile ? "document" : "cloud-upload-outline"} size={24} color={COLORS.textSecondary} />
                        <Text style={styles.filePickerText}>
                            {selectedFile ? selectedFile.name : 'Select File (PDF, Image)'}
                        </Text>
                        {selectedFile && (
                            <TouchableOpacity onPress={() => setSelectedFile(null)}>
                                <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>

                    <Button
                        title={uploading ? "Uploading..." : "Upload Document"}
                        onPress={handleUpload}
                        loading={uploading}
                        disabled={uploading || !selectedFile || !docName || !docType}
                        style={styles.submitButton}
                    />
                </View>
            )}

            {loading ? (
                <LoadingSpinner />
            ) : documents.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No documents uploaded yet.</Text>
                </View>
            ) : (
                <View style={styles.listContainer}>
                    {documents.map(renderDocumentItem)}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 20,
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    addButtonText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: '600',
    },
    uploadForm: {
        backgroundColor: COLORS.white,
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        backgroundColor: COLORS.background,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    inputText: {
        color: COLORS.text,
    },
    placeholderText: {
        color: COLORS.textSecondary,
    },
    typeScroll: {
        marginBottom: 8,
    },
    typeChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.background,
        marginRight: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    activeTypeChip: {
        backgroundColor: COLORS.primary + '20',
        borderColor: COLORS.primary,
    },
    typeChipText: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    activeTypeChipText: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    filePicker: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: COLORS.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
        gap: 12,
    },
    filePickerText: {
        flex: 1,
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    submitButton: {
        marginTop: 20,
    },
    documentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    docIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    docInfo: {
        flex: 1,
    },
    docName: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 2,
    },
    docType: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    viewButton: {
        padding: 8,
    },
    emptyState: {
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        color: COLORS.textSecondary,
        fontStyle: 'italic',
    },
});

export default DocumentUploadSection;
