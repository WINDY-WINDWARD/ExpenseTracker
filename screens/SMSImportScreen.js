import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSMSReader } from '../hooks/useSMSReader';
import { parseSMS } from '../utils/smsParser';
import { initDB, findOrCreateAccount, getDefaultAccount } from '../db/database';

export default function SMSImportScreen() {
  const navigation = useNavigation();
  const { hasPermission, isLoading, error, requestPermissions, readSMS } = useSMSReader();
  const [transactions, setTransactions] = useState([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      let smsMessages = [];

      // Only try to read SMS if permissions are granted
      if (hasPermission) {
        smsMessages = await readSMS({ maxCount: 100, daysBack: 60 });
      } else {
        // No permission just return empty
        setTransactions([]);
        return;
      }

      // Parse SMS messages
      const parsed = smsMessages
        .map((sms) => {
          const transaction = parseSMS(sms.body);
          if (transaction) {
            return {
              ...transaction,
              smsId: sms._id,
              smsAddress: sms.address,
              smsDate: sms.date,
            };
          }
          return null;
        })
        .filter((t) => t !== null)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      setTransactions(parsed);
    } catch (err) {
      console.error('Error loading transactions:', err);
      Alert.alert('Error', 'Failed to load SMS transactions. Please contact Dev for support.');
    }
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermissions();
    if (granted) {
      loadTransactions();
    }
  };

  const handleImport = async (transaction) => {
    setImporting(true);
    try {
      const db = await initDB();

      // Check if SMS already imported
      const existing = await db.getAllAsync(
        'SELECT id FROM imported_sms WHERE sms_id = ?;',
        [transaction.smsId]
      );

      if (existing && existing.length > 0) {
        Alert.alert('Already Imported', 'This transaction has already been imported.');
        setImporting(false);
        return;
      }

      // Determine account
      let accountId;
      if (transaction.accountInfo) {
        // Auto-create or find account
        accountId = await findOrCreateAccount(
          transaction.accountInfo.accountNumber,
          transaction.accountInfo.bankName,
          transaction.accountInfo.accountType
        );
      } else {
        // Use default account
        const defaultAccount = await getDefaultAccount(
          transaction.type === 'income' ? 'savings' : 'savings'
        );
        accountId = defaultAccount?.id;

        if (!accountId) {
          Alert.alert('Error', 'No default account found. Please create an account first.');
          setImporting(false);
          return;
        }
      }

      let result;
      let incomeId = null;
      let dailySpendId = null;

      if (transaction.type === 'income') {
        // Insert into income table
        result = await db.runAsync(
          'INSERT INTO income (source, amount, date, account_id) VALUES (?, ?, ?, ?);',
          [
            transaction.merchant,
            transaction.amount,
            transaction.date.split('T')[0],
            accountId
          ]
        );
        incomeId = result.lastInsertRowId;
      } else {
        // Insert into daily_spends table
        result = await db.runAsync(
          'INSERT INTO daily_spends (date, category, amount, note, account_id) VALUES (?, ?, ?, ?, ?);',
          [
            transaction.date.split('T')[0],
            transaction.category,
            transaction.amount,
            `${transaction.merchant} (from SMS)`,
            accountId
          ]
        );
        dailySpendId = result.lastInsertRowId;
      }

      // Track imported SMS
      await db.runAsync(
        'INSERT INTO imported_sms (sms_id, imported_at, account_id, income_id, daily_spend_id) VALUES (?, ?, ?, ?, ?);',
        [transaction.smsId, new Date().toISOString(), accountId, incomeId, dailySpendId]
      );

      Alert.alert('Success', `${transaction.type === 'income' ? 'Income' : 'Expense'} imported successfully!`);

      // Remove from list
      setTransactions((prev) => prev.filter((t) => t.smsId !== transaction.smsId));
    } catch (err) {
      console.error('Error importing transaction:', err);
      Alert.alert('Error', `Failed to import transaction: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleImportAll = async () => {
    setImporting(true);
    try {
      const db = await initDB();

      let imported = 0;
      let skipped = 0;
      let failed = 0;

      for (const transaction of transactions) {
        try {
          // Check if SMS already imported
          const existing = await db.getAllAsync(
            'SELECT id FROM imported_sms WHERE sms_id = ?;',
            [transaction.smsId]
          );

          if (existing && existing.length > 0) {
            skipped++;
            continue;
          }

          // Determine account
          let accountId;
          if (transaction.accountInfo) {
            // Auto-create or find account
            accountId = await findOrCreateAccount(
              transaction.accountInfo.accountNumber,
              transaction.accountInfo.bankName,
              transaction.accountInfo.accountType
            );
          } else {
            // Use default account
            const defaultAccount = await getDefaultAccount('savings');
            accountId = defaultAccount?.id;

            if (!accountId) {
              console.warn('No default account found, skipping transaction');
              failed++;
              continue;
            }
          }

          let result;
          let incomeId = null;
          let dailySpendId = null;

          if (transaction.type === 'income') {
            // Insert into income table
            result = await db.runAsync(
              'INSERT INTO income (source, amount, date, account_id) VALUES (?, ?, ?, ?);',
              [
                transaction.merchant,
                transaction.amount,
                transaction.date.split('T')[0],
                accountId
              ]
            );
            incomeId = result.lastInsertRowId;
          } else {
            // Insert into daily_spends table
            result = await db.runAsync(
              'INSERT INTO daily_spends (date, category, amount, note, account_id) VALUES (?, ?, ?, ?, ?);',
              [
                transaction.date.split('T')[0],
                transaction.category,
                transaction.amount,
                `${transaction.merchant} (from SMS)`,
                accountId
              ]
            );
            dailySpendId = result.lastInsertRowId;
          }

          // Track imported SMS
          await db.runAsync(
            'INSERT INTO imported_sms (sms_id, imported_at, account_id, income_id, daily_spend_id) VALUES (?, ?, ?, ?, ?);',
            [transaction.smsId, new Date().toISOString(), accountId, incomeId, dailySpendId]
          );

          imported++;
        } catch (err) {
          console.error('Error importing transaction:', transaction, err);
          failed++;
        }
      }

      // Show summary
      const message = `Imported: ${imported}\nSkipped (already imported): ${skipped}${failed > 0 ? `\nFailed: ${failed}` : ''}`;
      Alert.alert('Import Complete', message);

      // Reload transactions to refresh the list
      await loadTransactions();
    } catch (err) {
      console.error('Error in bulk import:', err);
      Alert.alert('Error', 'Failed to complete bulk import');
    } finally {
      setImporting(false);
    }
  };

  const renderTransaction = ({ item }) => {
    const date = new Date(item.date);
    const formattedDate = date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <Text style={styles.merchantText}>{item.merchant}</Text>
          <Text style={styles.amountText}>₹ {item.amount.toFixed(2)}</Text>
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.categoryText}>{item.category}</Text>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>
        <TouchableOpacity
          style={styles.importButton}
          onPress={() => handleImport(item)}
          disabled={importing}
        >
          <Text style={styles.importButtonText}>Import</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>SMS Import</Text>
        <View style={styles.permissionCard}>
          {Platform.OS === 'ios' ? (
            <>
              <Text style={styles.permissionTitle}>Not Supported on iOS</Text>
              <Text style={styles.permissionText}>
                SMS reading is not supported on iOS due to platform restrictions. This feature is only available on Android devices.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.permissionTitle}>Permission Required</Text>
              <Text style={styles.permissionText}>
                This feature requires SMS permissions to read transaction messages from your bank. If the feature is not working after granting permissions, please contact admin for support.
              </Text>
              <TouchableOpacity style={styles.permissionButton} onPress={handleRequestPermission}>
                <Text style={styles.permissionButtonText}>Grant Permission</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>SMS Import</Text>
        {transactions.length > 0 && !importing && (
          <TouchableOpacity style={styles.importAllButton} onPress={handleImportAll}>
            <Text style={styles.importAllButtonText}>Import All</Text>
          </TouchableOpacity>
        )}
      </View>
      {isLoading ? (
        <ActivityIndicator size="large" color="#0984e3" style={styles.loader} />
      ) : transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No transactions found</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadTransactions}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.smsId}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f8fa',
    padding: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2d3436',
    letterSpacing: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  importAllButton: {
    backgroundColor: '#4caf50',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  importAllButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  permissionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginTop: 40,
    shadowColor: '#636e72',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0984e3',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#636e72',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#0984e3',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    color: '#636e72',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#0984e3',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 20,
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#636e72',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  merchantText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3436',
    flex: 1,
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f44336',
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 14,
    color: '#636e72',
  },
  dateText: {
    fontSize: 14,
    color: '#636e72',
  },
  importButton: {
    backgroundColor: '#4caf50',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-end',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
