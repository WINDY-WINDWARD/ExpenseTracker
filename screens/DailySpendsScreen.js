import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  FlatList,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { initDB } from "../db/database";
import Card from "../components/Card";

export default function DailySpendsScreen() {
  const [spendsList, setSpendsList] = useState([]);
  const [db, setDb] = useState(null);
  const navigation = require("@react-navigation/native").useNavigation();
  const [showFilter, setShowFilter] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Delete spend handler
  const deleteSpend = async (id) => {
    if (!db) return;
    await db.runAsync("DELETE FROM daily_spends WHERE id = ?;", [id]);
    fetchSpends(db);
  };

  useEffect(() => {
    const loadDb = async () => {
      const database = await initDB();
      setDb(database);
      fetchSpends(database);
    };
    loadDb();
  }, []);

  // By default, load last 7 days
  const fetchSpends = async (database, filterStart, filterEnd) => {
    let query = "SELECT * FROM daily_spends ";
    let params = [];
    if (filterStart && filterEnd) {
      query += "WHERE date BETWEEN ? AND ? ";
      params = [filterStart, filterEnd];
    } else {
      // Default: last 7 days
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);
      const format = (d) => d.toISOString().slice(0, 10);
      query += "WHERE date BETWEEN ? AND ? ";
      params = [format(sevenDaysAgo), format(today)];
    }
    query += "ORDER BY date DESC;";
    const result = await (database || db).getAllAsync(query, params);
    setSpendsList(result);
  };

  // Group spends by date
  const groupedSpends = spendsList.reduce((groups, item) => {
    if (!groups[item.date]) groups[item.date] = [];
    groups[item.date].push(item);
    return groups;
  }, {});

  // Filter button handler
  const handleFilter = () => {
    if (startDate && endDate) {
      fetchSpends(db, startDate, endDate);
      setShowFilter(false);
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.cardMaxHeight}>
        <Text style={styles.listHeader}>Spending History</Text>
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
                  {startDate ? `Start: ${startDate}` : "Select Start Date"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={styles.datePickerText}>
                  {endDate ? `End: ${endDate}` : "Select End Date"}
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
                onPress={() => {
                  setStartDate(null);
                  setEndDate(null);
                  fetchSpends(db);
                  setShowFilter(false);
                }}
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
                    setStartDate(selectedDate.toISOString().slice(0, 10));
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
                    setEndDate(selectedDate.toISOString().slice(0, 10));
                  }
                }}
              />
            )}
          </View>
        )}
        <FlatList
          data={Object.keys(groupedSpends)}
          keyExtractor={(date) => date}
          renderItem={({ item: date }) => (
            <View style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{date}</Text>
              {groupedSpends[date].map((spend) => (
                <Card key={spend.id}>
                  <View style={styles.listRow}>
                    <View style={styles.infoColumn}>
                      <Text style={styles.entryCategory}>{spend.category}</Text>
                      <Text style={styles.entryDetails}>
                        ₹ {spend.amount} {spend.note ? `(${spend.note})` : ""}
                      </Text>
                    </View>
                    <View style={styles.actionColumn}>
                      <Button
                        title="Delete"
                        color="#d63031"
                        onPress={() => deleteSpend(spend.id)}
                      />
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        />
      </Card>
      <View style={styles.stickyFooter}>
        <View style={styles.roundedButton}>
          <Button
            title="Add Spend"
            onPress={() => navigation.navigate("AddSpendScreen")}
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
  cardMaxHeight: {
    maxHeight: '91%',
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
  entryDetails: {
    fontSize: 15,
    color: "#636e72",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 2,
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
  inputLabel: {
    marginBottom: 6,
    fontSize: 16,
    color: "#636e72",
    fontWeight: "500",
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
  dateGroup: {
    marginBottom: 16,
    backgroundColor: "#f1f2f6",
    borderRadius: 10,
    padding: 10,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  filterButton: {
    backgroundColor: "#0984e3",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  filterButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  filterPanel: {
    backgroundColor: "#dfe6e9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  datePickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  datePickerButton: {
    backgroundColor: "#b2bec3",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginHorizontal: 4,
  },
  datePickerText: {
    color: "#2d3436",
    fontSize: 15,
  },
  filterActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  dateHeader: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 6,
    color: "#636e72",
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
  spendText: {
    fontSize: 15,
    color: "#2d3436",
  },
});
