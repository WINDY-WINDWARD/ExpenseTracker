import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Card from '../components/Card';
// navigation is passed as a prop from the navigator; route used for params
import { initDB } from '../db/database';

export default function AddSpendScreen({ navigation, route }) {
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [db, setDb] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [editingId, setEditingId] = useState(null);

  React.useEffect(() => {
    const loadDb = async () => {
      const database = await initDB();
      setDb(database);
    };
    loadDb();
  }, []);

  // Prefill form when navigated with a spend to edit
  useEffect(() => {
    const spend = route?.params?.spend;
    if (spend) {
      setCategory(spend.category?.toString() || '');
      setNote(spend.note?.toString() || '');
      setAmount(spend.amount?.toString() || '');
      setDate(spend.date?.toString() || '');
      setIsEdit(true);
      setEditingId(spend.id);
    } else {
      setIsEdit(false);
      setEditingId(null);
    }
  }, [route]);

  const onChangeDate = (event, selectedDate) => {
    if (event.type === 'set' && selectedDate) {
      const formatted = selectedDate.toISOString().split('T')[0];
      setDate(formatted);
    }
    setShowDatePicker(false);
  };

  const addSpend = async () => {
    if (!category || !amount || !date || isNaN(parseFloat(amount))) {
      Alert.alert('Validation Error', 'Please enter valid category, amount, and date.');
      return;
    }
    if (!db) {
      Alert.alert('Database not ready', 'Please try again in a moment.');
      return;
    }

    if (isEdit && editingId != null) {
      await db.runAsync(
        'UPDATE daily_spends SET category = ?, note = ?, amount = ?, date = ? WHERE id = ?;',
        [category, note, parseFloat(amount), date, editingId]
      );
    } else {
      await db.runAsync(
        'INSERT INTO daily_spends (category, note, amount, date) VALUES (?, ?, ?, ?);',
        [category, note, parseFloat(amount), date]
      );
    }
    setCategory('');
    setNote('');
    setAmount('');
    setDate('');
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Card>
  <Text style={styles.header}>{isEdit ? 'Edit Spend' : 'Log Spend'}</Text>
        <TextInput placeholder="Category" value={category} onChangeText={setCategory} style={styles.input} placeholderTextColor="rgba(7, 8, 8, 1)" />
        <TextInput placeholder="Note" value={note} onChangeText={setNote} style={styles.input} placeholderTextColor="rgba(7, 8, 8, 1)" />
        <TextInput placeholder="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" style={styles.input} placeholderTextColor="rgba(7, 8, 8, 1)" />
        <Text style={styles.inputLabel}>Date</Text>
        <View style={styles.roundedButton}>
          <Button
            title={date ? `Select Date (${date})` : 'Select Date'}
            onPress={() => setShowDatePicker(true)}
          />
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={date ? new Date(date) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
            onChange={onChangeDate}
          />
        )}
        <View style={styles.roundedButton}>
          <Button title={isEdit ? 'Update Spend' : 'Add Spend'} onPress={addSpend} />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f7f8fa',
    justifyContent: 'center'
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2d3436',
    textAlign: 'center',
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#b2bec3',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    fontSize: 16,
    shadowColor: '#636e72',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  roundedButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  inputLabel: {
    marginBottom: 6,
    fontSize: 16,
    color: '#636e72',
    fontWeight: '500',
  },
});
