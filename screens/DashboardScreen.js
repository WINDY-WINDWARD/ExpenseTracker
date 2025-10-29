
import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, Button, TouchableOpacity } from 'react-native';
import { RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { initDB } from '../db/database';
import { Svg, G, Text as SvgText } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import PieChart from '../components/PieChart';
import { updateRecurringExpenses } from '../db/updateData';



export default function DashboardScreen() {
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [dailySpends, setDailySpends] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const navigation = useNavigation();

  // Helper to format date as yyyy-mm-dd
  const formatDate = (d) => {
    if (!d) return null;
    if (typeof d === 'string') return d;
    return d.toISOString().slice(0, 10);
  };

  // By default, last 30 days
  const getDefaultDates = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29);
    return {
      start: formatDate(thirtyDaysAgo),
      end: formatDate(today)
    };
  };

  // Load summary data for selected date range
  const loadData = useCallback(async () => {
    const db = await initDB();
    let filterStart = startDate || getDefaultDates().start;
    let filterEnd = endDate || getDefaultDates().end;

    // Income
    const incomeResult = await db.getFirstAsync(
      'SELECT SUM(amount) as total FROM income WHERE date BETWEEN ? AND ?;',
      [filterStart, filterEnd]
    );
    setIncome(Number(parseFloat(incomeResult.total)) || 0);

    // Expenses (recurring)
    const expensesResult = await db.getFirstAsync(
      'SELECT SUM(amount) as total FROM expenses;',
    );
    setExpenses(Number(parseFloat(expensesResult.total)) || 0);

    // Daily spends
    const dailySpendsResult = await db.getFirstAsync(
      'SELECT SUM(amount) as total FROM daily_spends WHERE date BETWEEN ? AND ?;',
      [filterStart, filterEnd]
    );
    setDailySpends(Number(parseFloat(dailySpendsResult.total)) || 0);
  }, [startDate, endDate]);

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

  const handleFilter = () => {
    if (startDate && endDate) {
      loadData();
      setShowFilter(false);
    }
  };

  const handleReset = () => {
    setStartDate(null);
    setEndDate(null);
    loadData();
    setShowFilter(false);
  };

  const remainingBudget = income - expenses - dailySpends;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.header}>Dashboard</Text>
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilter((v) => !v)}
        >
          <Text style={styles.filterButtonText}>Filter by Date</Text>
        </TouchableOpacity>
      </View>
      {showFilter && (
        <View style={styles.filterPanel}>
          <View style={styles.datePickerRow}>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={styles.datePickerText}>
                {startDate ? `Start: ${startDate}` : 'Select Start Date'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={styles.datePickerText}>
                {endDate ? `End: ${endDate}` : 'Select End Date'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.filterActionRow}>
            <Button
              title="Apply Filter"
              onPress={handleFilter}
              disabled={!startDate || !endDate}
            />
            <Button
              title="Reset"
              color="#636e72"
              onPress={handleReset}
            />
          </View>
          {showStartPicker && (
            <DateTimePicker
              value={startDate ? new Date(startDate) : new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowStartPicker(false);
                if (selectedDate) {
                  setStartDate(formatDate(selectedDate));
                }
              }}
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              value={endDate ? new Date(endDate) : new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowEndPicker(false);
                if (selectedDate) {
                  setEndDate(formatDate(selectedDate));
                }
              }}
            />
          )}
        </View>
      )}
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
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  filterButton: {
    backgroundColor: '#0984e3',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  filterButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  filterPanel: {
    backgroundColor: '#dfe6e9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  datePickerButton: {
    backgroundColor: '#b2bec3',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginHorizontal: 4,
  },
  datePickerText: {
    color: '#2d3436',
    fontSize: 15,
  },
  filterActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
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
