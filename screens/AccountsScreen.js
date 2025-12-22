import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    TextInput,
    Modal,
    ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
    getAllAccounts,
    setDefaultAccount,
    setCreditLimit,
    updateAccountBalance,
    calculateCreditCardUsage,
    initDB,
    getDb,
} from '../db/database';
import Card from '../components/Card';

export default function AccountsScreen() {
    const [accounts, setAccounts] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [editName, setEditName] = useState('');
    const [editLimit, setEditLimit] = useState('');
    const [editBalance, setEditBalance] = useState('');
    const [creditUsage, setCreditUsage] = useState({});

    useEffect(() => {
        loadAccounts();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadAccounts();
        }, [])
    );

    const loadAccounts = async () => {
        try {
            await initDB();
            const accountsList = await getAllAccounts();
            setAccounts(accountsList);

            // Load credit card usage for each credit card
            const usage = {};
            for (const account of accountsList) {
                if (account.account_type === 'credit_card') {
                    usage[account.id] = await calculateCreditCardUsage(account.id);
                }
            }
            setCreditUsage(usage);
        } catch (err) {
            console.error('Error loading accounts:', err);
            Alert.alert('Error', 'Failed to load accounts');
        }
    };

    const handleSetDefault = async (accountId) => {
        try {
            await setDefaultAccount(accountId);
            Alert.alert('Success', 'Default account updated');
            loadAccounts();
        } catch (err) {
            console.error('Error setting default:', err);
            Alert.alert('Error', 'Failed to set default account');
        }
    };

    const handleEdit = (account) => {
        setSelectedAccount(account);
        setEditName(account.name);
        setEditLimit(account.credit_limit?.toString() || '');
        setEditBalance(account.current_balance?.toString() || '');
        setEditModalVisible(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedAccount) return;

        try {
            const db = getDb();
            const now = new Date().toISOString();

            // Update name
            await db.runAsync(
                'UPDATE accounts SET name = ?, updated_at = ? WHERE id = ?;',
                [editName, now, selectedAccount.id]
            );

            // Update limit or balance based on account type
            if (selectedAccount.account_type === 'credit_card' && editLimit) {
                await setCreditLimit(selectedAccount.id, parseFloat(editLimit));
            } else if (selectedAccount.account_type === 'savings' && editBalance) {
                await updateAccountBalance(selectedAccount.id, parseFloat(editBalance));
            }

            Alert.alert('Success', 'Account updated');
            setEditModalVisible(false);
            loadAccounts();
        } catch (err) {
            console.error('Error updating account:', err);
            Alert.alert('Error', 'Failed to update account');
        }
    };

    const handleDelete = (account) => {
        Alert.alert(
            'Delete Account',
            `Are you sure you want to delete "${account.name}"? This will also delete all associated transactions.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const db = getDb();
                            // Delete account and related data
                            await db.runAsync('DELETE FROM income WHERE account_id = ?;', [account.id]);
                            await db.runAsync('DELETE FROM daily_spends WHERE account_id = ?;', [account.id]);
                            await db.runAsync('DELETE FROM accounts WHERE id = ?;', [account.id]);
                            Alert.alert('Success', 'Account deleted');
                            loadAccounts();
                        } catch (err) {
                            console.error('Error deleting account:', err);
                            Alert.alert('Error', 'Failed to delete account');
                        }
                    },
                },
            ]
        );
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadAccounts();
        setRefreshing(false);
    }, []);

    const renderAccount = ({ item }) => {
        const isDefault = item.is_default === 1;
        const isSavings = item.account_type === 'savings';
        const usage = creditUsage[item.id];

        return (
            <Card style={styles.accountCard}>
                <View style={styles.accountHeader}>
                    <View style={styles.accountTitleRow}>
                        <Text style={styles.accountName}>{item.name}</Text>
                        {isDefault && <Text style={styles.defaultBadge}>DEFAULT</Text>}
                    </View>
                    {item.auto_created === 1 && (
                        <Text style={styles.autoCreatedText}>Auto-created from SMS</Text>
                    )}
                </View>

                <View style={styles.accountDetails}>
                    {isSavings ? (
                        <>
                            <Text style={styles.detailLabel}>Type: Savings Account</Text>
                            {item.account_number && (
                                <Text style={styles.detailLabel}>Account: XX{item.account_number}</Text>
                            )}
                            {item.bank_name && (
                                <Text style={styles.detailLabel}>Bank: {item.bank_name}</Text>
                            )}
                            <Text style={styles.balanceText}>
                                Balance: ₹ {(item.current_balance || 0).toFixed(2)}
                            </Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.detailLabel}>Type: Credit Card</Text>
                            {item.account_number && (
                                <Text style={styles.detailLabel}>Card: XX{item.account_number}</Text>
                            )}
                            {item.bank_name && (
                                <Text style={styles.detailLabel}>Bank: {item.bank_name}</Text>
                            )}
                            <Text style={styles.detailLabel}>
                                Limit: ₹ {(item.credit_limit || 0).toFixed(2)}
                            </Text>
                            {usage && (
                                <>
                                    <Text style={styles.spentText}>
                                        Spent: ₹ {usage.spent.toFixed(2)}
                                    </Text>
                                    <Text style={styles.availableText}>
                                        Available: ₹ {usage.available.toFixed(2)}
                                    </Text>
                                </>
                            )}
                        </>
                    )}
                </View>

                <View style={styles.accountActions}>
                    {!isDefault && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.defaultButton]}
                            onPress={() => handleSetDefault(item.id)}
                        >
                            <Text style={styles.actionButtonText}>Set Default</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => handleEdit(item)}
                    >
                        <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    {!isDefault && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.deleteButton]}
                            onPress={() => handleDelete(item)}
                        >
                            <Text style={styles.actionButtonText}>Delete</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </Card>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Account Management</Text>
            <Text style={styles.subheader}>
                Manage your savings accounts and credit cards
            </Text>

            <FlatList
                data={accounts}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderAccount}
                refreshing={refreshing}
                onRefresh={onRefresh}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No accounts found</Text>
                        <Text style={styles.emptySubtext}>
                            Accounts will be auto-created when you import SMS messages
                        </Text>
                    </View>
                }
            />

            {/* Edit Modal */}
            <Modal
                visible={editModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView>
                            <Text style={styles.modalTitle}>Edit Account</Text>

                            <Text style={styles.inputLabel}>Account Name</Text>
                            <TextInput
                                style={styles.input}
                                value={editName}
                                onChangeText={setEditName}
                                placeholder="Account Name"
                            />

                            {selectedAccount?.account_type === 'credit_card' && (
                                <>
                                    <Text style={styles.inputLabel}>Credit Limit</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editLimit}
                                        onChangeText={setEditLimit}
                                        keyboardType="numeric"
                                        placeholder="Credit Limit"
                                    />
                                </>
                            )}

                            {selectedAccount?.account_type === 'savings' && (
                                <>
                                    <Text style={styles.inputLabel}>Current Balance</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editBalance}
                                        onChangeText={setEditBalance}
                                        keyboardType="numeric"
                                        placeholder="Current Balance"
                                    />
                                </>
                            )}

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={() => setEditModalVisible(false)}
                                >
                                    <Text style={styles.modalButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.saveButton]}
                                    onPress={handleSaveEdit}
                                >
                                    <Text style={styles.modalButtonText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f7f8fa',
    },
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#2d3436',
        textAlign: 'center',
    },
    subheader: {
        fontSize: 14,
        color: '#636e72',
        textAlign: 'center',
        marginBottom: 16,
    },
    accountCard: {
        marginBottom: 16,
    },
    accountHeader: {
        marginBottom: 12,
    },
    accountTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    accountName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2d3436',
        flex: 1,
    },
    defaultBadge: {
        backgroundColor: '#00b894',
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    autoCreatedText: {
        fontSize: 12,
        color: '#636e72',
        fontStyle: 'italic',
    },
    accountDetails: {
        marginBottom: 12,
    },
    detailLabel: {
        fontSize: 14,
        color: '#636e72',
        marginBottom: 4,
    },
    balanceText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#00b894',
        marginTop: 4,
    },
    spentText: {
        fontSize: 14,
        color: '#d63031',
        marginTop: 4,
    },
    availableText: {
        fontSize: 14,
        color: '#0984e3',
        marginTop: 2,
    },
    accountActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
    },
    actionButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        marginLeft: 8,
    },
    defaultButton: {
        backgroundColor: '#0984e3',
    },
    editButton: {
        backgroundColor: '#fdcb6e',
    },
    deleteButton: {
        backgroundColor: '#d63031',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 18,
        color: '#636e72',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#b2bec3',
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        width: '90%',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2d3436',
        marginBottom: 16,
        textAlign: 'center',
    },
    inputLabel: {
        fontSize: 14,
        color: '#636e72',
        marginBottom: 6,
        marginTop: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#b2bec3',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    cancelButton: {
        backgroundColor: '#636e72',
    },
    saveButton: {
        backgroundColor: '#00b894',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
