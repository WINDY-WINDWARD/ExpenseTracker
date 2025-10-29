import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Button, FlatList, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { initDB } from "../db/database";
import Card from "../components/Card";

export default function ExpensesScreen() {
  const navigation = useNavigation();
  const [expensesList, setExpensesList] = useState([]);
  const [db, setDb] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadDb = async () => {
      const database = await initDB();
      setDb(database);
      fetchExpenses(database);
    };
    loadDb();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchExpenses(db).finally(() => setRefreshing(false));
  }, [db]);

  const fetchExpenses = async (database) => {
    const result = await (database || db).getAllAsync(
      "SELECT * FROM expenses;"
    );
    setExpensesList(result);
  };

  const deleteExpense = async (id) => {
    if (!db) return;
    await db.runAsync("DELETE FROM expenses WHERE id = ?;", [id]);
    fetchExpenses(db);
  };

  return (
    <View style={styles.container}>
      {/* Recurring Expenses Card */}
      <Card style={styles.rExpenses}>
        <Text style={styles.listHeader}>Recurring Expenses</Text>
        <FlatList
          data={expensesList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.listRow}>
                <View style={styles.infoColumn}>
                  <Text style={styles.entryCategory}>{item.category}</Text>
                  <Text style={styles.entryDetails}>
                    ₹ {item.amount}, {item.months_left} months left
                  </Text>
                  <Text style={styles.entryDetails}>
                    Payment Date: {item.paymentDay || "-"}
                  </Text>
                </View>
                <View style={styles.actionColumn}>
                  <Button
                    title="Delete"
                    color="#d63031"
                    onPress={() => deleteExpense(item.id)}
                  />
                </View>
              </View>
            </Card>
          )}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      </Card>
      <View style={styles.stickyFooter}>
        <View style={styles.roundedButton}>
          <Button
            title="Add Expense"
            onPress={() => navigation.navigate("AddExpenseScreen")}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  entryCategory: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#2d3436",
    marginBottom: 2,
  },
  entryDetails: {
    fontSize: 15,
    color: "#636e72",
  },
  rExpenses: { maxHeight: "92%", paddingTop: 8 },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  stickyFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#f7f8fa",
    padding: 8,
    borderTopWidth: 1,
    borderColor: "#dfe6e9",
  },
  infoColumn: {
    flex: 1,
    paddingRight: 8,
    justifyContent: "center",
  },
  actionColumn: {
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 8,
    minWidth: 80,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f7f8fa",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#2d3436",
    textAlign: "center",
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: "#b2bec3",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
    fontSize: 16,
    shadowColor: "#636e72",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  roundedButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
  },
  listHeader: {
    fontSize: 18,
    marginBottom: 12,
    color: "#0984e3",
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  listItem: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#dfe6e9",
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#636e72",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
});
