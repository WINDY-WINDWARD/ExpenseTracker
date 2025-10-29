
import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, Button } from 'react-native';
import { RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { initDB } from '../db/database';
import { Svg, G, Text as SvgText } from 'react-native-svg';
import PieChart from '../components/PieChart';
import { updateRecurringExpenses } from '../db/updateData';


export default function DashboardScreen() {
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [dailySpends, setDailySpends] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const loadData = useCallback(async () => {
    const db = await initDB();
    const incomeResult = await db.getFirstAsync('SELECT SUM(amount) as total FROM income;');
    setIncome(Number(parseFloat(incomeResult.total)) || 0);
    const expensesResult = await db.getFirstAsync('SELECT SUM(amount) as total FROM expenses;');
    setExpenses(Number(parseFloat(expensesResult.total)) || 0);
    const dailySpendsResult = await db.getFirstAsync('SELECT SUM(amount) as total FROM daily_spends;');
    setDailySpends(Number(parseFloat(dailySpendsResult.total)) || 0);
  }, []);


  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    await updateRecurringExpenses();
    setRefreshing(false);
  }, [loadData]);

  const remainingBudget = income - expenses - dailySpends;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.header}>Dashboard</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Summary</Text>
        <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Total Income</Text><Text style={styles.summaryValue}>₹ {income.toFixed(2)}</Text></View>
        <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Recurring Expenses</Text><Text style={styles.summaryValue}>₹ {expenses.toFixed(2)}</Text></View>
        <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Daily Spending</Text><Text style={styles.summaryValue}>₹ {dailySpends.toFixed(2)}</Text></View>
        <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Remaining Budget</Text><Text style={[styles.summaryValue, { color: remainingBudget >= 0 ? '#4caf50' : '#f44336' }]}>{remainingBudget >= 0 ? '₹ ' : '-₹ '}{Math.abs(remainingBudget).toFixed(2)}</Text></View>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Overview Chart</Text>
        <PieChart
          data={[
            { label: 'Income', value: income, color: '#4caf50' },
            { label: 'Expenses', value: expenses, color: '#f44336' },
            { label: 'Spends', value: dailySpends, color: '#2196f3' },
          ]}
          height={250}
        />
      </View>
    </ScrollView>
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
    marginBottom: 18,
    color: '#2d3436',
    textAlign: 'center',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#636e72',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0984e3',
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#636e72',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3436',
  },
  buttonContainer: {
    marginTop: 10,
    marginBottom: 30,
    alignItems: 'center',
  },
});
