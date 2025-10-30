import * as SQLite from "expo-sqlite";

let db;

export const initDB = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync("expenseTracker.db");
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS income (id INTEGER PRIMARY KEY NOT NULL, source TEXT, amount REAL, date TEXT);
    `);
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY NOT NULL, category TEXT, amount REAL, paymentDay INTEGER, months_left INTEGER, lastPaymentUpdate TEXT);
    `);
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS daily_spends (id INTEGER PRIMARY KEY NOT NULL, category TEXT, note TEXT, amount REAL, date TEXT);
    `);
    // versioning table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY NOT NULL, value TEXT);
    `);
    // portfolio table with Balance field
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS portfolio (id INTEGER PRIMARY KEY NOT NULL, name TEXT, balance REAL);
    `);
    // ensure metadata is up to date
    await updateMetadata();
  }
  return db;
};

export async function updateMetadata() {
  const db = getDb();
  const fields = {
    "version": "0.0.1"
  };
  for (const [key, value] of Object.entries(fields)) {
    await db.runAsync(
      `INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?);`,
      [key, value]
    );
  }
}


export const getDb = () => {
  if (!db) {
    throw new Error("Database not initialized. Call initDB first.");
  }
  return db;
};
