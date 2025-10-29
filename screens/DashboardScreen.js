import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { initDB } from '../db/database';
import { Svg, G, Text as SvgText } from 'react-native-svg';
import PieChart from '../components/PieChart';

export default function DashboardScreen() {
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [dailySpends, setDailySpends] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      const db = await initDB();
      const incomeResult = await db.getFirstAsync('SELECT SUM(amount) as total FROM income;');
      setIncome(Number(parseFloat(incomeResult.total)) || 0);
      const expensesResult = await db.getFirstAsync('SELECT SUM(amount) as total FROM expenses;');
      setExpenses(Number(parseFloat(expensesResult.total)) || 0);
      const dailySpendsResult = await db.getFirstAsync('SELECT SUM(amount) as total FROM daily_spends;');
      setDailySpends(Number(parseFloat(dailySpendsResult.total)) || 0);
    };
    loadData();
  }, []);

  const remainingBudget = income - expenses - dailySpends;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Dashboard</Text>
      <View style={styles.summaryBox}>
        <Text>Total Income: ${income.toFixed(2)}</Text>
        <Text>Total Recurring Expenses: ${expenses.toFixed(2)}</Text>
        <Text>Daily Spending Total: ${dailySpends.toFixed(2)}</Text>
        <Text>Remaining Budget: ${remainingBudget.toFixed(2)}</Text>
      </View>
      <PieChart
        data={[
          { label: 'Income', value: income, color: '#4caf50' },
          { label: 'Expenses', value: expenses, color: '#f44336' },
          { label: 'Spends', value: dailySpends, color: '#2196f3' },
        ]}
        height={250}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  summaryBox: { marginBottom: 24 },
});
