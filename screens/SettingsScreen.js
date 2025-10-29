import React from 'react';
import { View, Text, Button, Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { resetDatabase } from '../db/updateData';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const handleResetDb = async () => {
    Alert.alert(
      'Warning',
      'This will permanently delete all data. Are you sure you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetDatabase();
              Alert.alert('Database Reset', 'All data has been cleared.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset database.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Button title="Clear/Reset Database" color="#FF3B30" onPress={handleResetDb} />
      <View style={{ marginTop: 20 }}>
        <Button title="Inject Test Data" onPress={() => navigation.navigate('LoadTestDataScreen')} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
});

export default SettingsScreen;
