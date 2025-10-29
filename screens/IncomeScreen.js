import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
import Card from "../components/Card";

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
  const [refreshing, setRefreshing] = useState(false);


  useEffect(() => {
    const loadDb = async () => {
      const database = await initDB();
      setDb(database);
      fetchIncome(database);
    };
    loadDb();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (db) {
        fetchIncome(db);
      }
    }, [db])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchIncome(db).finally(() => setRefreshing(false));
  }, [db]);

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
      <Card>
        <Text style={styles.header}>Add Income</Text>

        <TextInput
          placeholder="Source"
          value={source}
          onChangeText={setSource}
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
      </Card>

      {/* Income History Card */}
      <Card style={{maxHeight: '49%', paddingTop: 8}}>
        <Text style={styles.listHeader}>Income History</Text>
        <FlatList
          data={incomeList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <Card style={{marginHorizontal: 4}}>
              <View style={styles.listRow}>
                <View style={styles.infoColumn}>
                  <Text style={styles.entrySource}>{item.source}</Text>
                  <Text style={styles.entryDetails}>₹ {item.amount} on {item.date}</Text>
                </View>
                <View style={styles.actionColumn}>
                  <Button title="Delete" color="#d63031" onPress={() => deleteIncome(item.id)} />
                </View>
              </View>
            </Card>
          )}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  entrySource: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2d3436',
    marginBottom: 2,
  },
  entryDetails: {
    fontSize: 15,
    color: '#636e72',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 2
  },
  infoColumn: {
    flex: 1,
    paddingRight: 8,
    justifyContent: 'center',
  },
  actionColumn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
    minWidth: 80,
  },
  container: {
    flex: 1,
    padding: 8,
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
    marginTop: 4,
    marginBottom: 4,
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
