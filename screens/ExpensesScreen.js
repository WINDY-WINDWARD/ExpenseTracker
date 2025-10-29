import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert } from 'react-native';
import { initDB } from '../db/database';

export default function ExpensesScreen() {
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('Monthly');
  const [monthsLeft, setMonthsLeft] = useState('');
  const [expensesList, setExpensesList] = useState([]);
  const [db, setDb] = useState(null);

  useEffect(() => {
    const loadDb = async () => {
      const database = await initDB();
      setDb(database);
      fetchExpenses(database);
    }
    loadDb();
  }, []);

  const fetchExpenses = async (database) => {
    const result = await (database || db).getAllAsync('SELECT * FROM expenses;');
    setExpensesList(result);
  };

  const addExpense = async () => {
    if (!category || !amount || !monthsLeft || isNaN(parseFloat(amount)) || isNaN(parseInt(monthsLeft))) {
      Alert.alert('Validation Error', 'Please enter valid category, amount, and months left.');
      return;
    }
    await db.runAsync(
      'INSERT INTO expenses (category, amount, frequency, months_left) VALUES (?, ?, ?, ?);',
      [category, parseFloat(amount), frequency, parseInt(monthsLeft)]
    );
    setCategory('');
    setAmount('');
    setFrequency('Monthly');
    setMonthsLeft('');
    fetchExpenses(db);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Add Recurring Expense</Text>
      <TextInput placeholder="Category" value={category} onChangeText={setCategory} style={styles.input} />
      <TextInput placeholder="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" style={styles.input} />
      <TextInput placeholder="Months Left" value={monthsLeft} onChangeText={setMonthsLeft} keyboardType="numeric" style={styles.input} />
      <Button title="Add Expense" onPress={addExpense} />
      <Text style={styles.listHeader}>Recurring Expenses</Text>
      <FlatList
        data={expensesList}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text>{item.category} - ${item.amount} ({item.frequency}), {item.months_left} months left</Text>
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