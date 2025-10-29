import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { initDB } from '../db/database';

export default function DailySpendsScreen() {
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [spendsList, setSpendsList] = useState([]);
  const [db, setDb] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Date picker handler
  const onChangeDate = (event, selectedDate) => {
    if (event.type === "set" && selectedDate) {
      // Format as YYYY-MM-DD
      const formatted = selectedDate.toISOString().split("T")[0];
      setDate(formatted);
    }
    setShowDatePicker(false);
  };

  // Delete spend handler
  const deleteSpend = async (id) => {
    if (!db) return;
    await db.runAsync('DELETE FROM daily_spends WHERE id = ?;', [id]);
    fetchSpends(db);
  };

  useEffect(() => {
    const loadDb = async () => {
      const database = await initDB();
      setDb(database);
      fetchSpends(database);
    }
    loadDb();
  }, []);

  const fetchSpends = async (database) => {
    const result = await (database || db).getAllAsync('SELECT * FROM daily_spends ORDER BY date DESC;');
    setSpendsList(result);
  };

  const addSpend = async () => {
    if (!category || !amount || !date || isNaN(parseFloat(amount))) {
      Alert.alert('Validation Error', 'Please enter valid category, amount, and date.');
      return;
    }
    await db.runAsync(
      'INSERT INTO daily_spends (category, note, amount, date) VALUES (?, ?, ?, ?);',
      [category, note, parseFloat(amount), date]
    );
    setCategory('');
    setNote('');
    setAmount('');
    setDate('');
    fetchSpends(db);
  };

  // Group spends by date
  const groupedSpends = spendsList.reduce((groups, item) => {
    if (!groups[item.date]) groups[item.date] = [];
    groups[item.date].push(item);
    return groups;
  }, {});

  return (
    <View style={styles.container}>
      {/* Log Spend Card */}
      <View style={styles.card}>
        <Text style={styles.header}>Log Spend</Text>
        <TextInput placeholder="Category" value={category} onChangeText={setCategory} style={styles.input} />
        <TextInput placeholder="Note" value={note} onChangeText={setNote} style={styles.input} />
        <TextInput placeholder="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" style={styles.input} />
        <Text style={styles.inputLabel}>Date</Text>
        <Button
          title={date ? `Select Date (${date})` : "Select Date"}
          onPress={() => setShowDatePicker(true)}
        />
        {showDatePicker && (
          <DateTimePicker
            value={date ? new Date(date) : new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "calendar"}
            onChange={onChangeDate}
          />
        )}
        <View style={styles.roundedButton}>
          <Button title="Add Spend" onPress={addSpend} />
        </View>
      </View>
      {/* Spending History Card */}
      <View style={styles.card}>
        <Text style={styles.listHeader}>Spending History</Text>
        <FlatList
          data={Object.keys(groupedSpends)}
          keyExtractor={date => date}
          renderItem={({ item: date }) => (
            <View style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{date}</Text>
              {groupedSpends[date].map(spend => (
                <View key={spend.id} style={styles.listItem}>
                  <Text style={styles.spendText}>{spend.category}: ₹ {spend.amount} {spend.note ? `(${spend.note})` : ''}</Text>
                  <View style={{ marginLeft: 'auto' }}>
                    <Button title="Delete" color="#d63031" onPress={() => deleteSpend(spend.id)} />
                  </View>
                </View>
              ))}
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputLabel: {
    marginBottom: 6,
    fontSize: 16,
    color: '#636e72',
    fontWeight: '500',
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f7f8fa',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#636e72',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
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
  listHeader: {
    fontSize: 18,
    marginBottom: 12,
    color: '#0984e3',
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  dateGroup: {
    marginBottom: 16,
    backgroundColor: '#f1f2f6',
    borderRadius: 10,
    padding: 10,
  },
  dateHeader: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 6,
    color: '#636e72',
  },
  listItem: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#dfe6e9',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#636e72',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  spendText: {
    fontSize: 15,
    color: '#2d3436',
  },
});