

import React, { useState } from 'react';
import { View, Button, StyleSheet, Alert } from 'react-native';
import { initDB, getDb } from '../db/database';

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max, decimals = 2) {
	return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

const incomeSources = ['Salary', 'Freelance', 'Gift', 'Investment', 'Other'];
const expenseCategories = ['Rent', 'Utilities', 'Groceries', 'Transport', 'Subscription', 'Insurance'];
const spendCategories = ['Food', 'Shopping', 'Entertainment', 'Bills', 'Misc'];
const notes = ['Lunch', 'Coffee', 'Uber', 'Movie', 'Snacks', 'Book', 'App', 'Gift', 'Dinner', 'Taxi'];

function getRandomDate(start, end) {
	const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
	return date.toISOString().split('T')[0];
}

async function injectTestData() {
	await initDB();
	const db = getDb();

	for (let i = 0; i < 10; i++) {
		await db.runAsync(
			'INSERT INTO income (source, amount, date) VALUES (?, ?, ?)',
			[
				incomeSources[getRandomInt(0, incomeSources.length - 1)],
				getRandomFloat(500, 5000),
				getRandomDate(new Date(2025, 0, 1), new Date(2025, 9, 30)),
			]
		);
	}

	for (let i = 0; i < 8; i++) {
		await db.runAsync(
			'INSERT INTO expenses (category, amount, paymentDay, months_left) VALUES (?, ?, ?, ?)',
			[
				expenseCategories[getRandomInt(0, expenseCategories.length - 1)],
				getRandomFloat(50, 1000),
				getRandomInt(1, 31),
				getRandomInt(1, 12),
			]
		);
	}

	for (let i = 0; i < 30; i++) {
		await db.runAsync(
			'INSERT INTO daily_spends (category, note, amount, date) VALUES (?, ?, ?, ?)',
			[
				spendCategories[getRandomInt(0, spendCategories.length - 1)],
				notes[getRandomInt(0, notes.length - 1)],
				getRandomFloat(5, 100),
				getRandomDate(new Date(2025, 9, 1), new Date(2025, 9, 30)),
			]
		);
	}
}

const LoadTestDataScreen = () => {
	const [loading, setLoading] = useState(false);

	const handleInject = async () => {
		setLoading(true);
		try {
			await injectTestData();
			Alert.alert('Success', 'Test data injected!');
		} catch (e) {
			Alert.alert('Error', e.message);
		}
		setLoading(false);
	};

	const handleResetDb = async () => {
		setLoading(true);
		try {
			const db = await initDB();
			await db.execAsync('DROP TABLE IF EXISTS income;');
			await db.execAsync('DROP TABLE IF EXISTS expenses;');
			await db.execAsync('DROP TABLE IF EXISTS daily_spends;');
			await initDB();
			Alert.alert('Success', 'Database reset and tables recreated!');
		} catch (e) {
			Alert.alert('Error', e.message);
		}
		setLoading(false);
	};

	return (
		<View style={styles.container}>
			<Button title={loading ? 'Injecting...' : 'Inject Test Data'} onPress={handleInject} disabled={loading} />
			<View style={{ height: 16 }} />
			<Button title={loading ? 'Resetting...' : 'Reset Database'} onPress={handleResetDb} disabled={loading} color="#d63031" />
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
});

export default LoadTestDataScreen;
