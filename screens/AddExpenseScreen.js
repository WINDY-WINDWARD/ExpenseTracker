import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
} from "react-native";
import Card from "../components/Card";
import { useNavigation } from "@react-navigation/native";
import { initDB } from "../db/database";

export default function AddSpendScreen() {
  const [db, setDb] = useState(null);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [monthsLeft, setMonthsLeft] = useState("");
  const [paymentDay, setPaymentDay] = useState("");

  React.useEffect(() => {
    const loadDb = async () => {
      const database = await initDB();
      setDb(database);
    };
    loadDb();
  }, []);

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
    await db.runAsync(
      "INSERT INTO expenses (category, amount, paymentDay, months_left) VALUES (?, ?, ?, ?);",
      [category, parseFloat(amount), paymentDay, parseInt(monthsLeft)]
    );
    setCategory("");
    setAmount("");
    setMonthsLeft("");
    setPaymentDay("");
    fetchExpenses(db);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Card>
        <Text style={styles.header}>Add Recurring Expense</Text>
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
          <Button title="Add Expense" onPress={addExpense} />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f7f8fa",
    justifyContent: "center",
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
