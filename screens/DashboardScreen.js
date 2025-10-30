
import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, Button, TouchableOpacity } from 'react-native';
import { RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { initDB } from '../db/database';
import { Svg, G, Text as SvgText } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import PieChart from '../components/PieChart';
import LineChart from '../components/LineChart';
import { updateRecurringExpenses, calculatePortfolioValue } from '../db/updateData';



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
  const [months, setMonths] = useState([]);
  const [monthlyIncome, setMonthlyIncome] = useState([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [monthlySpends, setMonthlySpends] = useState([]);
  const [portfolioBalance, setPortfolioBalance] = useState(0);
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

  // Return array of YYYY-MM strings between start and end inclusive
  const getMonthsBetween = (startStr, endStr) => {
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    const months = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      months.push(`${y}-${m}`);
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
  };

  const getLastNMonths = (n = 5) => {
    const out = [];
    const today = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return out;
  };

  const monthLabel = (ym) => {
    // ym = YYYY-MM
    const [y, m] = ym.split('-');
    const date = new Date(Number(y), Number(m) - 1, 1);
    return date.toLocaleString(undefined, { month: 'short' });
  };

  // Load summary data for selected date range and monthly aggregates
  const loadData = useCallback(async () => {
    const db = await initDB();

    // Determine months to display: if user filter set, use months in range, otherwise last 5 months
    let monthsRange = [];
    if (startDate && endDate) {
      monthsRange = getMonthsBetween(startDate, endDate);
    } else {
      monthsRange = getLastNMonths(5);
    }

    // When the user hasn't provided an explicit date filter, we want the SQL queries
    // to span the full months shown in the chart (not just the last 30 days). Compute
    // filterStart/filterEnd from the monthsRange. If user set dates, use them directly.
    let filterStart; let filterEnd;
    if (startDate && endDate) {
      filterStart = startDate;
      filterEnd = endDate;
    } else {
      // monthsRange entries are YYYY-MM. Use first month's 1st day and last month's last day.
      const first = monthsRange[0];
      const last = monthsRange[monthsRange.length - 1];
      const [fy, fm] = first.split('-');
      const [ly, lm] = last.split('-');
      const lastDay = new Date(Number(ly), Number(lm), 0).getDate();
      filterStart = `${fy}-${fm}-01`;
      filterEnd = `${ly}-${lm}-${String(lastDay).padStart(2, '0')}`;
    }

    // Total Income
    const incomeResult = await db.getFirstAsync(
      'SELECT SUM(amount) as total FROM income WHERE date BETWEEN ? AND ?;',
      [filterStart, filterEnd]
    );
    setIncome(Number(parseFloat(incomeResult.total)) || 0);

    // Recurring expenses (sum of recurring monthly amounts)
    const expensesResult = await db.getFirstAsync(
      'SELECT SUM(amount) as total FROM expenses;'
    );
    const recurringTotal = Number(parseFloat(expensesResult.total)) || 0;
    setExpenses(recurringTotal);

    // Total daily spends
    const dailySpendsResult = await db.getFirstAsync(
      'SELECT SUM(amount) as total FROM daily_spends WHERE date BETWEEN ? AND ?;',
      [filterStart, filterEnd]
    );
    setDailySpends(Number(parseFloat(dailySpendsResult.total)) || 0);

    setMonths(monthsRange.map(m => monthLabel(m)));

    // Query income grouped by YYYY-MM
    const incomeRows = await db.getAllAsync(
      "SELECT strftime('%Y-%m', date) as ym, SUM(amount) as total FROM income WHERE date BETWEEN ? AND ? GROUP BY ym ORDER BY ym;",
      [filterStart, filterEnd]
    );
    const incomeMap = {};
    (incomeRows || []).forEach(r => { incomeMap[r.ym] = Number(r.total) || 0; });

    // Query daily_spends grouped by YYYY-MM
    const spendsRows = await db.getAllAsync(
      "SELECT strftime('%Y-%m', date) as ym, SUM(amount) as total FROM daily_spends WHERE date BETWEEN ? AND ? GROUP BY ym ORDER BY ym;",
      [filterStart, filterEnd]
    );
    const spendsMap = {};
    (spendsRows || []).forEach(r => { spendsMap[r.ym] = Number(r.total) || 0; });

    // For recurring expenses we don't have per-month dates, so use recurringTotal as monthly amount
    const incomeSeries = [];
    const spendsSeries = [];
    const expensesSeries = [];
    monthsRange.forEach(ym => {
      incomeSeries.push(incomeMap[ym] || 0);
      spendsSeries.push(spendsMap[ym] || 0);
      expensesSeries.push(recurringTotal || 0);
    });

    setMonthlyIncome(incomeSeries);
    setMonthlySpends(spendsSeries);
    setMonthlyExpenses(expensesSeries);

  }, [startDate, endDate]);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      await loadData();
      await calculatePortfolioValue();
      if (isMounted) {
        setPortfolioBalance(await fetchPortfolioBalance());
      }
    };
    run();
    return () => { isMounted = false; };
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const run = async () => {
        await loadData();
        await calculatePortfolioValue();
        if (isActive) {
          setPortfolioBalance(await fetchPortfolioBalance());
        }
      };
      run();
      return () => { isActive = false; };
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    await updateRecurringExpenses();
    await calculatePortfolioValue();
    setPortfolioBalance(await fetchPortfolioBalance());
    setRefreshing(false);
  }, [loadData]);

  const handleFilter = () => {
    if (startDate && endDate) {
      loadData();
      setShowFilter(false);
    }
  };

  const handleReset = async () => {
    setStartDate(null);
    setEndDate(null);
    loadData();
    setShowFilter(false);
  };

  const fetchPortfolioBalance = async () => {
    const db = await initDB();
    const result = await db.getFirstAsync("SELECT balance FROM portfolio WHERE id = ?;", [1]);
    return Number(parseFloat(result?.balance)) || 0;
  };

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
        <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Remaining Balance</Text><Text style={[styles.summaryValue, { color: portfolioBalance >= 0 ? '#4caf50' : '#f44336' }]}>{portfolioBalance >= 0 ? '₹ ' : '-₹ '}{Math.abs(portfolioBalance).toFixed(2)}</Text></View>
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
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Monthly Trends</Text>
        <LineChart
          months={months}
          height={260}
          width={340}
          series={[
            { label: 'Income', color: '#4caf4f8e', values: monthlyIncome },
            { label: 'Expenses', color: '#f443368e', values: monthlyExpenses },
            { label: 'Spends', color: '#ffb3007c', values: monthlySpends },
          ]}
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
