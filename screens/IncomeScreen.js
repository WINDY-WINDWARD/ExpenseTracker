import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert } from 'react-native';
import { initDB } from '../db/database';

export default function IncomeScreen() {
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [incomeList, setIncomeList] = useState([]);
  const [db, setDb] = useState(null);

  useEffect(() => {
    const loadDb = async () => {
      const database = await initDB();
      setDb(database);
      fetchIncome(database);
    }
    loadDb();
  }, []);

  const fetchIncome = async (database) => {
    const result = await (database || db).getAllAsync('SELECT * FROM income;');
    setIncomeList(result);
  };

  const addIncome = async () => {
    if (!source || !amount || !date || isNaN(parseFloat(amount))) {
      Alert.alert('Validation Error', 'Please enter valid source, amount, and date.');
      return;
    }
    await db.runAsync(
      'INSERT INTO income (source, amount, date) VALUES (?, ?, ?);',
      [source, parseFloat(amount), date]
    );
    setSource('');
    setAmount('');
    setDate('');
    fetchIncome(db);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Add Income</Text>
      <TextInput placeholder="Source" value={source} onChangeText={setSource} style={styles.input} />
      <TextInput placeholder="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" style={styles.input} />
      <TextInput placeholder="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} style={styles.input} />
      <Button title="Add Income" onPress={addIncome} />
      <Text style={styles.listHeader}>Income History</Text>
      <FlatList
        data={incomeList}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text>{item.source} - ${item.amount} on {item.date}</Text>
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
  listItem: { padding: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
});