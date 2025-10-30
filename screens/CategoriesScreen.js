import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { initDB, getDb, getCategories, addCategory, deleteCategory } from '../db/database';

export default function CategoriesScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [newName, setNewName] = useState('');
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        await initDB();
        setDbReady(true);
        await refresh();
      } catch (e) {
        console.error('Failed to init DB in CategoriesScreen', e);
      }
    };
    load();
  }, []);

  const refresh = async () => {
    try {
      const rows = await getCategories();
      setCategories(rows || []);
    } catch (e) {
      console.error('Failed to load categories', e);
    }
  };

  const handleAdd = async () => {
    const name = (newName || '').trim();
    if (!name) {
      Alert.alert('Validation', 'Please enter a category name');
      return;
    }
    try {
      await addCategory(name);
      setNewName('');
      await refresh();
    } catch (e) {
      console.error('Failed to add category', e);
      Alert.alert('Error', 'Could not add category');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <Text style={styles.rowText}>{item.name}</Text>
      <TouchableOpacity
        accessibilityLabel={`Delete category ${item.name}`}
        style={styles.deleteButton}
        onPress={() => {
          Alert.alert(
            'Delete Category',
            `Delete category "${item.name}"? This will not remove any spends or expenses that already reference this name.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await deleteCategory(item.id);
                    await refresh();
                  } catch (e) {
                    console.error('Failed to delete category', e);
                    Alert.alert('Error', 'Could not delete category');
                  }
                },
              },
            ]
          );
        }}
      >
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Manage Categories</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Add Category</Text>
          <TextInput
            placeholder="New category name"
            value={newName}
            onChangeText={setNewName}
            style={styles.input}
            placeholderTextColor="#666"
          />
          <TouchableOpacity style={styles.button} onPress={handleAdd}>
            <Text style={styles.buttonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Existing Categories</Text>
          <FlatList
            data={categories}
            keyExtractor={(i) => String(i.id)}
            renderItem={renderItem}
            ListEmptyComponent={<Text style={styles.smallText}>No categories found.</Text>}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f7fb' },
  container: { padding: 20 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowText: { fontSize: 16 },
  smallText: { color: '#6b7280' },
  deleteButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteText: {
    color: '#ef4444',
    fontWeight: '600',
  },
});
