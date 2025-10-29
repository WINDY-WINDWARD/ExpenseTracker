import * as SQLite from 'expo-sqlite';

let db;

export const initDB = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('expenseTracker.db');
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS income (id INTEGER PRIMARY KEY NOT NULL, source TEXT, amount REAL, date TEXT);
    `);
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY NOT NULL, category TEXT, amount REAL, paymentDate TEXT, months_left INTEGER);
    `);
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS daily_spends (id INTEGER PRIMARY KEY NOT NULL, category TEXT, note TEXT, amount REAL, date TEXT);
    `);
  }
  return db;
};

export const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initDB first.');
  }
  return db;
}