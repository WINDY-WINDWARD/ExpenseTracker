import React, { useState } from "react";
import {
  View,
  Text,
  Button,
  Alert,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  resetDatabase,
  exportDatabase,
  importDatabase,
} from "../db/updateData";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

const SettingsScreen = () => {
  const navigation = useNavigation();
  const handleResetDb = async () => {
    Alert.alert(
      "Warning",
      "This will permanently delete all data. Are you sure you want to continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await resetDatabase();
              Alert.alert("Database Reset", "All data has been cleared.");
            } catch (error) {
              Alert.alert("Error", "Failed to reset database.");
            }
          },
        },
      ]
    );
  };

  const [updateExisting, setUpdateExisting] = useState(true);
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/json",
      });
      console.log("DocumentPicker result:", res);

      const uri = res?.assets?.[0]?.uri;
      const canceled = res?.canceled === true;
      if (canceled || !uri) {
        console.log("DocumentPicker: no file selected or missing uri", {
          canceled,
          uri,
        });
        return; // user cancelled or unexpected response
      }
      // Try to read the file first so we can surface any read errors immediately
      setImporting(true);
      try {
        console.log("Reading picked file at", uri);
        const preview = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        // Show a small preview so user knows the file was read
        const short = preview.slice(0, 200);
        console.log("File preview:", short);
        // Optional: show a quick alert that file read succeeded (keeps UX quick)
        // Alert.alert('File Read', `Preview:\n${short}`);
      } catch (readErr) {
        setImporting(false);
        console.error("Failed to read picked file:", readErr);
        Alert.alert(
          "Read Failed",
          `Could not read the selected file.\n${readErr.message || readErr}`
        );
        return;
      }

      // Pass updateExisting option to importDatabase which will update rows when ids match
      try {
        console.log("Calling importDatabase with", uri, { updateExisting });
        const result = await importDatabase(uri, {
          updateExisting: updateExisting,
        });
        setImporting(false);
        Alert.alert(
          "Import Complete",
          `Imported: income=${result.imported.income}, expenses=${result.imported.expenses}, daily_spends=${result.imported.daily_spends}, updated=${result.imported.updated}`
        );
      } catch (impErr) {
        setImporting(false);
        console.error("Import failed in importDatabase:", impErr);
        Alert.alert(
          "Import Failed",
          `Import operation failed:\n${impErr.message || impErr}`
        );
      }
    } catch (err) {
      setImporting(false);
      console.error("Import failed", err);
      Alert.alert(
        "Import Failed",
        "Could not import data. See console for details."
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Button
        title="Clear/Reset Database"
        color="#FF3B30"
        onPress={handleResetDb}
      />
      <View style={{ marginTop: 16 }}>
        <Button
          title="Export All Data (JSON)"
          onPress={async () => {
            try {
              const uri = await exportDatabase();
              Alert.alert("Export Complete", `Data exported to:\n${uri}`);
            } catch (err) {
              Alert.alert("Export Failed", "Could not export data.");
            }
          }}
        />
      </View>
      <View style={{ marginTop: 20, alignItems: "center" }}>
        <Text style={{ marginBottom: 8 }}>
          Update existing records on import
        </Text>
        <Switch value={updateExisting} onValueChange={setUpdateExisting} />
      </View>

      <View style={{ marginTop: 16 }}>
        {importing ? (
          <ActivityIndicator size="small" />
        ) : (
          <Button title="Import Data (JSON)" onPress={handleImport} />
        )}
      </View>
      <View style={{ marginTop: 20 }}>
        <Button
          title="Inject Test Data"
          onPress={() => navigation.navigate("LoadTestDataScreen")}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
  },
});

export default SettingsScreen;
