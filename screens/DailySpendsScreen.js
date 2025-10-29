import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert } from 'react-native';
import { initDB } from '../db/database';

export default function DailySpendsScreen() {
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [spendsList, setSpendsList] = useState([]);
  const [db, setDb] = useState(null);

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
      <Text style={styles.header}>Log Daily Spend</Text>
      <TextInput placeholder="Category" value={category} onChangeText={setCategory} style={styles.input} />
      <TextInput placeholder="Note" value={note} onChangeText={setNote} style={styles.input} />
      <TextInput placeholder="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" style={styles.input} />
      <TextInput placeholder="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} style={styles.input} />
      <Button title="Add Spend" onPress={addSpend} />
      <Text style={styles.listHeader}>Spending History</Text>
      <FlatList
        data={Object.keys(groupedSpends)}
        keyExtractor={date => date}
        renderItem={({ item: date }) => (
          <View style={styles.dateGroup}>
            <Text style={styles.dateHeader}>{date}</Text>
            {groupedSpends[date].map(spend => (
              <View key={spend.id} style={styles.listItem}>
                <Text>{spend.category}: ${spend.amount} ({spend.note})</Text>
              </View>
            ))}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, marginBottom: 8 },
  listHeader: { fontSize: 18, marginTop: 16, marginBottom: 8 },
  dateGroup: { marginBottom: 12 },
  dateHeader: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  listItem: { padding: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
});