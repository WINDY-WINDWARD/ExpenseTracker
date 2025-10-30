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
    // categories table to hold user-defined categories
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY NOT NULL, name TEXT UNIQUE NOT NULL);
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
    // ensure categories table has defaults on first run
    try {
      await ensureDefaultCategories();
    } catch (e) {
      console.warn('ensureDefaultCategories failed during initDB', e);
    }
  }
  return db;
};

// Seed default categories if table is empty
async function ensureDefaultCategories() {
  const db = getDb();
  try {
    const rows = await db.getAllAsync(`SELECT COUNT(*) as count FROM categories;`);
    const count = rows?.[0]?.count || 0;
    if (count === 0) {
      const defaults = [
        'Groceries',
        'Transport',
        'Dining',
        'Utilities',
        'Entertainment',
        'Health',
        'Other',
      ];
      for (const name of defaults) {
        try {
          await db.runAsync(`INSERT OR IGNORE INTO categories (name) VALUES (?);`, [name]);
        } catch (e) {
          console.warn('Failed to insert default category', name, e);
        }
      }
    }
  } catch (e) {
    console.warn('Failed to ensure default categories', e);
  }
}

// Exposed helpers for categories
export const getCategories = async () => {
  const db = getDb();
  try {
    const rows = await db.getAllAsync(`SELECT * FROM categories ORDER BY name ASC;`);
    return rows || [];
  } catch (e) {
    console.error('getCategories error', e);
    return [];
  }
};

export const addCategory = async (name) => {
  const db = getDb();
  try {
    await db.runAsync(`INSERT OR IGNORE INTO categories (name) VALUES (?);`, [name]);
    // return the inserted or existing row
    const rows = await db.getAllAsync(`SELECT * FROM categories WHERE name = ?;`, [name]);
    return rows?.[0] || null;
  } catch (e) {
    console.error('addCategory error', e);
    throw e;
  }
};

export const deleteCategory = async (id) => {
  const db = getDb();
  try {
    await db.runAsync(`DELETE FROM categories WHERE id = ?;`, [id]);
    return true;
  } catch (e) {
    console.error('deleteCategory error', e);
    throw e;
  }
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
