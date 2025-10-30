import React, { useState, useEffect } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
} from "react-native";
import Card from "../components/Card";
import { initDB } from "../db/database";

export default function AddSpendScreen({ navigation, route }) {
  const [db, setDb] = useState(null);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [monthsLeft, setMonthsLeft] = useState("");
  const [paymentDay, setPaymentDay] = useState("");
  const [isEdit, setIsEdit] = useState(false);
  const [editingId, setEditingId] = useState(null);

  React.useEffect(() => {
    const loadDb = async () => {
      const database = await initDB();
      setDb(database);
    };
    loadDb();
  }, []);

  // Pre-populate when navigated with params
  useEffect(() => {
    const expense = route?.params?.expense;
    if (expense) {
      setCategory(expense.category?.toString() || "");
      setAmount(expense.amount?.toString() || "");
      setPaymentDay(expense.paymentDay?.toString() || "");
      setMonthsLeft(expense.months_left?.toString() || expense.monthsLeft?.toString() || "");
      setIsEdit(true);
      setEditingId(expense.id);
    } else {
      // reset if no params
      setIsEdit(false);
      setEditingId(null);
    }
  }, [route]);

  const addExpense = async () => {
    if (
      !category ||
      !amount ||
      !monthsLeft ||
      !paymentDay ||
      isNaN(parseFloat(amount)) ||
      isNaN(parseInt(monthsLeft))
    ) {
      Alert.alert(
        "Validation Error",
        "Please enter valid category, amount, months left, and payment date."
      );
      return;
    }
    if (!db) {
      Alert.alert("Database not ready", "Please try again in a moment.");
      return;
    }

    if (isEdit && editingId != null) {
      // Update existing expense
      await db.runAsync(
        "UPDATE expenses SET category = ?, amount = ?, paymentDay = ?, months_left = ? WHERE id = ?;",
        [category, parseFloat(amount), paymentDay, parseInt(monthsLeft), editingId]
      );
    } else {
      // Insert new expense
      await db.runAsync(
        "INSERT INTO expenses (category, amount, paymentDay, months_left) VALUES (?, ?, ?, ?);",
        [category, parseFloat(amount), paymentDay, parseInt(monthsLeft)]
      );
    }

    // clear and go back; ExpensesScreen uses focus to reload
    setCategory("");
    setAmount("");
    setMonthsLeft("");
    setPaymentDay("");
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      enabled
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Card>
            <Text style={styles.header}>{isEdit ? "Edit Recurring Expense" : "Add Recurring Expense"}</Text>
        <TextInput
          placeholder="Category"
          value={category}
          onChangeText={setCategory}
          style={styles.input}
          placeholderTextColor="rgba(7, 8, 8, 1)"
        />
        <TextInput
          placeholder="Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          style={styles.input}
          placeholderTextColor="rgba(7, 8, 8, 1)"
        />
        <TextInput
          placeholder="Payment Day (DD)"
          value={paymentDay}
          onChangeText={setPaymentDay}
          style={styles.input}
          placeholderTextColor="rgba(7, 8, 8, 1)"
        />
        <TextInput
          placeholder="Months Left"
          value={monthsLeft}
          onChangeText={setMonthsLeft}
          keyboardType="numeric"
          style={styles.input}
          placeholderTextColor="rgba(7, 8, 8, 1)"
        />
            <View style={styles.roundedButton}>
              <Button title={isEdit ? "Update Expense" : "Add Expense"} onPress={addExpense} />
            </View>
          </Card>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f7f8fa",
    justifyContent: "center",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 16,
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
  inputLabel: {
    marginBottom: 6,
    fontSize: 16,
    color: "#636e72",
    fontWeight: "500",
  },
});
