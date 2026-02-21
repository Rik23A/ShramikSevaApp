import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    TextInput,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import Button from './Button';

const { height } = Dimensions.get('window');

/**
 * SelectionModal - A reusable modal for selecting one or more items from a list
 * @param {boolean} visible - Modal visibility
 * @param {string} title - Modal title
 * @param {Array} options - List of strings or objects { label, value }
 * @param {Array|string} selectedValue - Currently selected value(s)
 * @param {function} onSelect - Callback when selection changes
 * @param {function} onClose - Callback when modal closes
 * @param {boolean} multiSelect - Whether to allow multiple selections
 * @param {boolean} showSearch - Whether to show search bar
 */
export default function SelectionModal({
    visible,
    title,
    options = [],
    selectedValue,
    onSelect,
    onClose,
    multiSelect = false,
    showSearch = true,
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [tempSelection, setTempSelection] = useState([]);

    useEffect(() => {
        if (visible) {
            if (multiSelect) {
                setTempSelection(Array.isArray(selectedValue) ? selectedValue : (selectedValue ? [selectedValue] : []));
            } else {
                setTempSelection(selectedValue ? [selectedValue] : []);
            }
            setSearchQuery('');
        }
    }, [visible, selectedValue, multiSelect]);

    const filteredOptions = options.filter(option => {
        const label = typeof option === 'string' ? option : option.label;
        return label.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const handleToggle = (option) => {
        const value = typeof option === 'string' ? option : option.value;

        if (multiSelect) {
            if (tempSelection.includes(value)) {
                setTempSelection(tempSelection.filter(item => item !== value));
            } else {
                setTempSelection([...tempSelection, value]);
            }
        } else {
            onSelect(value);
            onClose();
        }
    };

    const handleConfirm = () => {
        onSelect(tempSelection);
        onClose();
    };

    const renderItem = ({ item }) => {
        const label = typeof item === 'string' ? item : item.label;
        const value = typeof item === 'string' ? item : item.value;
        const isSelected = tempSelection.includes(value);

        return (
            <TouchableOpacity
                style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                onPress={() => handleToggle(item)}
                activeOpacity={0.7}
            >
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {label}
                </Text>
                {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={multiSelect ? COLORS.white : COLORS.secondary} />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{title}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>

                    {showSearch && (
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholderTextColor={COLORS.textSecondary}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    <FlatList
                        data={filteredOptions}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No options found</Text>
                            </View>
                        }
                    />

                    {multiSelect && (
                        <View style={styles.footer}>
                            <Button
                                title={`Confirm Selection (${tempSelection.length})`}
                                onPress={handleConfirm}
                                style={styles.confirmButton}
                            />
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    backdrop: {
        flex: 1,
    },
    container: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: height * 0.8,
        minHeight: height * 0.5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    closeButton: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
        height: 48,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: COLORS.text,
        height: '100%',
    },
    listContent: {
        paddingBottom: 24,
    },
    optionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    optionItemSelected: {
        backgroundColor: COLORS.background,
    },
    optionText: {
        fontSize: 16,
        color: COLORS.text,
    },
    optionTextSelected: {
        fontWeight: '600',
        color: COLORS.secondary,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: COLORS.textSecondary,
        fontSize: 15,
    },
    footer: {
        padding: 16,
        paddingBottom: 32,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    confirmButton: {
        backgroundColor: COLORS.secondary,
    },
});
