import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { initDB, getDb, addAccount } from '../db/database';

// Screen to manually add a new account (savings or credit card).
// - `account_type` can be 'savings' (default) or 'credit_card'
// - `is_default` is set to 0 on creation
// - `auto_created` is set to 0 on creation (user-created)
export default function AddAccountScreen({ navigation }) {
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState('savings');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');

  // Save the new account to DB
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Please provide an account name');
      return;
    }

    try {
      await initDB();

      const payload = {
        name: name.trim(),
        account_number: accountNumber ? accountNumber.trim() : null,
        account_type: accountType,
        bank_name: bankName ? bankName.trim() : null,
        current_balance: accountType === 'savings' ? parseFloat(currentBalance || 0) : 0,
        credit_limit: accountType === 'credit_card' ? parseFloat(creditLimit || 0) : 0,
        is_default: 0, // user-created accounts are not default by default
        auto_created: 0, // explicitly mark as user-created
      };

      const newId = await addAccount(payload);
      Alert.alert('Success', 'Account created');
      // Go back to accounts list and trigger refresh via focus effect
      navigation.goBack();
    } catch (e) {
      console.error('AddAccount save error', e);
      Alert.alert('Error', 'Failed to create account');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Add Account</Text>

        <Text style={styles.label}>Account Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. My HDFC Savings"
        />

        <Text style={styles.label}>Account Type</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={accountType}
            onValueChange={(val) => setAccountType(val)}
          >
            <Picker.Item label="Savings" value="savings" />
            <Picker.Item label="Credit Card" value="credit_card" />
          </Picker>
        </View>

        <Text style={styles.label}>Last 4 digits (optional)</Text>
        <TextInput
          style={styles.input}
          value={accountNumber}
          onChangeText={setAccountNumber}
          placeholder="e.g. 1263"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Bank / Issuer (optional)</Text>
        <TextInput
          style={styles.input}
          value={bankName}
          onChangeText={setBankName}
          placeholder="e.g. HDFC Bank"
        />

        {accountType === 'savings' && (
          <>
            <Text style={styles.label}>Current Balance (optional)</Text>
            <TextInput
              style={styles.input}
              value={currentBalance}
              onChangeText={setCurrentBalance}
              placeholder="0.00"
              keyboardType="numeric"
            />
          </>
        )}

        {accountType === 'credit_card' && (
          <>
            <Text style={styles.label}>Credit Limit (optional)</Text>
            <TextInput
              style={styles.input}
              value={creditLimit}
              onChangeText={setCreditLimit}
              placeholder="0.00"
              keyboardType="numeric"
            />
          </>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.button, styles.cancel]} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.save]} onPress={handleSave}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  label: { fontSize: 14, color: '#636e72', marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#b2bec3',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#b2bec3',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 6 },
  cancel: { backgroundColor: '#636e72' },
  save: { backgroundColor: '#00b894' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
