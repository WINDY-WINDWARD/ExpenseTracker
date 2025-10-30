import React, { useState } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  Switch,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  resetDatabase,
  exportDatabase,
  importDatabase,
} from "../db/updateData";
import { initDB } from "../db/database";
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
  const [db, setDb] = useState(null);

  const initializeDb = async () => {
    try {
      const database = await initDB();
      setDb(database);
    } catch (e) {
      console.error("Failed to initialize DB in SettingsScreen:", e);
      setDb(null);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      initializeDb();
    }, [])
  );

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

      setImporting(true);
      // Ensure DB is initialized and available
      let database = db;
      console.log("Current DB state before import:", database);
      if (!database) {
        try {
          database = await initDB();
          setDb(database);
        } catch (initErr) {
          setImporting(false);
          console.error("Failed to initialize DB before import:", initErr);
          Alert.alert(
            "DB Error",
            "Could not initialize database before import."
          );
          return;
        }
      }

      try {
        console.log("Reading picked file at", uri);
        const preview = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        // compare file version with app version in metadata table if available
        let appVersion = null;
        try {
          const metadata = await database.getAllAsync(
            "SELECT * FROM metadata;"
          );
          appVersion = metadata.find((m) => m.key === "version")?.value;
          console.log("App version from metadata table:", appVersion);
        } catch (metaErr) {
          // metadata table may not exist; continue without blocking import
          console.warn("Could not read metadata table (continuing):", metaErr);
          appVersion = null;
        }

        const parsed = preview ? JSON.parse(preview) : null;
        const fileVersion =
          parsed?.metadata?.find((m) => m.key === "version")?.value ?? null;
        console.log("File version from imported data:", fileVersion);

        // If the app has a recorded version but the imported file does not declare a
        // version, treat this as a mismatch and block the import. Also block when
        // both versions are present but different.
        if (
          appVersion != null &&
          (fileVersion == null || fileVersion !== appVersion)
        ) {
          setImporting(false);
          Alert.alert(
            "Version Mismatch",
            fileVersion == null
              ? `Imported file is missing version metadata; app version is ${appVersion}. Import aborted.`
              : `File version ${fileVersion} does not match app version ${appVersion}.`
          );
          return;
        }
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
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Database</Text>
          <Text style={styles.smallText}>
            Reset the local database. This will permanently remove all saved
            data.
          </Text>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleResetDb}
            accessibilityLabel="Clear or reset database"
          >
            <Text style={styles.buttonText}>Clear / Reset Database</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.button}
            onPress={async () => {
              try {
                const uri = await exportDatabase();
                Alert.alert("Export Complete", `Data exported to:\n${uri}`);
              } catch (err) {
                Alert.alert("Export Failed", "Could not export data.");
              }
            }}
          >
            <Text style={styles.buttonText}>Export All Data (JSON)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Import</Text>
          <Text style={styles.smallText}>
            Choose a JSON file exported from the app to import data. Toggle the
            switch below to allow updates to existing records when IDs match.
          </Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Update existing records</Text>
            <Switch value={updateExisting} onValueChange={setUpdateExisting} />
          </View>

          <View style={styles.importRow}>
            {importing ? (
              <ActivityIndicator size="small" />
            ) : (
              <TouchableOpacity style={styles.button} onPress={handleImport}>
                <Text style={styles.buttonText}>Import Data (JSON)</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Development</Text>
          <Text style={styles.smallText}>
            Load test data for development and manual testing.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate("LoadTestDataScreen")}
          >
            <Text style={styles.buttonText}>Inject Test Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f6f7fb",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    alignItems: "stretch",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    color: "#0f172a",
    alignSelf: "center",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    color: "#0f172a",
  },
  smallText: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 12,
    lineHeight: 18,
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  dangerButton: {
    backgroundColor: "#ef4444",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#eef2f7",
    marginVertical: 12,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  switchLabel: {
    fontSize: 14,
    color: "#0f172a",
  },
  importRow: {
    marginTop: 6,
    alignItems: "flex-start",
  },
});

export default SettingsScreen;
