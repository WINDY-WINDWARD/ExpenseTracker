import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { initDB } from "../db/database";

export default function IncomeScreen() {
  // Delete income handler
  const deleteIncome = async (id) => {
    if (!db) return;
    await db.runAsync('DELETE FROM income WHERE id = ?;', [id]);
    fetchIncome(db);
  };
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date());
  const [incomeList, setIncomeList] = useState([]);
  const [db, setDb] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const loadDb = async () => {
      const database = await initDB();
      setDb(database);
      fetchIncome(database);
    };
    loadDb();
  }, []);

  const fetchIncome = async (database) => {
    const result = await (database || db).getAllAsync("SELECT * FROM income;");
    setIncomeList(result);
  };

  const addIncome = async () => {
    if (!source || !amount || isNaN(parseFloat(amount))) {
      Alert.alert(
        "Validation Error",
        "Please enter valid source and numeric amount."
      );
      return;
    }

    const formattedDate = date.toISOString().split("T")[0];

    await db.runAsync(
      "INSERT INTO income (source, amount, date) VALUES (?, ?, ?);",
      [source, parseFloat(amount), formattedDate]
    );

    setSource("");
    setAmount("");
    setDate(new Date());
    fetchIncome(db);
  };

  const onChangeDate = (event, selectedDate) => {
    if (event.type === "set" && selectedDate) {
      setDate(selectedDate);
    }
    setShowDatePicker(false);
  } 

  return (
    <View style={styles.container}>
      {/* Add Income Card */}
      <View style={styles.card}>
        <Text style={styles.header}>Add Income</Text>

        <TextInput
          placeholder="Source"
          value={source}
          onChangeText={setSource}
          style={styles.input}
        />
        <TextInput
          placeholder="Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          style={styles.input}
        />

        <Text style={styles.label}>Date</Text>
        <View style={styles.roundedButton}>
          <Button
            title={`Select Date (${date.toLocaleDateString()})`}
            onPress={() => setShowDatePicker(true)}
          />
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "calendar"}
            onChange={onChangeDate}
          />
        )}

        <View style={[styles.roundedButton, { marginTop: 16 }]}> 
          <Button title="Add Income" onPress={addIncome} />
        </View>
      </View>

      {/* Income History Card */}
      <View style={styles.card}>
        <Text style={styles.listHeader}>Income History</Text>
        <FlatList
          data={incomeList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <Text>
                {item.source} - ₹ {item.amount} on {item.date}
              </Text>
              <View style={{ marginLeft: 'auto' }}>
                <Button title="Delete" color="#d63031" onPress={() => deleteIncome(item.id)} />
              </View>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#636e72',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f7f8fa",
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 18,
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
  label: {
    marginBottom: 6,
    fontSize: 16,
    color: "#636e72",
    fontWeight: "500",
  },
  listHeader: {
    fontSize: 20,
    marginTop: 24,
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
  roundedButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});
